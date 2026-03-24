import { useState, useEffect, useRef } from 'react';
import { Building2, ArrowLeft, Delete } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

export default function KioskPinEntry({ companyId, companyName, onSuccess, onBack }) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRefs = [useRef(), useRef(), useRef(), useRef()];

  useEffect(() => { inputRefs[0].current?.focus(); }, []);

  const handlePinChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError('');
    if (value && index < 3) inputRefs[index + 1].current?.focus();
    if (value && index === 3 && newPin.every(d => d !== '')) verifyPin(newPin.join(''));
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) inputRefs[index - 1].current?.focus();
  };

  const handleKeypadPress = (value) => {
    if (value === 'DEL') {
      for (let i = 3; i >= 0; i--) {
        if (pin[i]) { const newPin = [...pin]; newPin[i] = ''; setPin(newPin); inputRefs[i].current?.focus(); break; }
      }
    } else {
      for (let i = 0; i < 4; i++) { if (!pin[i]) { handlePinChange(i, value); break; } }
    }
  };

  const verifyPin = async (pinCode) => {
    setLoading(true); setError('');
    try {
      const response = await axios.post(`${API}/public/${companyId}/verify-pin`, { pin: pinCode });
      sessionStorage.setItem(`kiosk_pin_verified_${companyId}`, 'true');
      if (response.data.token) localStorage.setItem('kiosk_token', response.data.token);
      onSuccess();
    } catch {
      setError('Ongeldige PIN. Probeer opnieuw.');
      setPin(['', '', '', '']);
      inputRefs[0].current?.focus();
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute top-0 right-0 w-[50%] h-full bg-orange-600/30 rounded-l-[80px] pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-orange-400/20 rounded-full pointer-events-none" />

      {/* Back button */}
      {onBack && (
        <div className="absolute top-5 left-6 z-20">
          <button onClick={onBack} className="flex items-center gap-2 text-white/80 hover:text-white transition text-sm font-medium">
            <ArrowLeft className="w-5 h-5" />
            <span>Terug</span>
          </button>
        </div>
      )}

      {/* Main card */}
      <div className="relative z-10 bg-white rounded-3xl shadow-2xl p-8 sm:p-10 w-full max-w-sm mx-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center shadow-md shadow-orange-500/30">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900">{companyName || 'Kiosk'}</p>
            <p className="text-xs text-slate-400">Beveiligde toegang</p>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-slate-900 mb-1">Voer PIN in</h2>
        <p className="text-sm text-slate-400 mb-6">4-cijferige toegangscode</p>

        {/* PIN inputs */}
        <div className="flex justify-center gap-3 mb-4">
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
              className={`w-14 h-16 text-center text-2xl font-bold rounded-2xl border-2 transition-all outline-none ${
                error ? 'border-red-400 bg-red-50' 
                  : digit ? 'border-orange-500 bg-orange-50' 
                  : 'border-slate-200 bg-slate-50 focus:border-orange-500'
              }`}
              disabled={loading}
            />
          ))}
        </div>

        {error && <p className="text-red-500 text-center font-medium mb-3 text-sm">{error}</p>}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2">
          {['1','2','3','4','5','6','7','8','9','_e','0','DEL'].map((key) => (
            key === '_e' ? <div key={key} /> : (
              <button
                key={key}
                onClick={() => handleKeypadPress(key)}
                disabled={loading}
                className={`h-14 text-xl font-bold rounded-xl transition active:scale-95 disabled:opacity-50 ${
                  key === 'DEL' ? 'bg-slate-100 text-red-500 hover:bg-red-50 flex items-center justify-center' 
                  : 'bg-slate-50 text-slate-900 hover:bg-orange-50 hover:text-orange-600'
                }`}
              >
                {key === 'DEL' ? <Delete className="w-5 h-5" /> : key}
              </button>
            )
          ))}
        </div>

        {loading && <p className="text-center text-slate-400 mt-4 animate-pulse text-sm">Verifi&euml;ren...</p>}
      </div>
    </div>
  );
}
