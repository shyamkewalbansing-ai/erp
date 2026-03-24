import { useState, useEffect, useRef } from 'react';
import { Building2, ArrowLeft, Delete } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

export default function KioskPinEntry({ companyId, companyName, onSuccess, onBack }) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRefs = [useRef(), useRef(), useRef(), useRef()];

  useEffect(() => {
    inputRefs[0].current?.focus();
  }, []);

  const handlePinChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError('');
    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
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
      sessionStorage.setItem(`kiosk_pin_verified_${companyId}`, 'true');
      if (response.data.token) {
        localStorage.setItem('kiosk_token', response.data.token);
      }
      onSuccess();
    } catch {
      setError('Ongeldige PIN. Probeer opnieuw.');
      setPin(['', '', '', '']);
      inputRefs[0].current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-white flex flex-col">
      {/* Top bar */}
      <div className="w-full px-6 py-4 flex items-center justify-between border-b border-slate-100">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition text-sm font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Terug</span>
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center shadow-md shadow-orange-500/20">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-900">{companyName || 'Kiosk'}</span>
        </div>
        <div className="w-16" />
      </div>

      {/* Centered PIN content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-20 h-20 rounded-2xl bg-orange-50 flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-1">
          Voer PIN in
        </h1>
        <p className="text-base text-slate-400 text-center mb-8">
          4-cijferige toegangscode
        </p>

        {/* PIN dots */}
        <div className="flex justify-center gap-3 sm:gap-4 mb-6">
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
              className={`w-14 h-16 sm:w-16 sm:h-20 text-center text-2xl sm:text-3xl font-bold rounded-2xl border-2 transition-all outline-none ${
                error 
                  ? 'border-red-400 bg-red-50' 
                  : digit 
                    ? 'border-orange-500 bg-orange-50' 
                    : 'border-slate-200 bg-slate-50 focus:border-orange-500'
              }`}
              disabled={loading}
            />
          ))}
        </div>

        {error && (
          <p className="text-red-500 text-center font-medium mb-4 text-sm">{error}</p>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '_empty', '0', 'DEL'].map((key) => (
            key === '_empty' ? (
              <div key={key} className="aspect-square" />
            ) : (
              <button
                key={key}
                onClick={() => handleKeypadPress(key)}
                disabled={loading}
                className={`aspect-square text-xl sm:text-2xl font-bold rounded-xl transition active:scale-95 disabled:opacity-50 ${
                  key === 'DEL' 
                    ? 'bg-slate-100 text-red-500 hover:bg-red-50 flex items-center justify-center' 
                    : 'bg-slate-50 text-slate-900 hover:bg-orange-50 hover:text-orange-600 border border-slate-100'
                }`}
              >
                {key === 'DEL' ? <Delete className="w-5 h-5 sm:w-6 sm:h-6" /> : key}
              </button>
            )
          ))}
        </div>

        {loading && (
          <p className="text-center text-slate-400 mt-6 animate-pulse text-sm">
            PIN verifi&euml;ren...
          </p>
        )}
      </div>
    </div>
  );
}
