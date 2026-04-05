import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { dashboardAPI, inventoryAPI } from '../../services/api';
import {
  HiOutlineCube, HiOutlineExclamationCircle, HiOutlineShoppingCart,
  HiOutlineShieldCheck, HiOutlineBeaker, HiOutlineUsers,
  HiOutlineSwitchHorizontal, HiOutlineTrendingUp, HiOutlineQrcode,
  HiOutlineArrowDown, HiOutlineArrowUp, HiOutlineX
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import Modal from '../../components/Modal';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const [stats, setStats] = useState(null);
  const [topItems, setTopItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Scan popup state
  const [scanEvent, setScanEvent] = useState(null);   // payload from socket
  const [scanMode, setScanMode] = useState('IN');      // IN or OUT
  const [scanQty, setScanQty] = useState(1);
  const [scanSubmitting, setScanSubmitting] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  // ── Socket listener for qr_scanned ──
  useEffect(() => {
    if (!socket) return;

    const handleQRScan = (payload) => {
      console.log('📦 QR Scan event received:', payload);
      setScanEvent(payload);
      setScanQty(payload.packQty || 1);
      setScanMode('IN');
    };

    socket.on('qr_scanned', handleQRScan);

    return () => {
      socket.off('qr_scanned', handleQRScan);
    };
  }, [socket]);

  const loadDashboard = async () => {
    try {
      const [statsRes, topRes] = await Promise.all([
        dashboardAPI.stats(),
        dashboardAPI.topItems('days=30&limit=5'),
      ]);
      setStats(statsRes.data);
      setTopItems(topRes.data);
    } catch (err) {
      toast.error('Failed to load dashboard');
    }
    setLoading(false);
  };

  const handleScanConfirm = async () => {
    if (!scanEvent || scanQty <= 0) return;
    setScanSubmitting(true);
    try {
      if (scanMode === 'IN') {
        const qrData = `${scanEvent.itemCode}|${scanQty}`;
        await inventoryAPI.inward({ qrData });
        toast.success(`✅ Inward: +${scanQty} ${scanEvent.uom} of ${scanEvent.itemName}`);
      } else {
        await inventoryAPI.issue({
          itemCode: scanEvent.itemCode,
          quantity: scanQty,
          remarks: 'Issued via QR scan',
        });
        toast.success(`📤 Issued: -${scanQty} ${scanEvent.uom} of ${scanEvent.itemName}`);
      }
      setScanEvent(null);
      loadDashboard(); // refresh stats
    } catch (err) {
      toast.error(err.message || 'Operation failed');
    }
    setScanSubmitting(false);
  };

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner" />
      </div>
    );
  }

  const statCards = [
    { label: 'Total Items', value: stats?.totalItems || 0, icon: <HiOutlineCube />, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)' },
    { label: 'Low Stock Alerts', value: stats?.lowStockCount || 0, icon: <HiOutlineExclamationCircle />, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
    { label: 'Recent Transactions', value: stats?.recentTransactions || 0, icon: <HiOutlineSwitchHorizontal />, color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.12)' },
    { label: 'Pending POs', value: stats?.pendingPurchaseOrders || 0, icon: <HiOutlineShoppingCart />, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
    { label: 'Pending QC', value: stats?.pendingQualityChecks || 0, icon: <HiOutlineShieldCheck />, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)' },
    { label: 'Pending R&D', value: stats?.pendingRnDRequests || 0, icon: <HiOutlineBeaker />, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
    { label: 'Active Users', value: stats?.activeUsers || 0, icon: <HiOutlineUsers />, color: '#a855f7', bg: 'rgba(168, 85, 247, 0.12)' },
    { label: 'Total Stock', value: stats?.stockSummary?.totalStock || 0, icon: <HiOutlineTrendingUp />, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)' },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Dashboard</h1>
        {/* Socket connection indicator */}
        <div className="socket-status">
          <span className={`socket-dot ${connected ? 'connected' : 'disconnected'}`} />
          <span className="socket-label">{connected ? 'Live' : 'Offline'}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {statCards.map((card, i) => (
          <div key={i} className="stat-card" style={{ '--stat-accent': card.color }}>
            <div className="stat-icon" style={{ background: card.bg, color: card.color }}>
              {card.icon}
            </div>
            <div className="stat-content">
              <div className="stat-value">{card.value.toLocaleString()}</div>
              <div className="stat-label">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Top Used Items */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Top Used Items (30 days)</span>
        </div>
        {topItems.length === 0 ? (
          <div className="empty-state">
            <p>No transaction data yet</p>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item Code</th>
                  <th>Item Name</th>
                  <th>Total Used</th>
                  <th>Transactions</th>
                </tr>
              </thead>
              <tbody>
                {topItems.map((item, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td><span className="font-semibold text-accent">{item._id}</span></td>
                    <td>{item.itemName || '—'}</td>
                    <td><span className="font-bold">{item.totalQuantity}</span></td>
                    <td>{item.transactionCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── QR Scan Popup Modal ── */}
      {scanEvent && (
        <div className="scan-popup-overlay" onClick={() => setScanEvent(null)}>
          <div className="scan-popup" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="scan-popup-header">
              <div className="scan-popup-icon">
                <HiOutlineQrcode />
              </div>
              <div>
                <h2 className="scan-popup-title">QR Scan Detected</h2>
                <p className="scan-popup-sub">Scanned by {scanEvent.scannedBy}</p>
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
                <span className="scan-info-label">QR Pack Qty</span>
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
                disabled={scanSubmitting || scanQty <= 0 || (scanMode === 'OUT' && scanQty > scanEvent.currentStock)}
              >
                {scanSubmitting
                  ? 'Processing...'
                  : scanMode === 'IN'
                  ? `✓ Confirm Inward +${scanQty}`
                  : `✓ Confirm Issue -${scanQty}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
