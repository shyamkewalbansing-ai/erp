import { useRef, useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { Camera, Loader2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

const MODEL_URL = window.location.origin + '/models';

let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playChime() {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const g = ctx.createGain();
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.25, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = 880; o1.connect(g); o1.start(now); o1.stop(now + 0.3);
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 1320; o2.connect(g); o2.start(now + 0.06); o2.stop(now + 0.3);
  } catch {}
}

let modelsLoaded = false;
async function ensureModels() {
  if (modelsLoaded && faceapi.nets.tinyFaceDetector.params) return;
  await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
  await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
  await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
  if (!faceapi.nets.tinyFaceDetector.params) throw new Error('Models failed');
  modelsLoaded = true;
}

const DETECT_OPTS = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.35 });

export default function FaceCapture({ onCapture, onCancel, mode = 'register', buttonLabel }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const runningRef = useRef(false);
  const mountedRef = useRef(true);
  const timerRef = useRef(null);
  const busyRef = useRef(false);
  // Stable ref for onCapture so detection loop never restarts when parent re-renders
  const onCaptureRef = useRef(onCapture);
  onCaptureRef.current = onCapture;

  const [status, setStatus] = useState('loading'); // loading | scanning | success | error
  const [pulse, setPulse] = useState(false);
  const [msg, setMsg] = useState('');

  // --- helpers ---
  const stopAll = () => {
    runningRef.current = false;
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  };

  const openCamera = async () => {
    const mob = /Mobi|Android|iPhone/i.test(navigator.userAgent);
    let s;
    try {
      s = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: mob ? 320 : 640 }, height: { ideal: mob ? 240 : 480 }, facingMode: 'user' }
      });
    } catch {
      s = await navigator.mediaDevices.getUserMedia({ video: true });
    }
    streamRef.current = s;
    if (videoRef.current) { videoRef.current.srcObject = s; await videoRef.current.play(); }
  };

  const startDetection = () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setStatus('scanning');

    const next = (ms) => {
      if (!runningRef.current) return;
      timerRef.current = setTimeout(loop, ms);
    };

    const loop = async () => {
      if (!runningRef.current || !videoRef.current || !streamRef.current) return;
      if (busyRef.current) { next(300); return; }

      try {
        if (!faceapi.nets.tinyFaceDetector.params) await ensureModels();
        const det = await faceapi.detectSingleFace(videoRef.current, DETECT_OPTS)
          .withFaceLandmarks().withFaceDescriptor();

        if (!det || !runningRef.current) { next(350); return; }

        const desc = Array.from(det.descriptor);

        if (mode === 'verify-continuous') {
          busyRef.current = true;
          setPulse(true);
          playChime();
          let ok = false;
          try { await onCaptureRef.current(desc); ok = true; } catch {}
          busyRef.current = false;
          if (mountedRef.current) setPulse(false);
          // After success the parent will navigate away (unmount).
          // After failure wait a bit then retry.
          if (runningRef.current) next(ok ? 3000 : 1000);
        } else if (mode === 'verify') {
          // Single-shot verify for Beheerder login
          busyRef.current = true;
          setPulse(true);
          playChime();
          let ok = false;
          try { await onCaptureRef.current(desc); ok = true; } catch {}
          busyRef.current = false;
          if (!mountedRef.current) return;
          if (ok) {
            runningRef.current = false;
            setStatus('success');
            setMsg('Gezicht herkend!');
            stopAll();
          } else {
            setPulse(false);
            // Not matched — keep scanning silently
            if (runningRef.current) next(1000);
          }
        } else {
          // register — single shot, always succeeds
          runningRef.current = false;
          setPulse(true);
          playChime();
          setStatus('success');
          setMsg('Gezicht geregistreerd!');
          stopAll();
          onCaptureRef.current(desc);
        }
      } catch {
        if (runningRef.current) next(500);
      }
    };
    loop();
  };

  // --- lifecycle ---
  useEffect(() => {
    mountedRef.current = true;
    const unlockAudio = () => { getAudioCtx(); document.removeEventListener('click', unlockAudio); document.removeEventListener('touchstart', unlockAudio); };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);

    let cancelled = false;
    const boot = async () => {
      try {
        await openCamera();
        if (cancelled) { stopAll(); return; }
        await ensureModels();
        if (cancelled) return;
        if (mode === 'verify' || mode === 'verify-continuous') {
          // Go straight to scanning — no 'ready' state
          startDetection();
        } else {
          setStatus('ready');
          setMsg('Kijk recht in de camera');
        }
      } catch (err) {
        if (cancelled) return;
        if (mode === 'verify-continuous') {
          // Retry silently
          setTimeout(() => { if (!cancelled) boot(); }, 1500);
        } else {
          setStatus('error');
          setMsg(err.name === 'NotAllowedError' ? 'Camera toegang geweigerd' : 'Camera kon niet worden gestart');
        }
      }
    };
    boot();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      stopAll();
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const handleCapture = () => startDetection();

  const handleRetry = async () => {
    setStatus('loading'); setMsg('');
    stopAll();
    try {
      await openCamera();
      await ensureModels();
      if (mode === 'verify' || mode === 'verify-continuous') {
        startDetection();
      } else {
        setStatus('ready');
        setMsg('Kijk recht in de camera');
      }
    } catch {
      setStatus('error');
      setMsg('Camera kon niet worden gestart');
    }
  };

  const scanning = status === 'scanning';

  return (
    <div className="flex flex-col items-center w-full" data-testid="face-capture">
      <div className="relative bg-slate-900 overflow-hidden w-full max-w-[380px]"
        style={{ aspectRatio: '4/3', borderRadius: 'clamp(10px, 2vw, 20px)', marginBottom: 'clamp(8px, 1.5vh, 16px)' }}>
        <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />

        {scanning && !pulse && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[10%] left-[12%] w-5 h-5 sm:w-6 sm:h-6 border-t-2 border-l-2 border-green-400 rounded-tl-md" />
            <div className="absolute top-[10%] right-[12%] w-5 h-5 sm:w-6 sm:h-6 border-t-2 border-r-2 border-green-400 rounded-tr-md" />
            <div className="absolute bottom-[10%] left-[12%] w-5 h-5 sm:w-6 sm:h-6 border-b-2 border-l-2 border-green-400 rounded-bl-md" />
            <div className="absolute bottom-[10%] right-[12%] w-5 h-5 sm:w-6 sm:h-6 border-b-2 border-r-2 border-green-400 rounded-br-md" />
            <div className="absolute left-[12%] right-[12%] h-[2px] bg-gradient-to-r from-transparent via-green-400 to-transparent face-scan-line" />
          </div>
        )}

        <div className={`absolute inset-0 bg-green-400/25 transition-opacity duration-300 ${pulse ? 'opacity-100' : 'opacity-0'}`} />

        {status === 'loading' && (
          <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
            <Loader2 className="text-white animate-spin w-8 h-8" />
          </div>
        )}
        {status === 'success' && (
          <div className="absolute inset-0 bg-green-900/60 flex items-center justify-center">
            <CheckCircle className="text-green-400 w-12 h-12" />
          </div>
        )}
        {status === 'error' && mode !== 'verify-continuous' && (
          <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
            <XCircle className="text-red-400 w-8 h-8" />
          </div>
        )}
      </div>

      <p className={`text-sm sm:text-base font-semibold text-center mb-2 sm:mb-3 transition-colors duration-200 ${
        status === 'success' ? 'text-green-600' : status === 'error' ? 'text-red-500' : scanning ? 'text-green-600' : 'text-slate-500'
      }`}>
        {scanning ? (pulse ? 'Herkend! Even geduld...' : 'Scannen...') : status === 'loading' ? 'Camera starten...' : msg}
      </p>

      <div className="flex gap-2 w-full justify-center flex-wrap px-2">
        {status === 'ready' && mode === 'register' && (
          <button onClick={handleCapture} data-testid="face-capture-btn"
            className="bg-orange-500 active:bg-orange-700 hover:bg-orange-600 text-white rounded-lg flex items-center justify-center gap-2 transition-colors text-sm sm:text-base font-bold px-4 py-2.5 sm:px-6 sm:py-3">
            <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
            {buttonLabel || 'Registreer gezicht'}
          </button>
        )}
        {mode !== 'verify-continuous' && status === 'error' && (
          <button onClick={handleRetry} data-testid="face-retry-btn"
            className="bg-slate-100 active:bg-slate-300 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm sm:text-base font-bold px-4 py-2.5 sm:px-6 sm:py-3">
            <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
            Opnieuw
          </button>
        )}
        {onCancel && status !== 'success' && mode !== 'verify-continuous' && (
          <button onClick={() => { stopAll(); onCancel(); }} data-testid="face-cancel-btn"
            className="bg-slate-100 active:bg-slate-300 hover:bg-slate-200 text-slate-500 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm sm:text-base font-bold px-4 py-2.5 sm:px-6 sm:py-3">
            Annuleren
          </button>
        )}
      </div>

      <style>{`
        @keyframes faceScan { 0% { top: 10%; opacity: 0 } 10% { opacity: 1 } 90% { opacity: 1 } 100% { top: 88%; opacity: 0 } }
        .face-scan-line { animation: faceScan 1.8s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
