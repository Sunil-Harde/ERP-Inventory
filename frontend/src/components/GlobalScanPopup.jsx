import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { inventoryAPI } from '../services/api';
import { HiOutlineQrcode, HiOutlineArrowDown, HiOutlineArrowUp, HiOutlineX } from 'react-icons/hi';
import toast from 'react-hot-toast';

// ─── Inline beep (same pattern as Scan.jsx — no shared file needed) ──────────
const _ctx = { current: null };
function playBeep(type = 'success') {
  try {
    if (!_ctx.current) _ctx.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = _ctx.current;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    if (type === 'success') {
      [[800, 0, 0.08], [1200, 0.1, 0.14]].forEach(([freq, start, dur]) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + start);
        gain.gain.setValueAtTime(0.4, now + start);
        gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now + start); osc.stop(now + start + dur + 0.01);
      });
    } else {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.22);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now); osc.stop(now + 0.26);
    }
  } catch (_) {}
}
// ─────────────────────────────────────────────────────────────────────────────

const GlobalScanPopup = () => {
  const { socket, connected } = useSocket();
  const [scanEvent, setScanEvent] = useState(null);
  const [scanMode, setScanMode] = useState('IN');
  const [scanQty, setScanQty] = useState(1);
  const [scanSubmitting, setScanSubmitting] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handleQRScan = (payload) => {
      console.log('📦 Global QR Scan event received:', payload);
      setScanEvent(payload);
      setScanQty(payload.packQty || 1);
      setScanMode('IN');
      toast('Product Scanned', {
        icon: '🔔',
        style: { borderRadius: '10px', background: '#333', color: '#fff' },
      });
    };

    socket.on('qr_scanned', handleQRScan);
    return () => { socket.off('qr_scanned', handleQRScan); };
  }, [socket]);

  const handleScanConfirm = async () => {
    if (!scanEvent || scanQty <= 0) return;
    setScanSubmitting(true);
    try {
      if (scanMode === 'IN') {
        const qrData = `${scanEvent.itemCode}|${scanQty}`;
        await inventoryAPI.inward({ qrData });

        // ✅ Specific success message for IN
        playBeep('success');
        toast.success(
          `Product Added Successfully — +${scanQty} ${scanEvent.uom} of ${scanEvent.itemName}`,
          { duration: 3000 }
        );
      } else {
        await inventoryAPI.issue({
          itemCode: scanEvent.itemCode,
          quantity: scanQty,
          remarks: 'Issued via global QR scan',
        });

        // ✅ Specific success message for OUT
        playBeep('success');
        toast.success(
          `Product Removed Successfully — −${scanQty} ${scanEvent.uom} of ${scanEvent.itemName}`,
          { duration: 3000 }
        );
      }
      setScanEvent(null);
    } catch (err) {
      // ❌ Failure — no beep, specific error message
      playBeep('error');
      toast.error(err.response?.data?.message || err.message || 'Scan Failed', {
        duration: 3000,
      });
    }
    setScanSubmitting(false);
  };

  if (!scanEvent) return null;

  return (
    <div className="scan-popup-overlay" onClick={() => setScanEvent(null)}>
      <div className="scan-popup" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="scan-popup-header">
          <div className="scan-popup-icon">
            <HiOutlineQrcode />
          </div>
          <div>
            <h2 className="scan-popup-title">Waiting for approval</h2>
            <p className="scan-popup-sub">Product Scanned by {scanEvent.scannedBy}</p>
          </div>
          <button className="btn-ghost scan-popup-close" onClick={() => setScanEvent(null)}>
            <HiOutlineX size={20} />
          </button>
        </div>

        {/* Item Info */}
        <div className="scan-item-info">
          <div className="scan-info-row">
            <span className="scan-info-label">Item Code</span>
            <span className="scan-info-value text-accent font-bold">{scanEvent.itemCode}</span>
          </div>
          <div className="scan-info-row">
            <span className="scan-info-label">Item Name</span>
            <span className="scan-info-value font-semibold">{scanEvent.itemName}</span>
          </div>
          <div className="scan-info-row">
            <span className="scan-info-label">Current Stock</span>
            <span className="scan-info-value">{scanEvent.currentStock} {scanEvent.uom}</span>
          </div>
          <div className="scan-info-row">
            <span className="scan-info-label">Default Qty</span>
            <span className="scan-info-value">{scanEvent.packQty} {scanEvent.uom}</span>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="scan-mode-toggle">
          <button
            className={`scan-mode-btn ${scanMode === 'IN' ? 'active-in' : ''}`}
            onClick={() => setScanMode('IN')}
          >
            <HiOutlineArrowDown /> Inward (IN)
          </button>
          <button
            className={`scan-mode-btn ${scanMode === 'OUT' ? 'active-out' : ''}`}
            onClick={() => setScanMode('OUT')}
          >
            <HiOutlineArrowUp /> Issue (OUT)
          </button>
        </div>

        {/* Quantity Input */}
        <div className="form-group" style={{ margin: '1rem 0 0' }}>
          <label className="form-label">Quantity ({scanEvent.uom})</label>
          <input
            type="number"
            className="form-control"
            value={scanQty}
            min={1}
            max={scanMode === 'OUT' ? scanEvent.currentStock : undefined}
            onChange={(e) => setScanQty(Number(e.target.value))}
            style={{ fontSize: '1.1rem', fontWeight: 700 }}
            autoFocus
          />
          {scanMode === 'OUT' && scanQty > scanEvent.currentStock && (
            <p className="form-error">⚠ Exceeds current stock ({scanEvent.currentStock})</p>
          )}
        </div>

        {/* Actions */}
        <div className="scan-popup-actions">
          <button className="btn btn-secondary" onClick={() => setScanEvent(null)}>
            Cancel
          </button>
          <button
            className={`btn ${scanMode === 'IN' ? 'btn-success' : 'btn-warning'}`}
            onClick={handleScanConfirm}
            disabled={
              scanSubmitting ||
              scanQty <= 0 ||
              (scanMode === 'OUT' && scanQty > scanEvent.currentStock)
            }
          >
            {scanSubmitting ? 'Processing...' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GlobalScanPopup; 