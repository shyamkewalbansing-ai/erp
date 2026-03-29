import { useRef, useState, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { Camera, Loader2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

const MODEL_URL = window.location.origin + '/models';

// Persistent audio context — unlocked on first user touch/click
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playDetectionSound() {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.value = 880;
    osc2.frequency.value = 1320;
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc1.start(now);
    osc2.start(now + 0.06);
    osc1.stop(now + 0.3);
    osc2.stop(now + 0.3);
  } catch {}
}

let modelsReady = false;
async function loadModels() {
  if (modelsReady && faceapi.nets.tinyFaceDetector.params) return;
  await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
  if (!faceapi.nets.tinyFaceDetector.params) throw new Error('tinyFaceDetector failed');
  await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
  if (!faceapi.nets.faceLandmark68Net.params) throw new Error('faceLandmark68Net failed');
  await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
  if (!faceapi.nets.faceRecognitionNet.params) throw new Error('faceRecognitionNet failed');
  modelsReady = true;
}

const DETECT_OPTIONS = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.35 });
// Minimum time between detection attempts (ms) — prevents CPU overload
const DETECT_INTERVAL = 400;
// Cooldown after a successful match before scanning again (ms)
const MATCH_COOLDOWN = 3000;
// Shorter cooldown when face detected but not recognized
const FAIL_COOLDOWN = 1200;

