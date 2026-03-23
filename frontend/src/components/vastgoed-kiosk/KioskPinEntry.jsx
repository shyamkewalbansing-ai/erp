import { useState, useEffect, useRef } from 'react';
import { Lock, ArrowLeft, Delete } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

export default function KioskPinEntry({ companyId, companyName, onSuccess, onBack }) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRefs = [useRef(), useRef(), useRef(), useRef()];

  useEffect(() => {
    // Focus first input on mount
    inputRefs[0].current?.focus();
  }, []);

  const handlePinChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError('');

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    // Auto-submit when all 4 digits entered
    if (value && index === 3 && newPin.every(d => d !== '')) {
      verifyPin(newPin.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleKeypadPress = (value) => {
    if (value === 'DEL') {
      // Find last filled position and clear it
      for (let i = 3; i >= 0; i--) {
        if (pin[i]) {
          const newPin = [...pin];
          newPin[i] = '';
          setPin(newPin);
          inputRefs[i].current?.focus();
          break;
        }
      }
    } else {
      // Find first empty position and fill it
      for (let i = 0; i < 4; i++) {
        if (!pin[i]) {
          handlePinChange(i, value);
          break;
        }
      }
    }
  };

  const verifyPin = async (pinCode) => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(`${API}/public/${companyId}/verify-pin`, { pin: pinCode });
      // Store PIN verification in sessionStorage
      sessionStorage.setItem(`kiosk_pin_verified_${companyId}`, 'true');
      // Store the token from PIN verification for admin access
      if (response.data.token) {
        localStorage.setItem('kiosk_token', response.data.token);
      }
      onSuccess();
    } catch (err) {
      setError('Ongeldige PIN. Probeer opnieuw.');
      setPin(['', '', '', '']);
      inputRefs[0].current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toLocaleDateString('nl-NL', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <div className="kiosk-fullscreen flex flex-col lg:flex-row bg-slate-50">
      {/* Left Panel */}
      <div className="w-full lg:w-2/5 bg-gradient-to-br from-slate-800 to-slate-900 p-6 lg:p-12 flex flex-col relative overflow-hidden min-h-[40vh] lg:min-h-0">
        {/* Decorative elements */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-orange-500/10 rounded-full" />
        <div className="absolute -bottom-48 -right-48 w-[500px] h-[500px] bg-orange-500/5 rounded-full" />
        
        {/* Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 lg:gap-4 mb-2">
            <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-xl lg:rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Lock className="w-6 h-6 lg:w-9 lg:h-9 text-white" />
            </div>
            <div>
              <h1 className="text-lg lg:text-2xl font-bold text-white">{companyName || 'Kiosk'}</h1>
              <p className="text-slate-400 text-sm lg:text-lg">{today}</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center relative z-10 py-4 lg:py-0">
          <h2 className="text-3xl lg:text-5xl font-bold text-white mb-4 lg:mb-6 leading-tight">
            Beveiligde<br />Kiosk
          </h2>
          <p className="text-base lg:text-xl text-slate-300 leading-relaxed max-w-md hidden lg:block">
            Voer uw 4-cijferige PIN code in om toegang te krijgen tot de betalingskiosk.
          </p>
        </div>

        {/* Back button */}
        {onBack && (
          <div className="relative z-10">
            <button 
              onClick={onBack}
              className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Terug naar home
            </button>
          </div>
        )}
      </div>

      {/* Right Panel - PIN Entry */}
      <div className="flex-1 bg-white p-6 lg:p-12 flex flex-col justify-center items-center">
        <div className="w-full max-w-md">
          <h3 className="text-2xl lg:text-3xl font-bold text-slate-900 text-center mb-2">
            Voer PIN in
          </h3>
          <p className="text-base lg:text-lg text-slate-500 text-center mb-6 lg:mb-8">
            4-cijferige toegangscode
          </p>

          {/* PIN Input Fields */}
          <div className="flex justify-center gap-2 lg:gap-4 mb-6">
            {pin.map((digit, index) => (
              <input
                key={index}
                ref={inputRefs[index]}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handlePinChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className={`w-14 h-16 lg:w-20 lg:h-24 text-center text-2xl lg:text-4xl font-bold rounded-xl lg:rounded-2xl border-2 lg:border-3 transition-all outline-none ${
                  error 
                    ? 'border-red-500 bg-red-50' 
                    : digit 
                      ? 'border-orange-500 bg-orange-50' 
                      : 'border-slate-200 bg-slate-50 focus:border-orange-500'
                }`}
                disabled={loading}
              />
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-red-500 text-center font-medium mb-6">{error}</p>
          )}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2 lg:gap-3 max-w-xs mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'DEL'].map((key, idx) => (
              key ? (
                <button
                  key={key}
                  onClick={() => handleKeypadPress(key)}
                  disabled={loading}
                  className={`h-12 lg:h-16 text-xl lg:text-2xl font-bold rounded-lg lg:rounded-xl transition active:scale-95 disabled:opacity-50 ${
                    key === 'DEL' 
                      ? 'bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center' 
                      : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  {key === 'DEL' ? <Delete className="w-5 h-5 lg:w-6 lg:h-6" /> : key}
                </button>
              ) : (
                <div key={idx} className="h-12 lg:h-16" />
              )
            ))}
          </div>

          {loading && (
            <p className="text-center text-slate-500 mt-6 animate-pulse">
              PIN verifiëren...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
