import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { inventoryAPI, scanAPI } from '../../services/api';
import {
  HiOutlineQrcode, HiOutlineRefresh, HiOutlineLightBulb,
  HiOutlineArrowDown, HiOutlineArrowUp, HiOutlineTrash,
  HiOutlineCheckCircle,
} from 'react-icons/hi';
import jsQR from 'jsqr';
import toast from 'react-hot-toast';
import './Scan.css';

// ─── Web Audio beep ───────────────────────────────────────────────────────────
const _ac = { current: null };
function playBeep(type = 'success') {
  try {
    if (!_ac.current) _ac.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = _ac.current;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    if (type === 'success') {
      [[800, 0, 0.08], [1200, 0.1, 0.14]].forEach(([freq, s, d]) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(freq, now + s);
        g.gain.setValueAtTime(0.4, now + s); g.gain.exponentialRampToValueAtTime(0.001, now + s + d);
        o.connect(g); g.connect(ctx.destination); o.start(now + s); o.stop(now + s + d + 0.01);
      });
    } else {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(220, now);
      o.frequency.exponentialRampToValueAtTime(100, now + 0.22);
      g.gain.setValueAtTime(0.3, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      o.connect(g); g.connect(ctx.destination); o.start(now); o.stop(now + 0.26);
    }
  } catch (_) {}
}

const COOLDOWN_MS  = 2000;
const DEFAULT_QTY  = 10;