export default function FaceCapture({ onCapture, onCancel, mode = 'register', buttonLabel }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const activeRef = useRef(false);
  const cancelledRef = useRef(false);
  const timerRef = useRef(null);
  const processingRef = useRef(false);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [scanPulse, setScanPulse] = useState(false);

  const stopCamera = useCallback(() => {
    activeRef.current = false;
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: isMobile ? 320 : 640 },
          height: { ideal: isMobile ? 240 : 480 },
          facingMode: 'user'
        }
      });
    } catch {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
    }
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
  }, []);

  const detectFace = useCallback(() => {
    if (activeRef.current) return;
    activeRef.current = true;
    setStatus('detecting');
    let modelRetries = 0;

    const scheduleNext = (delay) => {
      if (!activeRef.current) return;
      timerRef.current = setTimeout(tick, delay);
    };

    const tick = async () => {
      if (!activeRef.current || !videoRef.current || !streamRef.current) return;
      // Skip if a previous onCapture callback is still being processed
      if (processingRef.current) {
        scheduleNext(DETECT_INTERVAL);
        return;
      }

      try {
        if (!faceapi.nets.tinyFaceDetector.params) {
          if (modelRetries++ < 3) await loadModels();
          else throw new Error('Models unavailable');
        }

        const detection = await faceapi.detectSingleFace(videoRef.current, DETECT_OPTIONS)
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection && activeRef.current) {
          const descriptor = Array.from(detection.descriptor);

          if (mode === 'verify-continuous') {
            // Lock processing — prevent duplicate fires while API call is in-flight
            processingRef.current = true;
            setScanPulse(true);
            playDetectionSound();

            let matched = false;
            try {
              await onCapture(descriptor);
              matched = true;
            } catch {
              // Not recognized — will use shorter cooldown
            }

            processingRef.current = false;
            setScanPulse(false);

            // Longer cooldown on success (component likely unmounting anyway),
            // shorter cooldown on failure so user doesn't wait too long
            if (activeRef.current) {
              scheduleNext(matched ? MATCH_COOLDOWN : FAIL_COOLDOWN);
            }
            return;
          } else {
            // register / verify (single-shot)
            activeRef.current = false;
            setScanPulse(true);
            playDetectionSound();
            setStatus('success');
            setMessage(mode === 'register' ? 'Gezicht geregistreerd!' : 'Gezicht herkend!');
            stopCamera();
            onCapture(descriptor);
            return;
          }
        }
      } catch (err) {
        if (err.message?.includes('load model') && modelRetries < 3) {
          modelRetries++;
          try { await loadModels(); } catch {}
        }
      }

      // No face found — retry quickly
      if (activeRef.current) {
        scheduleNext(DETECT_INTERVAL);
      }
    };

    // Start first detection
    tick();
  }, [mode, onCapture, stopCamera]);

  useEffect(() => {
    cancelledRef.current = false;
    const unlockAudio = () => {
      getAudioCtx();
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);

    const init = async () => {
      try {
        await startCamera();
        if (cancelledRef.current) { stopCamera(); return; }
        setStatus('ready');
        await loadModels();
        if (cancelledRef.current) return;
        if (mode === 'verify' || mode === 'verify-continuous') {
          detectFace();
        } else {
          setMessage('Kijk recht in de camera');
        }
      } catch (err) {
        if (!cancelledRef.current) {
          if (mode === 'verify-continuous') {
            setTimeout(() => { if (!cancelledRef.current) init(); }, 1000);
          } else {
            setStatus('error');
            setMessage(err.name === 'NotAllowedError' ? 'Camera toegang geweigerd' : 'Camera kon niet worden gestart');
          }
        }
      }
    };
    init();
    return () => {
      cancelledRef.current = true;
      stopCamera();
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
  }, [mode, stopCamera, startCamera, detectFace]);

  const handleCapture = () => detectFace();

  const handleRetry = async () => {
    setStatus('loading');
    setMessage('');
    stopCamera();
    try {
      await startCamera();
      setStatus('ready');
      if (mode === 'verify' || mode === 'verify-continuous') {
        await loadModels();
        detectFace();
      } else {
        setMessage('Kijk recht in de camera');
      }
    } catch {
      setStatus('error');
      setMessage('Camera kon niet worden gestart');
    }
  };

  const isScanning = status === 'detecting';

  return (
    <div className="flex flex-col items-center w-full" data-testid="face-capture">
      {/* Video feed */}
      <div className="relative bg-slate-900 overflow-hidden w-full max-w-[380px]"
        style={{
          aspectRatio: '4/3',
          borderRadius: 'clamp(10px, 2vw, 20px)',
          marginBottom: 'clamp(8px, 1.5vh, 16px)',
          willChange: 'transform'
        }}>
        <video ref={videoRef} autoPlay muted playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }} />

        {/* Scanning overlay with corner brackets */}
        {isScanning && !scanPulse && (
          <div className="absolute inset-0 pointer-events-none" style={{ willChange: 'opacity' }}>
            <div className="absolute top-[10%] left-[12%] w-5 h-5 sm:w-6 sm:h-6 border-t-2 border-l-2 border-green-400 rounded-tl-md" />
            <div className="absolute top-[10%] right-[12%] w-5 h-5 sm:w-6 sm:h-6 border-t-2 border-r-2 border-green-400 rounded-tr-md" />
            <div className="absolute bottom-[10%] left-[12%] w-5 h-5 sm:w-6 sm:h-6 border-b-2 border-l-2 border-green-400 rounded-bl-md" />
            <div className="absolute bottom-[10%] right-[12%] w-5 h-5 sm:w-6 sm:h-6 border-b-2 border-r-2 border-green-400 rounded-br-md" />
            <div className="absolute left-[12%] right-[12%] h-[2px] bg-gradient-to-r from-transparent via-green-400 to-transparent face-scan-line" />
          </div>
        )}

        {/* Detection flash */}
        <div className={`absolute inset-0 bg-green-400/25 transition-opacity duration-300 ${scanPulse ? 'opacity-100' : 'opacity-0'}`}
          style={{ willChange: 'opacity' }} />

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

      {/* Status */}
      <p className={`text-sm sm:text-base font-semibold text-center mb-2 sm:mb-3 transition-colors duration-200 ${
        status === 'success' ? 'text-green-600' : status === 'error' ? 'text-red-500' : isScanning ? 'text-green-600' : 'text-slate-500'
      }`}>
        {isScanning ? (scanPulse ? 'Herkend! Even geduld...' : 'Scannen...') : status === 'loading' ? '' : message}
      </p>

      {/* Buttons */}
      <div className="flex gap-2 w-full justify-center flex-wrap px-2">
        {status === 'ready' && mode === 'register' && (
          <button onClick={handleCapture} data-testid="face-capture-btn"
            className="bg-orange-500 active:bg-orange-700 hover:bg-orange-600 text-white rounded-lg flex items-center justify-center gap-2 transition-colors text-sm sm:text-base font-bold px-4 py-2.5 sm:px-6 sm:py-3">
            <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
            {buttonLabel || 'Registreer gezicht'}
          </button>
        )}
        {mode !== 'verify-continuous' && (status === 'error' || (status === 'ready' && mode === 'verify')) && (
          <button onClick={handleRetry} data-testid="face-retry-btn"
            className="bg-slate-100 active:bg-slate-300 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm sm:text-base font-bold px-4 py-2.5 sm:px-6 sm:py-3">
            <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
            Opnieuw
          </button>
        )}
        {onCancel && status !== 'success' && mode !== 'verify-continuous' && (
          <button onClick={() => { stopCamera(); onCancel(); }} data-testid="face-cancel-btn"
            className="bg-slate-100 active:bg-slate-300 hover:bg-slate-200 text-slate-500 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm sm:text-base font-bold px-4 py-2.5 sm:px-6 sm:py-3">
            Annuleren
          </button>
        )}
      </div>

      <style>{`
        @keyframes faceScan {
          0% { top: 10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 88%; opacity: 0; }
        }
        .face-scan-line { animation: faceScan 1.8s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
