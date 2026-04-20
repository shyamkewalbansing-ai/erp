import { useState, useEffect, useRef } from 'react';
import { Building2, ArrowLeft, Delete } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

export default function KioskPinEntry({ companyId, companyName, onSuccess, onBack, onEmployeeLogin }) {
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
    // First: try company kiosk PIN
    try {
      const response = await axios.post(`${API}/public/${companyId}/verify-pin`, { pin: pinCode });
      sessionStorage.setItem(`kiosk_pin_verified_${companyId}`, 'true');
      if (response.data.token) localStorage.setItem('kiosk_token', response.data.token);
      // Treat company-PIN login as a Beheerder-level session so payments are auto-approved
      if (onEmployeeLogin) {
        onEmployeeLogin({
          name: response.data.company_name || 'Beheerder',
          role: 'beheerder',
          employee_id: null,
          via: 'company_pin',
        });
      }
      setLoading(false);
      onSuccess({ isEmployee: false, role: 'beheerder' });
      return;
    } catch { /* fall through to employee PIN */ }

    // Second: try employee PIN
    try {
      const r = await axios.post(`${API}/public/${companyId}/employee/login`, { pin: pinCode });
      sessionStorage.setItem(`kiosk_pin_verified_${companyId}`, 'true');
      if (onEmployeeLogin) onEmployeeLogin(r.data);
      setLoading(false);
      onSuccess({ isEmployee: true, role: r.data.role });
    } catch {
      setError('Ongeldige PIN. Probeer opnieuw.');
      setPin(['', '', '', '']);
      inputRefs[0].current?.focus();
      setLoading(false);
    }
  };

  return (
    <div className="h-full bg-orange-500 flex flex-col px-3 sm:px-6 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between py-2 sm:py-3">
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-1.5 text-white font-bold transition hover:opacity-90 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5 sm:px-4 sm:py-2" data-testid="pin-back-btn">
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs sm:text-sm">Terug</span>
          </button>
        )}
        <div className="flex items-center gap-2 text-white">
          <Building2 className="w-5 h-5" />
          <span className="text-sm sm:text-base font-semibold">{companyName || 'Kiosk'}</span>
        </div>
        <div className="w-16" />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center min-h-0 pb-4">
        <div className="kiosk-card flex flex-col items-center w-full max-w-sm sm:max-w-md p-5 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-1">Voer PIN in</h2>
          <p className="text-sm text-slate-400 mb-5">4-cijferige toegangscode (bedrijf of medewerker)</p>

          {/* PIN dots */}
          <div className="flex justify-center gap-3 sm:gap-4 mb-4">
            {pin.map((digit, index) => (
              <div key={index}
                className={`text-center font-bold rounded-xl border-2 transition-all w-12 h-14 sm:w-16 sm:h-16 text-xl sm:text-2xl flex items-center justify-center ${
                  error ? 'border-red-400 bg-red-50' : digit ? 'border-orange-500 bg-orange-50' : 'border-slate-200 bg-slate-50'
                }`}
                data-testid={`pin-input-${index}`}>
                {digit ? '●' : ''}
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-red-500 text-center font-semibold mb-3">{error}</p>}

          {/* Keypad */}
          <div className="grid grid-cols-3 w-full gap-1.5 sm:gap-2">
            {['1','2','3','4','5','6','7','8','9','_e','0','DEL'].map((key) => (
              key === '_e' ? <div key={key} /> : (
                <button key={key} onClick={() => handleKeypadPress(key)} disabled={loading}
                  data-testid={`keypad-${key}`}
                  className={`font-bold rounded-xl transition active:scale-95 disabled:opacity-50 flex items-center justify-center h-12 sm:h-14 text-lg sm:text-xl ${
                    key === 'DEL' ? 'bg-slate-100 text-red-500 hover:bg-red-50'
                    : 'bg-slate-50 text-slate-900 hover:bg-orange-50 hover:text-orange-600 border border-slate-100'
                  }`}>
                  {key === 'DEL' ? <Delete className="w-5 h-5" /> : key}
                </button>
              )
            ))}
          </div>

          {loading && <p className="text-xs text-slate-400 animate-pulse mt-4">Verifi&euml;ren...</p>}
        </div>
      </div>
    </div>
  );
}