const Scan = () => {
  const { user } = useAuth();

  const videoRef      = useRef(null);
  const canvasRef     = useRef(null);
  const animFrameRef  = useRef(null);
  const streamRef     = useRef(null);
  const lastSendRef   = useRef(0);
  const isScanningRef = useRef(false);
  const hwBufferRef   = useRef('');
  const hwTimerRef    = useRef(null);

  const [scanning,     setScanning]     = useState(false);
  const [lastScan,     setLastScan]     = useState(null);
  const [error,        setError]        = useState('');
  const [torchOn,      setTorchOn]      = useState(false);
  const [scanMode,     setScanMode]     = useState('IN');
  const [cooldown,     setCooldown]     = useState(false);
  const [notification, setNotification] = useState(null);
  const [submitting,   setSubmitting]   = useState(false);

  // Items scanned but not yet sent to API
  const [pendingList, setPendingList] = useState([]);
  // Items already submitted
  const [scanHistory, setScanHistory] = useState([]);

  // ── Notification auto-dismiss ─────────────────────────────────────────────
  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => setNotification(null), 2500);
    return () => clearTimeout(t);
  }, [notification]);

  // ── Camera ────────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setScanning(true);
        requestAnimationFrame(tick);
      }
    } catch (err) {
      if (err.name === 'NotAllowedError') setError('Camera permission denied. Allow camera access and retry.');
      else if (err.name === 'NotFoundError') setError('No camera found on this device.');
      else setError(`Camera error: ${err.message}`);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  }, []);

  // ── rAF decode loop ───────────────────────────────────────────────────────
  const tick = useCallback(() => {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(tick); return;
    }
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const img  = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
    if (code) {
      const now = Date.now();
      if (!isScanningRef.current && now - lastSendRef.current > COOLDOWN_MS) {
        lastSendRef.current = now;
        handleScan(code.data);
      }
    }
    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  // ── Hardware scanner ──────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.key.length === 1) hwBufferRef.current += e.key;
      if (e.key === 'Enter' && hwBufferRef.current.length > 3) {
        const data = hwBufferRef.current.trim(); hwBufferRef.current = '';
        clearTimeout(hwTimerRef.current);
        const now = Date.now();
        if (!isScanningRef.current && now - lastSendRef.current > COOLDOWN_MS) {
          lastSendRef.current = now; handleScan(data);
        }
        return;
      }
      clearTimeout(hwTimerRef.current);
      hwTimerRef.current = setTimeout(() => { hwBufferRef.current = ''; }, 80);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Scan → add to pending list (no API call yet) ──────────────────────────
  const handleScan = useCallback(async (qrData) => {
    if (isScanningRef.current) return;
    isScanningRef.current = true;
    setCooldown(true);
    setLastScan(qrData);

    const parts    = qrData.trim().split('|');
    const itemCode = parts[0]?.trim().toUpperCase() || qrData;

    try {
      // Validate item exists & get name via scan API
      const res      = await scanAPI.scan(qrData);
      const itemName = res.data?.itemName || itemCode;

      playBeep('success');

      setPendingList(prev => {
        const idx = prev.findIndex(i => i.itemCode === itemCode);
        if (idx !== -1) {
          // Already in list → add DEFAULT_QTY more
          const updated = [...prev];
          updated[idx] = { ...updated[idx], qty: updated[idx].qty + DEFAULT_QTY };
          return updated;
        }
        return [...prev, { id: Date.now(), itemCode, itemName, qty: DEFAULT_QTY, action: scanMode }];
      });

      setNotification({ type: 'success', message: `Added to list — ${itemCode}` });
    } catch (err) {
      playBeep('error');
      const msg = err.response?.data?.message || err.message || 'Scan Failed';
      setNotification({ type: 'error', message: `Scan Failed — ${msg}` });
      toast.error(msg, { duration: 2500 });
    }

    setTimeout(() => { isScanningRef.current = false; setCooldown(false); }, COOLDOWN_MS);
  }, [scanMode]);

  // ── Pending list helpers ──────────────────────────────────────────────────
  const updateQty = (id, val) => {
    const num = Math.max(1, parseInt(val) || 1);
    setPendingList(prev => prev.map(i => i.id === id ? { ...i, qty: num } : i));
  };
  const removeItem = (id) => setPendingList(prev => prev.filter(i => i.id !== id));

  // ── Submit all ────────────────────────────────────────────────────────────
  const handleSubmitAll = async () => {
    if (!pendingList.length || submitting) return;
    setSubmitting(true);
    let ok = 0, fail = 0;

    for (const item of pendingList) {
      try {
        if (item.action === 'IN') {
          await inventoryAPI.inward({ qrData: `${item.itemCode}|${item.qty}` });
        } else {
          await inventoryAPI.issue({ itemCode: item.itemCode, quantity: item.qty, remarks: 'Issued via QR scan' });
        }
        ok++;
        setScanHistory(prev => [{ ...item, time: new Date(), success: true }, ...prev.slice(0, 49)]);
      } catch {
        fail++;
        setScanHistory(prev => [{ ...item, time: new Date(), success: false }, ...prev.slice(0, 49)]);
      }
    }

    if (ok > 0) {
      playBeep('success');
      const label = scanMode === 'IN' ? 'Added' : 'Removed';
      toast.success(`${label} ${ok} product${ok > 1 ? 's' : ''} successfully${fail ? ` (${fail} failed)` : ''}`, { duration: 3000 });
    } else {
      playBeep('error');
      toast.error(`${fail} item${fail > 1 ? 's' : ''} failed`, { duration: 3000 });
    }

    setPendingList([]);
    setSubmitting(false);
  };

  // ── Torch ─────────────────────────────────────────────────────────────────
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const v = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: v }] });
      setTorchOn(v);
    } catch { toast.error('Torch not supported on this device'); }
  };

  useEffect(() => { startCamera(); return () => stopCamera(); }, []);

  const fmt = d => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="scan-page">

      {/* Notification */}
      {notification && (
        <div className={`scan-notif scan-notif--${notification.type}`} role="alert">
          <span className="scan-notif__icon">
            {notification.type === 'success'
              ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18"><circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" strokeLinecap="round" /></svg>}
          </span>
          <span className="scan-notif__msg">{notification.message}</span>
          <button className="scan-notif__close" onClick={() => setNotification(null)}>×</button>
          <div className="scan-notif__bar" />
        </div>
      )}

      {/* Header */}
      <div className="scan-page-header">
        <HiOutlineQrcode className="scan-page-icon" />
        <div>
          <h1>QR Scanner</h1>
          <p>Scan items — review list — confirm</p>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="scan-mode-toggle">
        <button className={`scan-mode-btn ${scanMode === 'IN'  ? 'scan-mode-btn--active-in'  : ''}`} onClick={() => setScanMode('IN')}  disabled={cooldown}>
          <HiOutlineArrowDown /> Stock IN
        </button>
        <button className={`scan-mode-btn ${scanMode === 'OUT' ? 'scan-mode-btn--active-out' : ''}`} onClick={() => setScanMode('OUT')} disabled={cooldown}>
          <HiOutlineArrowUp /> Stock OUT
        </button>
      </div>

      {/* Two-column layout */}
      <div className="scan-layout">

        {/* Camera column */}
        <div className="scan-layout__camera">
          <div className={`viewfinder-wrapper ${cooldown ? 'viewfinder-wrapper--cooldown' : ''}`}>
            <video ref={videoRef} className="scan-video" playsInline muted autoPlay />
            <canvas ref={canvasRef} className="scan-canvas" />

            <div className={`viewfinder-mode-badge viewfinder-mode-badge--${scanMode.toLowerCase()}`}>
              {scanMode === 'IN' ? <HiOutlineArrowDown /> : <HiOutlineArrowUp />} {scanMode}
            </div>

            {cooldown && (
              <div className="viewfinder-cooldown-overlay">
                <div className="cooldown-spinner" />
                <span>Ready in 2s…</span>
              </div>
            )}

            <div className="scan-overlay">
              <div className={`scan-target ${cooldown ? 'scan-target--locked' : ''}`}>
                <span className="corner tl" /><span className="corner tr" />
                <span className="corner bl" /><span className="corner br" />
                {scanning && !cooldown && <div className="scan-line" />}
              </div>
            </div>

            <div className="scan-controls">
              {scanning ? (
                <>
                  <button className="scan-ctrl-btn" onClick={toggleTorch}><HiOutlineLightBulb />{torchOn ? 'On' : 'Off'}</button>
                  <button className="scan-ctrl-btn danger" onClick={stopCamera}>Stop</button>
                </>
              ) : (
                <button className="scan-ctrl-btn primary" onClick={startCamera}><HiOutlineRefresh /> Start</button>
              )}
            </div>

            <div className="scan-status-bar">
              <span className={`scan-status-dot ${scanning ? 'active' : ''}`} />
              <span>{!scanning ? 'Camera off' : cooldown ? 'Adding…' : 'Scanning…'}</span>
              {lastScan && <span className="scan-last">Last: <strong>{lastScan.split('|')[0]}</strong></span>}
            </div>
          </div>

          {error && (
            <div className="scan-error-box">
              <p>{error}</p>
              <button className="btn btn-primary btn-sm" onClick={startCamera}><HiOutlineRefresh /> Retry</button>
            </div>
          )}
        </div>

        {/* Pending list column */}
        <div className="scan-layout__list">
          <div className="pending-list">

            <div className="pending-list__header">
              <h3>
                Scan List
                {pendingList.length > 0 && <span className="pending-list__badge">{pendingList.length}</span>}
              </h3>
              {pendingList.length > 0 && (
                <button className="pending-list__clear" onClick={() => setPendingList([])}>Clear all</button>
              )}
            </div>

            {pendingList.length === 0 ? (
              <div className="pending-list__empty">
                <HiOutlineQrcode />
                <p>Scan a QR code<br />to add items here</p>
              </div>
            ) : (
              <div className="pending-list__items">
                {pendingList.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`pending-item ${idx === pendingList.length - 1 ? 'pending-item--new' : ''}`}
                  >
                    <div className="pending-item__info">
                      <span className="pending-item__code">{item.itemCode}</span>
                      <span className="pending-item__name">{item.itemName}</span>
                    </div>

                    <div className="pending-item__controls">
                      <div className="pending-item__qty-wrap">
                        <button className="qty-btn" onClick={() => updateQty(item.id, item.qty - 1)} disabled={item.qty <= 1}>−</button>
                        <input
                          type="number"
                          className="qty-input"
                          value={item.qty}
                          min={1}
                          onChange={e => updateQty(item.id, e.target.value)}
                        />
                        <button className="qty-btn" onClick={() => updateQty(item.id, item.qty + 1)}>+</button>
                      </div>

                      <span className={`pending-item__action pending-item__action--${item.action.toLowerCase()}`}>
                        {item.action === 'IN' ? <HiOutlineArrowDown /> : <HiOutlineArrowUp />} {item.action}
                      </span>

                      <button className="pending-item__remove" onClick={() => removeItem(item.id)} title="Remove">
                        <HiOutlineTrash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Add / Remove Products button ── */}
            <button
              className={`pending-list__submit
                ${pendingList.length === 0    ? 'pending-list__submit--disabled' : ''}
                ${scanMode === 'IN' && pendingList.length > 0 ? 'pending-list__submit--in'  : ''}
                ${scanMode === 'OUT'&& pendingList.length > 0 ? 'pending-list__submit--out' : ''}
              `}
              onClick={handleSubmitAll}
              disabled={pendingList.length === 0 || submitting}
            >
              {submitting ? (
                <><div className="btn-spinner" /> Processing…</>
              ) : (
                <>
                  <HiOutlineCheckCircle />
                  {scanMode === 'IN' ? 'Add Products' : 'Remove Products'}
                  {pendingList.length > 0 && (
                    <span className="pending-list__submit-count">{pendingList.length}</span>
                  )}
                </>
              )}
            </button>

          </div>
        </div>
      </div>

      {/* Submitted log */}
      {scanHistory.length > 0 && (
        <div className="scan-history">
          <div className="scan-history-header">
            <h3>Submitted Log <span className="scan-history-count">{scanHistory.length}</span></h3>
            <button className="scan-history-clear" onClick={() => setScanHistory([])}>Clear</button>
          </div>
          <div className="scan-history-list">
            {scanHistory.map((entry, i) => (
              <div key={`${entry.itemCode}-${i}`} className={`scan-history-item ${entry.success ? 'success' : 'fail'}`}>
                <div className="scan-history-main">
                  <span className="scan-history-code">{entry.itemCode}</span>
                  <span className="scan-history-name">{entry.itemName}</span>
                </div>
                <div className="scan-history-meta">
                  <span className={`scan-history-action scan-history-action--${entry.action.toLowerCase()}`}>
                    {entry.action === 'IN' ? <HiOutlineArrowDown /> : <HiOutlineArrowUp />} {entry.action}
                  </span>
                  <span className="scan-history-qty">×{entry.qty}</span>
                  <span className={`badge ${entry.success ? 'badge-success' : 'badge-danger'}`}>{entry.success ? '✓' : '✗'}</span>
                  <span className="scan-history-time">{fmt(entry.time)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default Scan;