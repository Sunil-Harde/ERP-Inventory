import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { scanAPI } from '../../services/api';
import { HiOutlineQrcode, HiOutlineRefresh, HiOutlineLightBulb } from 'react-icons/hi';
import jsQR from 'jsqr';
import toast from 'react-hot-toast';
import './Scan.css';

const Scan = () => {
  const { user } = useAuth();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const streamRef = useRef(null);

  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [torchOn, setTorchOn] = useState(false);
  const [scanHistory, setScanHistory] = useState([]);

  // Throttle: prevent duplicate sends within 2.5s
  const lastSendRef = useRef(0);

  const startCamera = useCallback(async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }, // rear camera
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setScanning(true);
        requestAnimationFrame(tick);
      }
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access and retry.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError(`Camera error: ${err.message}`);
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  }, []);

  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(tick);
      return;
    }

    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code) {
      const now = Date.now();
      if (now - lastSendRef.current > 2500) {
        lastSendRef.current = now;
        handleScan(code.data);
      }
    }

    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const handleScan = async (qrData) => {
    if (sending) return;
    setSending(true);
    setLastScan(qrData);

    try {
      const res = await scanAPI.scan(qrData);
      const entry = {
        qrData,
        itemName: res.data?.itemName || 'Unknown',
        itemCode: res.data?.itemCode || qrData,
        time: new Date().toLocaleTimeString('en-IN'),
        success: true,
      };
      setScanHistory((prev) => [entry, ...prev.slice(0, 9)]);
      toast.success(`📦 Scanned: ${entry.itemCode}`, { duration: 2000 });
    } catch (err) {
      const entry = {
        qrData,
        itemCode: qrData.split('|')[0] || qrData,
        itemName: '—',
        time: new Date().toLocaleTimeString('en-IN'),
        success: false,
        error: err.message,
      };
      setScanHistory((prev) => [entry, ...prev.slice(0, 9)]);
      toast.error(err.message || 'Scan failed', { duration: 2500 });
    }

    setSending(false);
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const newVal = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: newVal }] });
      setTorchOn(newVal);
    } catch {
      toast.error('Torch not supported on this device');
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  return (
    <div className="scan-page">
      <div className="scan-page-header">
        <HiOutlineQrcode className="scan-page-icon" />
        <div>
          <h1>QR Scanner</h1>
          <p>Scan inventory QR codes</p>
        </div>
      </div>

      {/* Camera Viewfinder */}
      <div className="viewfinder-wrapper">
        <video
          ref={videoRef}
          className="scan-video"
          playsInline
          muted
          autoPlay
        />
        <canvas ref={canvasRef} className="scan-canvas" />

        {/* Targeting overlay */}
        <div className="scan-overlay">
          <div className="scan-target">
            <span className="corner tl" />
            <span className="corner tr" />
            <span className="corner bl" />
            <span className="corner br" />
            {scanning && <div className="scan-line" />}
          </div>
        </div>

        {/* Controls */}
        <div className="scan-controls">
          {scanning ? (
            <>
              <button className="scan-ctrl-btn" onClick={toggleTorch} title="Torch">
                <HiOutlineLightBulb />
                {torchOn ? 'On' : 'Off'}
              </button>
              <button className="scan-ctrl-btn danger" onClick={stopCamera} title="Stop">
                Stop
              </button>
            </>
          ) : (
            <button className="scan-ctrl-btn primary" onClick={startCamera}>
              <HiOutlineRefresh /> Start Camera
            </button>
          )}
        </div>

        {/* Status bar */}
        <div className="scan-status-bar">
          <span className={`scan-status-dot ${scanning ? 'active' : ''}`} />
          <span>{scanning ? (sending ? 'Sending...' : 'Scanning...') : 'Camera off'}</span>
          {lastScan && <span className="scan-last">Last: <strong>{lastScan.split('|')[0]}</strong></span>}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="scan-error-box">
          <p>{error}</p>
          <button className="btn btn-primary btn-sm" onClick={startCamera}>
            <HiOutlineRefresh /> Retry
          </button>
        </div>
      )}

      {/* Scan History */}
      <div className="scan-history">
        <h3>Recent Scans</h3>
        {scanHistory.length === 0 ? (
          <p className="text-muted text-sm">Scan a QR code to see results here</p>
        ) : (
          <div className="scan-history-list">
            {scanHistory.map((entry, i) => (
              <div key={i} className={`scan-history-item ${entry.success ? 'success' : 'fail'}`}>
                <div className="scan-history-main">
                  <span className="scan-history-code">{entry.itemCode}</span>
                  <span className="scan-history-name">{entry.itemName}</span>
                </div>
                <div className="scan-history-meta">
                  <span className={`badge ${entry.success ? 'badge-success' : 'badge-danger'}`}>
                    {entry.success ? 'Sent ✓' : 'Error'}
                  </span>
                  <span className="scan-history-time">{entry.time}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="scan-instructions">
        <h4>How it works</h4>
        <ol>
          <li>Open <strong>Dashboard</strong> on desktop/another tab</li>
          <li>Scan a QR code on this mobile screen</li>
          <li>A popup will appear on the desktop to confirm IN/OUT</li>
        </ol>
        <p className="text-xs text-muted" style={{ marginTop: '0.5rem' }}>
          QR format: <code>ITEMCODE|QUANTITY</code> (e.g. <code>GRM001|10</code>)
        </p>
      </div>
    </div>
  );
};

export default Scan;
