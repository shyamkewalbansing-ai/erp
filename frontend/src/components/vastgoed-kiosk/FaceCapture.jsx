import { useRef, useState, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { Camera, Loader2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

const MODEL_URL = window.location.origin + '/models';

async function loadModels() {
  // Load each model sequentially with individual verification
  await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
  if (!faceapi.nets.tinyFaceDetector.params) {
    throw new Error('tinyFaceDetector failed to initialize params');
  }

  await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
  if (!faceapi.nets.faceLandmark68Net.params) {
    throw new Error('faceLandmark68Net failed to initialize params');
  }

  await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
  if (!faceapi.nets.faceRecognitionNet.params) {
    throw new Error('faceRecognitionNet failed to initialize params');
  }
}

export default function FaceCapture({ onCapture, onCancel, mode = 'register', buttonLabel }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading, ready, detecting, success, error
  const [message, setMessage] = useState('Modellen laden...');

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        await loadModels();
        if (cancelled) return;
        setMessage('Camera starten...');
        // Try flexible constraints first, fallback to basic video
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 480 }, height: { ideal: 360 }, facingMode: 'user' } });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus('ready');
        setMessage(mode === 'register' ? 'Kijk recht in de camera' : 'Gezicht herkennen...');
        if (mode === 'verify' || mode === 'verify-continuous') {
          if (!cancelled) detectFace();
        }
      } catch (err) {
        if (!cancelled) {
          if (mode === 'verify-continuous') {
            setTimeout(() => { if (!cancelled) init(); }, 1000);
          } else {
            setStatus('error');
            setMessage(err.name === 'NotAllowedError' ? 'Camera toegang geweigerd' : 'Camera kon niet worden gestart');
          }
        }
      }
    };
    init();
    return () => { cancelled = true; stopCamera(); };
  }, [mode, stopCamera]);

  const detectFace = async () => {
    if (!videoRef.current) return;
    setStatus('detecting');
    setMessage('Gezicht detecteren...');
    let attempts = 0;
    let modelReloadAttempts = 0;
    const tryDetect = async () => {
      if (!videoRef.current || !streamRef.current) return;
      if (attempts > 30) {
        if (mode === 'verify-continuous') {
          attempts = 0;
          setTimeout(tryDetect, 200);
          return;
        }
        setStatus('ready');
        setMessage('Geen gezicht gevonden. Probeer opnieuw.');
        return;
      }
      attempts++;
      try {
        // Verify model is ready before inference
        if (!faceapi.nets.tinyFaceDetector.params) {
          if (modelReloadAttempts < 3) {
            modelReloadAttempts++;
            setMessage(`Modellen herladen... (${modelReloadAttempts}/3)`);
            await loadModels();
          } else {
            throw new Error('Models could not be loaded after 3 attempts');
          }
        }
        const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.35 }))
          .withFaceLandmarks()
          .withFaceDescriptor();
        if (detection) {
          const descriptor = Array.from(detection.descriptor);
          if (mode === 'verify-continuous') {
            onCapture(descriptor);
            setTimeout(tryDetect, 1000);
          } else {
            setStatus('success');
            setMessage(mode === 'register' ? 'Gezicht geregistreerd!' : 'Gezicht herkend!');
            stopCamera();
            onCapture(descriptor);
          }
        } else {
          setTimeout(tryDetect, 150);
        }
      } catch (err) {
        // Catch the TinyYolov2 "load model before inference" error
        if (err.message && err.message.includes('load model') && modelReloadAttempts < 3) {
          modelReloadAttempts++;
          setMessage(`Model fout - herladen... (${modelReloadAttempts}/3)`);
          try {
            await loadModels();
            setTimeout(tryDetect, 500);
          } catch {
            setStatus('error');
            setMessage('Gezichtsmodellen konden niet worden geladen');
          }
        } else {
          setStatus('error');
          setMessage('Gezichtsdetectie fout: ' + err.message);
        }
      }
    };
    tryDetect();
  };

  const handleCapture = () => {
    detectFace();
  };

  const handleRetry = async () => {
    setStatus('loading');
    setMessage('Camera herstarten...');
    stopCamera();
    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 480 }, height: { ideal: 360 }, facingMode: 'user' } });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus('ready');
      setMessage(mode === 'register' ? 'Kijk recht in de camera' : 'Gezicht herkennen...');
      if (mode === 'verify' || mode === 'verify-continuous') setTimeout(detectFace, 500);
    } catch {
      setStatus('error');
      setMessage('Camera kon niet worden gestart');
    }
  };

  return (
    <div className="flex flex-col items-center" data-testid="face-capture">
      {/* Video feed */}
      <div className="relative bg-slate-900 overflow-hidden" style={{ width: 'clamp(200px, 28vw, 380px)', height: 'clamp(150px, 22vw, 290px)', borderRadius: 'clamp(12px, 1.5vh, 20px)', marginBottom: '1.5vh' }}>
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
        {/* Overlay for face guide */}
        {(status === 'ready' || status === 'detecting') && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`border-2 border-dashed rounded-full transition-colors ${status === 'detecting' ? 'border-orange-400 animate-pulse' : 'border-white/40'}`}
              style={{ width: '55%', height: '75%' }} />
          </div>
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
      <p className={`kiosk-body font-semibold text-center ${status === 'success' ? 'text-green-600' : status === 'error' ? 'text-red-500' : 'text-slate-600'}`}
        style={{ marginBottom: '1.5vh' }}>
        {mode === 'verify-continuous' && status !== 'loading' ? 'Gezicht detecteren...' : message}
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
        {status === 'detecting' && mode !== 'verify-continuous' && (
          <div className="flex items-center gap-2 text-orange-500">
            <Loader2 className="animate-spin" style={{ width: '2vh', height: '2vh' }} />
            <span className="kiosk-body font-semibold">Detecteren...</span>
          </div>
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
    </div>
  );
}
