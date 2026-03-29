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
    <div className="h-full bg-orange-500 flex flex-col" style={{ padding: '1.5vh 1.5vw 0' }}>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ height: '7vh', padding: '0 0.5vw' }}>
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-2 text-white font-bold transition hover:opacity-90 bg-white/20 backdrop-blur-sm rounded-lg" style={{ padding: '0.8vh 1.2vw' }} data-testid="pin-back-btn">
            <ArrowLeft style={{ width: '2.2vh', height: '2.2vh' }} />
            <span className="kiosk-body">Terug</span>
          </button>
        )}
        <div className="flex items-center gap-2 text-white">
          <Building2 style={{ width: '2.5vh', height: '2.5vh' }} />
          <span className="kiosk-subtitle">{companyName || 'Kiosk'}</span>
        </div>
        <div style={{ width: '6vw' }} />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center min-h-0" style={{ paddingBottom: '1.5vh' }}>
        <div className="kiosk-card flex flex-col items-center" style={{ width: 'clamp(280px, 30vw, 440px)', padding: 'clamp(16px, 3vh, 40px) clamp(16px, 2.5vw, 48px)' }}>

          {/* Mode toggle */}
          {faceEnabled && (
            <div className="flex bg-slate-100 rounded-lg w-full" style={{ padding: '0.4vh', marginBottom: '2.5vh' }}>
              <button onClick={() => { setMode('pin'); setError(''); }} data-testid="mode-pin"
                className={`flex-1 flex items-center justify-center gap-2 rounded-md transition kiosk-body font-bold ${mode === 'pin' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                style={{ padding: '0.8vh 0' }}>
                <KeyRound style={{ width: '1.8vh', height: '1.8vh' }} />
                PIN
              </button>
              <button onClick={() => { setMode('face'); setError(''); }} data-testid="mode-face"
                className={`flex-1 flex items-center justify-center gap-2 rounded-md transition kiosk-body font-bold ${mode === 'face' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                style={{ padding: '0.8vh 0' }}>
                <ScanFace style={{ width: '1.8vh', height: '1.8vh' }} />
                Face ID
              </button>
            </div>
          )}

          {mode === 'pin' ? (
            <>
              <h2 className="kiosk-title text-slate-900" style={{ marginBottom: '0.5vh' }}>Voer PIN in</h2>
              <p className="kiosk-body text-slate-400" style={{ marginBottom: '3vh' }}>4-cijferige toegangscode</p>

              {/* PIN dots */}
              <div className="flex justify-center" style={{ gap: '1.2vw', marginBottom: '2vh' }}>
                {pin.map((digit, index) => (
                  <input key={index} ref={inputRefs[index]} type="password" inputMode="numeric" maxLength={1}
                    value={digit} onChange={(e) => handlePinChange(index, e.target.value)} onKeyDown={(e) => handleKeyDown(index, e)}
                    className={`text-center font-bold rounded-lg border-2 transition-all outline-none ${
                      error ? 'border-red-400 bg-red-50' : digit ? 'border-orange-500 bg-orange-50' : 'border-slate-200 bg-slate-50 focus:border-orange-500'
                    }`}
                    style={{ width: 'clamp(40px, 5vw, 72px)', height: 'clamp(48px, 7vh, 80px)', fontSize: 'clamp(18px, 2.5vh, 32px)' }}
                    disabled={loading}
                    data-testid={`pin-input-${index}`} />
                ))}
              </div>

              {error && <p className="kiosk-body text-red-500 text-center font-semibold" style={{ marginBottom: '1.5vh' }}>{error}</p>}

              {/* Keypad */}
              <div className="grid grid-cols-3 w-full" style={{ gap: 'clamp(4px, 0.6vh, 10px)' }}>
                {['1','2','3','4','5','6','7','8','9','_e','0','DEL'].map((key) => (
                  key === '_e' ? <div key={key} /> : (
                    <button key={key} onClick={() => handleKeypadPress(key)} disabled={loading}
                      data-testid={`keypad-${key}`}
                      className={`font-bold rounded-lg transition active:scale-95 disabled:opacity-50 flex items-center justify-center ${
                        key === 'DEL' ? 'bg-slate-100 text-red-500 hover:bg-red-50'
                        : 'bg-slate-50 text-slate-900 hover:bg-orange-50 hover:text-orange-600 border border-slate-100'
                      }`}
                      style={{ height: 'clamp(36px, 5.5vh, 56px)', fontSize: 'clamp(16px, 2.2vh, 26px)' }}>
                      {key === 'DEL' ? <Delete style={{ width: '2.2vh', height: '2.2vh' }} /> : key}
                    </button>
                  )
                ))}
              </div>

              {loading && <p className="kiosk-small text-slate-400 animate-pulse" style={{ marginTop: '2vh' }}>Verifi&euml;ren...</p>}
            </>
          ) : (
            <>
              <h2 className="kiosk-title text-slate-900" style={{ marginBottom: '0.5vh' }}>Face ID</h2>
              <p className="kiosk-body text-slate-400" style={{ marginBottom: '2vh' }}>Kijk in de camera om in te loggen</p>
              {error && <p className="kiosk-body text-red-500 text-center font-semibold" style={{ marginBottom: '1.5vh' }}>{error}</p>}
              <FaceCapture mode="verify" onCapture={handleFaceCapture} onCancel={() => setMode('pin')} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
