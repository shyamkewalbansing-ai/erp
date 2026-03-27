import { useState, useRef, useEffect } from 'react';
import { Lock, Delete, ArrowLeft, Check, Loader2 } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

export default function SetPinScreen({ companyId, companyName, onSuccess, onBack }) {
  const [phase, setPhase] = useState('choose'); // choose → confirm → saving
  const [pin, setPin] = useState(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
  const [chosenPin, setChosenPin] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleKeypad = (value, isConfirm = false) => {
    const currentPin = isConfirm ? confirmPin : pin;
    const setCurrentPin = isConfirm ? setConfirmPin : setPin;
    setError('');

    if (value === 'DEL') {
      for (let i = 3; i >= 0; i--) {
        if (currentPin[i]) {
          const next = [...currentPin];
          next[i] = '';
          setCurrentPin(next);
          return;
        }
      }
    } else {
      for (let i = 0; i < 4; i++) {
        if (!currentPin[i]) {
          const next = [...currentPin];
          next[i] = value;
          setCurrentPin(next);

          // Auto-advance when 4 digits entered
          if (i === 3) {
            const fullPin = next.join('');
            if (!isConfirm) {
              // First entry done → go to confirm
              setTimeout(() => {
                setChosenPin(fullPin);
                setPhase('confirm');
              }, 300);
            } else {
              // Confirm entry → check match
              setTimeout(() => {
                if (fullPin === chosenPin) {
                  savePin(fullPin);
                } else {
                  setError('PIN codes komen niet overeen');
                  setConfirmPin(['', '', '', '']);
                }
              }, 300);
            }
          }
          return;
        }
      }
    }
  };

  const savePin = async (pinCode) => {
    setSaving(true);
    setPhase('saving');
    try {
      const res = await axios.post(`${API}/public/${companyId}/set-pin`, { pin: pinCode });
      localStorage.setItem('kiosk_token', res.data.token);
      sessionStorage.setItem(`kiosk_pin_verified_${companyId}`, 'true');
      setTimeout(() => onSuccess(), 800);
    } catch (err) {
      setError(err.response?.data?.detail || 'Opslaan mislukt');
      setPhase('choose');
      setPin(['', '', '', '']);
      setConfirmPin(['', '', '', '']);
      setChosenPin('');
      setSaving(false);
    }
  };

  const resetToChoose = () => {
    setPhase('choose');
    setPin(['', '', '', '']);
    setConfirmPin(['', '', '', '']);
    setChosenPin('');
    setError('');
  };

  const currentPin = phase === 'confirm' ? confirmPin : pin;
  const isConfirmPhase = phase === 'confirm';

  return (
    <div className="min-h-full bg-orange-500 flex flex-col overflow-hidden" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <button onClick={onBack} className="flex items-center gap-2 text-white/70 hover:text-white text-sm font-medium transition" data-testid="set-pin-back">
          <ArrowLeft className="w-4 h-4" /> Terug
        </button>
        <span className="text-white/60 text-sm font-medium">{companyName}</span>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        {phase === 'saving' ? (
          <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md text-center" data-testid="pin-saving">
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">PIN code opgeslagen!</h2>
            <p className="text-slate-400">Kiosk wordt gestart...</p>
            <Loader2 className="w-6 h-6 animate-spin text-orange-500 mx-auto mt-4" />
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10 max-w-md w-full" data-testid="set-pin-card">
            {/* Icon + Title */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-9 h-9 text-orange-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                {isConfirmPhase ? 'Bevestig PIN code' : 'Kies uw PIN code'}
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                {isConfirmPhase ? 'Voer dezelfde code opnieuw in' : 'Kies een 4-cijferige code voor uw kiosk'}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-center text-sm font-medium" data-testid="set-pin-error">
                {error}
              </div>
            )}

            {/* PIN Display */}
            <div className="flex justify-center gap-4 mb-6">
              {currentPin.map((digit, i) => (
                <div
                  key={i}
                  className={`w-14 h-14 md:w-16 md:h-16 rounded-xl border-2 flex items-center justify-center text-2xl font-black transition-all ${
                    error ? 'border-red-400 bg-red-50 text-red-600'
                      : digit ? 'border-orange-500 bg-orange-50 text-orange-600'
                      : 'border-slate-200 bg-slate-50 text-slate-300'
                  }`}
                >
                  {digit ? '\u2022' : ''}
                </div>
              ))}
            </div>

            {/* Step indicator */}
            <div className="flex justify-center gap-2 mb-6">
              <div className={`w-2 h-2 rounded-full transition ${!isConfirmPhase ? 'bg-orange-500' : 'bg-slate-200'}`} />
              <div className={`w-2 h-2 rounded-full transition ${isConfirmPhase ? 'bg-orange-500' : 'bg-slate-200'}`} />
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto">
              {['1','2','3','4','5','6','7','8','9','','0','DEL'].map((key) => (
                key === '' ? <div key="empty" /> : (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleKeypad(key, isConfirmPhase)}
                    disabled={saving}
                    data-testid={`set-pin-key-${key}`}
                    className={`h-14 md:h-16 text-xl md:text-2xl font-bold rounded-xl transition-all active:scale-90 flex items-center justify-center ${
                      key === 'DEL'
                        ? 'bg-red-50 text-red-500 hover:bg-red-100 border border-red-200'
                        : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {key === 'DEL' ? <Delete className="w-5 h-5" /> : key}
                  </button>
                )
              ))}
            </div>

            {/* Back to step 1 (only in confirm phase) */}
            {isConfirmPhase && (
              <button onClick={resetToChoose} className="mt-4 w-full text-center text-sm text-slate-400 hover:text-orange-500 font-medium transition" data-testid="set-pin-reset">
                Andere code kiezen
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
