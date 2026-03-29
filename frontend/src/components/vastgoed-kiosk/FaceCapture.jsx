import { useRef, useState, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { Camera, Loader2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

const MODEL_URL = window.location.origin + '/models';

// Success beep via Web Audio API
function playDetectionSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    // Two-tone chime: short high note
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
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

const DETECT_OPTIONS = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 });

export default function FaceCapture({ onCapture, onCancel, mode = 'register', buttonLabel }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectingRef = useRef(false);
  const cancelledRef = useRef(false);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Modellen laden...');
  const [scanPulse, setScanPulse] = useState(false);

  const stopCamera = useCallback(() => {
    detectingRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
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
    if (detectingRef.current) return;
    detectingRef.current = true;
    setStatus('detecting');
    let modelRetries = 0;

    const tick = async () => {
      if (!detectingRef.current || !videoRef.current || !streamRef.current) return;

      try {
        if (!faceapi.nets.tinyFaceDetector.params) {
          if (modelRetries++ < 3) { await loadModels(); }
          else { throw new Error('Models unavailable'); }
        }

        const detection = await faceapi.detectSingleFace(videoRef.current, DETECT_OPTIONS)
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) {
          setScanPulse(true);
          playDetectionSound();
          const descriptor = Array.from(detection.descriptor);

          if (mode === 'verify-continuous') {
            onCapture(descriptor);
            // Brief green flash, then continue scanning
            setTimeout(() => {
              setScanPulse(false);
              if (detectingRef.current) requestAnimationFrame(() => setTimeout(tick, 400));
            }, 600);
            return;
          } else {
            detectingRef.current = false;
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

      // Fast retry loop
      if (detectingRef.current) {
        requestAnimationFrame(() => setTimeout(tick, 80));
      }
    };

    tick();
  }, [mode, onCapture, stopCamera]);

  // Init
  useEffect(() => {
    cancelledRef.current = false;
    const init = async () => {
      try {
        await loadModels();
        if (cancelledRef.current) return;
        setMessage('Camera starten...');
        await startCamera();
        if (cancelledRef.current) { stopCamera(); return; }
        setStatus('ready');
        if (mode === 'verify' || mode === 'verify-continuous') {
          // Start detecting after short stabilization delay
          setTimeout(() => { if (!cancelledRef.current) detectFace(); }, 800);
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
    return () => { cancelledRef.current = true; stopCamera(); };
  }, [mode, stopCamera, startCamera, detectFace]);

  const handleCapture = () => detectFace();

  const handleRetry = async () => {
    setStatus('loading');
    setMessage('Camera herstarten...');
    stopCamera();
    try {
      await startCamera();
      setStatus('ready');
      setMessage(mode === 'register' ? 'Kijk recht in de camera' : 'Gezicht herkennen...');
      if (mode === 'verify' || mode === 'verify-continuous') setTimeout(detectFace, 500);
    } catch {
      setStatus('error');
      setMessage('Camera kon niet worden gestart');
    }
  };

  const isScanning = status === 'detecting' || (status === 'ready' && (mode === 'verify' || mode === 'verify-continuous'));

  return (
    <div className="flex flex-col items-center" data-testid="face-capture">
      {/* Video feed */}
      <div className="relative bg-slate-900 overflow-hidden" style={{ width: 'clamp(200px, 28vw, 380px)', height: 'clamp(150px, 22vw, 290px)', borderRadius: 'clamp(12px, 1.5vh, 20px)', marginBottom: '1.5vh' }}>
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />

        {/* Scanning overlay */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Corner brackets */}
            <div className="absolute top-[12%] left-[15%] w-6 h-6 border-t-2 border-l-2 border-green-400 rounded-tl-md" />
            <div className="absolute top-[12%] right-[15%] w-6 h-6 border-t-2 border-r-2 border-green-400 rounded-tr-md" />
            <div className="absolute bottom-[12%] left-[15%] w-6 h-6 border-b-2 border-l-2 border-green-400 rounded-bl-md" />
            <div className="absolute bottom-[12%] right-[15%] w-6 h-6 border-b-2 border-r-2 border-green-400 rounded-br-md" />
            {/* Scanning line animation */}
            <div className="absolute left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-transparent via-green-400 to-transparent animate-scan-line" />
          </div>
        )}

        {/* Detection flash */}
        {scanPulse && (
          <div className="absolute inset-0 bg-green-400/20 transition-opacity duration-300" />
        )}

        {status === 'loading' && (
          <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
            <Loader2 className="text-white animate-spin" style={{ width: '4vh', height: '4vh' }} />
          </div>
        )}
        {status === 'success' && (
          <div className="absolute inset-0 bg-green-900/60 flex items-center justify-center">
            <CheckCircle className="text-green-400" style={{ width: '6vh', height: '6vh' }} />
          </div>
        )}
        {status === 'error' && mode !== 'verify-continuous' && (
          <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
            <XCircle className="text-red-400" style={{ width: '4vh', height: '4vh' }} />
          </div>
        )}
      </div>

      {/* Status message */}
      <p className={`kiosk-body font-semibold text-center ${status === 'success' ? 'text-green-600' : status === 'error' ? 'text-red-500' : isScanning ? 'text-green-600' : 'text-slate-600'}`}
        style={{ marginBottom: '1.5vh' }}>
        {isScanning ? 'Scannen...' : message}
      </p>

      {/* Action buttons */}
      <div className="flex gap-2 w-full justify-center">
        {status === 'ready' && mode === 'register' && (
          <button onClick={handleCapture} data-testid="face-capture-btn"
            className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg flex items-center justify-center gap-2 transition kiosk-body font-bold"
            style={{ padding: 'clamp(8px, 1.5vh, 18px) clamp(16px, 2vw, 32px)' }}>
            <Camera style={{ width: '2vh', height: '2vh' }} />
            {buttonLabel || 'Registreer gezicht'}
          </button>
        )}
        {mode !== 'verify-continuous' && (status === 'error' || (status === 'ready' && mode === 'verify')) && (
          <button onClick={handleRetry} data-testid="face-retry-btn"
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center justify-center gap-2 transition kiosk-body font-bold"
            style={{ padding: 'clamp(8px, 1.5vh, 18px) clamp(16px, 2vw, 32px)' }}>
            <RefreshCw style={{ width: '2vh', height: '2vh' }} />
            Opnieuw
          </button>
        )}
        {onCancel && status !== 'success' && mode !== 'verify-continuous' && (
          <button onClick={() => { stopCamera(); onCancel(); }} data-testid="face-cancel-btn"
            className="bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg flex items-center justify-center gap-2 transition kiosk-body font-bold"
            style={{ padding: 'clamp(8px, 1.5vh, 18px) clamp(16px, 2vw, 32px)' }}>
            Annuleren
          </button>
        )}
      </div>

      <style>{`
        @keyframes scanLine {
          0% { top: 12%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 85%; opacity: 0; }
        }
        .animate-scan-line {
          animation: scanLine 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
