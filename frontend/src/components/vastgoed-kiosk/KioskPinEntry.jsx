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
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[55%] h-full bg-gradient-to-l from-orange-700/40 to-transparent rounded-l-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-orange-400/25 rounded-full blur-3xl" />
        <div className="absolute -top-20 -right-20 w-72 h-72 border-[3px] border-white/10 rounded-full" />
        <div className="absolute top-[20%] left-[8%] w-36 h-36 border-[3px] border-white/10 rounded-full" />
        <div className="absolute top-[25%] left-[10%] w-20 h-20 bg-white/5 rounded-full" />
        <div className="absolute bottom-[15%] right-[12%] w-28 h-28 border-[3px] border-white/8 rounded-full" />
        <div className="absolute top-[50%] left-[3%] w-3 h-3 bg-white/15 rounded-full" />
        <div className="absolute top-[35%] right-[20%] w-4 h-4 bg-white/10 rounded-full" />
        <div className="absolute top-0 left-[40%] w-[2px] h-full bg-gradient-to-b from-transparent via-white/5 to-transparent rotate-12 origin-top" />
      </div>

      {onBack && (
        <div className="absolute top-5 left-8 z-20">
          <button onClick={onBack} className="flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/20 text-white px-5 py-2.5 rounded-xl font-bold transition hover:bg-white/30 shadow-lg text-sm">
            <ArrowLeft className="w-5 h-5" /><span>Terug</span>
          </button>
        </div>
      )}

      <div className="relative z-10 bg-white rounded-[2rem] shadow-[0_25px_60px_-12px_rgba(0,0,0,0.25)] p-10 sm:p-12 lg:p-14 w-full max-w-md mx-6 border border-white/50">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">{companyName || 'Kiosk'}</p>
            <p className="text-sm text-slate-400">Beveiligde toegang</p>
          </div>
        </div>

        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">Voer PIN in</h2>
        <p className="text-base text-slate-400 mb-8">4-cijferige toegangscode</p>

        <div className="flex justify-center gap-4 mb-6">
          {pin.map((digit, index) => (
            <input key={index} ref={inputRefs[index]} type="password" inputMode="numeric" maxLength={1}
              value={digit} onChange={(e) => handlePinChange(index, e.target.value)} onKeyDown={(e) => handleKeyDown(index, e)}
              className={`w-16 h-20 sm:w-20 sm:h-24 text-center text-3xl font-bold rounded-2xl border-2 transition-all outline-none ${
                error ? 'border-red-400 bg-red-50' : digit ? 'border-orange-500 bg-orange-50' : 'border-slate-200 bg-slate-50 focus:border-orange-500'
              }`} disabled={loading} />
          ))}
        </div>

        {error && <p className="text-red-500 text-center font-semibold mb-4">{error}</p>}

        <div className="grid grid-cols-3 gap-3">
          {['1','2','3','4','5','6','7','8','9','_e','0','DEL'].map((key) => (
            key === '_e' ? <div key={key} /> : (
              <button key={key} onClick={() => handleKeypadPress(key)} disabled={loading}
                className={`h-16 sm:h-18 text-2xl font-bold rounded-2xl transition active:scale-95 disabled:opacity-50 ${
                  key === 'DEL' ? 'bg-slate-100 text-red-500 hover:bg-red-50 flex items-center justify-center'
                  : 'bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900 hover:from-orange-50 hover:to-orange-100 hover:text-orange-600 border border-slate-100'
                }`}>
                {key === 'DEL' ? <Delete className="w-6 h-6" /> : key}
              </button>
            )
          ))}
        </div>

        {loading && <p className="text-center text-slate-400 mt-6 animate-pulse">Verifi&euml;ren...</p>}
      </div>
    </div>
  );
}
