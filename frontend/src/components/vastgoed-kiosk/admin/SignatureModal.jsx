import { useRef, useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function SignatureModal({ onConfirm, onCancel, savedSignature }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [useSaved, setUseSaved] = useState(!!savedSignature);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1e293b';
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches?.[0];
    return {
      x: (touch?.clientX || e.clientX) - rect.left,
      y: (touch?.clientY || e.clientY) - rect.top
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    setDrawing(true);
    setUseSaved(false);
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const endDraw = () => setDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setUseSaved(false);
  };

  const handleConfirm = () => {
    if (useSaved && savedSignature) {
      onConfirm(savedSignature);
    } else if (hasDrawn) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onConfirm(dataUrl);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Handtekening voor goedkeuring</h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4">
          {savedSignature && (
            <div className="mb-3">
              <button
                onClick={() => setUseSaved(true)}
                className={`w-full p-3 rounded-xl border-2 transition ${useSaved ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <p className="text-xs text-slate-500 mb-1">Opgeslagen handtekening</p>
                <img src={savedSignature} alt="Handtekening" className="h-12 mx-auto" />
              </button>
            </div>
          )}
          <p className="text-xs text-slate-500 mb-2">{savedSignature ? 'Of teken hieronder een nieuwe:' : 'Teken uw handtekening:'}</p>
          <div className="relative">
            <canvas
              ref={canvasRef}
              className={`w-full h-32 border-2 rounded-xl cursor-crosshair touch-none ${useSaved ? 'border-slate-100 opacity-40' : 'border-slate-300'}`}
              style={{ background: '#fafafa' }}
              onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
              onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
            />
            {!hasDrawn && !useSaved && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-slate-300 text-sm">Teken hier</p>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={clearCanvas} className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 bg-slate-100 rounded-lg">Wissen</button>
            <div className="flex-1" />
            <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Annuleer</button>
            <button
              onClick={handleConfirm}
              disabled={!hasDrawn && !useSaved}
              className="px-4 py-2 text-sm font-bold text-white bg-green-500 rounded-lg hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed"
              data-testid="signature-confirm-btn"
            >
              Goedkeuren
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
