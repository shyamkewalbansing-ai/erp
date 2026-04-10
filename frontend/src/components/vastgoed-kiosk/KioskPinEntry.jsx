import { useState, useEffect, useRef } from 'react';
import { Building2, ArrowLeft, Delete, ScanFace, KeyRound } from 'lucide-react';
import axios from 'axios';
import FaceCapture from './FaceCapture';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

export default function KioskPinEntry({ companyId, companyName, onSuccess, onBack }) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('pin'); // pin | face
  const [faceEnabled, setFaceEnabled] = useState(false);
  const inputRefs = [useRef(), useRef(), useRef(), useRef()];

  useEffect(() => { inputRefs[0].current?.focus(); }, []);

  useEffect(() => {
    axios.get(`${API}/public/${companyId}/face/admin-status`).then(res => setFaceEnabled(res.data.enabled)).catch(() => {});
  }, [companyId]);

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

  const handleFaceCapture = async (descriptor) => {
    // Must throw on failure so FaceCapture keeps scanning
    const res = await axios.post(`${API}/public/${companyId}/face/verify-admin`, { descriptor });
    sessionStorage.setItem(`kiosk_pin_verified_${companyId}`, 'true');
    if (res.data.token) localStorage.setItem('kiosk_token', res.data.token);
    setTimeout(() => onSuccess(), 800);
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

          {/* Mode toggle */}
          {faceEnabled && (
            <div className="flex bg-slate-100 rounded-lg w-full p-0.5 mb-5">
              <button onClick={() => { setMode('pin'); setError(''); }} data-testid="mode-pin"
                className={`flex-1 flex items-center justify-center gap-2 rounded-md transition text-sm font-bold py-2 ${mode === 'pin' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                <KeyRound className="w-4 h-4" /> PIN
              </button>
              <button onClick={() => { setMode('face'); setError(''); }} data-testid="mode-face"
                className={`flex-1 flex items-center justify-center gap-2 rounded-md transition text-sm font-bold py-2 ${mode === 'face' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                <ScanFace className="w-4 h-4" /> Face ID
              </button>
            </div>
          )}

          {mode === 'pin' ? (
            <>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-1">Voer PIN in</h2>
              <p className="text-sm text-slate-400 mb-5">4-cijferige toegangscode</p>

              {/* PIN dots */}
              <div className="flex justify-center gap-3 sm:gap-4 mb-4">
                {pin.map((digit, index) => (
                  <input key={index} ref={inputRefs[index]} type="password" inputMode="numeric" maxLength={1}
                    value={digit} onChange={(e) => handlePinChange(index, e.target.value)} onKeyDown={(e) => handleKeyDown(index, e)}
                    className={`text-center font-bold rounded-xl border-2 transition-all outline-none w-12 h-14 sm:w-16 sm:h-16 text-xl sm:text-2xl ${
                      error ? 'border-red-400 bg-red-50' : digit ? 'border-orange-500 bg-orange-50' : 'border-slate-200 bg-slate-50 focus:border-orange-500'
                    }`}
                    disabled={loading}
                    data-testid={`pin-input-${index}`} />
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
            </>
          ) : (
            <>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-1">Face ID</h2>
              <p className="text-sm text-slate-400 mb-4">Kijk in de camera om in te loggen</p>
              {error && <p className="text-sm text-red-500 text-center font-semibold mb-3">{error}</p>}
              <FaceCapture mode="verify" onCapture={handleFaceCapture} onCancel={() => setMode('pin')} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
