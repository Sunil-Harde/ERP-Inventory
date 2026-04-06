import { useState, useEffect, useCallback, useMemo } from 'react';
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

const Dashboard = () => {
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const [stats, setStats] = useState(null);
  const [topItems, setTopItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Scan popup state
  const [scanEvent, setScanEvent] = useState(null);
  const [scanMode, setScanMode] = useState('IN');
  const [scanQty, setScanQty] = useState(1);
  const [scanSubmitting, setScanSubmitting] = useState(false);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [statsRes, topRes] = await Promise.all([
        dashboardAPI.stats(),
        dashboardAPI.topItems('days=30&limit=5'),
      ]);
      setStats(statsRes.data);
      setTopItems(topRes.data);
    } catch (err) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false); 
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // ── Socket listener for qr_scanned ──
  useEffect(() => {
    if (!socket) return;

    const handleQRScan = (payload) => {
      setScanEvent(payload);
      setScanQty(payload.packQty || 1);
      setScanMode('IN');
    };

    socket.on('qr_scanned', handleQRScan);

    return () => {
      socket.off('qr_scanned', handleQRScan);
    };
  }, [socket]);

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
      loadDashboard(true);
    } catch (err) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setScanSubmitting(false);
    }
  };

  const statCards = useMemo(() => [
    { label: 'Total Items', value: stats?.totalItems || 0, icon: <HiOutlineCube />, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)' },
    { label: 'Low Stock Alerts', value: stats?.lowStockCount || 0, icon: <HiOutlineExclamationCircle />, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
    { label: 'Recent Transactions', value: stats?.recentTransactions || 0, icon: <HiOutlineSwitchHorizontal />, color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.12)' },
    { label: 'Pending POs', value: stats?.pendingPurchaseOrders || 0, icon: <HiOutlineShoppingCart />, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
    { label: 'Pending QC', value: stats?.pendingQualityChecks || 0, icon: <HiOutlineShieldCheck />, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)' },
    { label: 'Pending R&D', value: stats?.pendingRnDRequests || 0, icon: <HiOutlineBeaker />, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
    { label: 'Active Users', value: stats?.activeUsers || 0, icon: <HiOutlineUsers />, color: '#a855f7', bg: 'rgba(168, 85, 247, 0.12)' },
    { label: 'Total Stock', value: stats?.stockSummary?.totalStock || 0, icon: <HiOutlineTrendingUp />, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)' },
  ], [stats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      
      {/* Page Header */}
      <div className="flex items-center justify-between ">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white ">Dashboard</h1>
        
        {/* Socket connection indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <span 
            className={`w-2 h-2 rounded-full shrink-0 ${
              connected 
                ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)] animate-pulse' 
                : 'bg-gray-400'
            }`} 
          />
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
            {connected ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statCards.map((card) => (
          <div key={card.label} className="flex items-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center text-xl shrink-0 mr-4" 
              style={{ background: card.bg, color: card.color }}
            >
              {card.icon}
            </div>
            <div className="flex flex-col">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {card.value.toLocaleString()}
              </div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                {card.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Top Used Items */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Top Used Items (30 days)</h2>
        </div>
        
        {topItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <p>No transaction data yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                  <th className="px-6 py-3 border-b border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">#</th>
                  <th className="px-6 py-3 border-b border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Item Code</th>
                  <th className="px-6 py-3 border-b border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Item Name</th>
                  <th className="px-6 py-3 border-b border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Used</th>
                  <th className="px-6 py-3 border-b border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Transactions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {topItems.map((item, i) => (
                  <tr key={item._id || i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{i + 1}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-indigo-600 dark:text-indigo-400">{item._id}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200">{item.itemName || '—'}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">{item.totalQuantity}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{item.transactionCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── QR Scan Popup Modal ── */}
      {scanEvent && (
        <div 
          className="fixed inset-0 bg-black/65 backdrop-blur-sm flex items-center justify-center z-[2000] p-6 animate-[fadeIn_0.2s_ease]" 
          onClick={() => setScanEvent(null)}
        >
          <div 
            className="bg-white dark:bg-gray-900 border border-indigo-500/40 rounded-2xl w-full max-w-[460px] p-7 shadow-[0_0_40px_rgba(99,102,241,0.2),_0_10px_15px_-3px_rgba(0,0,0,0.1)] transition-transform duration-300 scale-100" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-gray-200 dark:border-gray-800">
              <div className="w-11 h-11 bg-indigo-500/15 rounded-md flex items-center justify-center text-2xl text-indigo-500 shrink-0">
                <HiOutlineQrcode />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 m-0 leading-tight">QR Scan Detected</h2>
                <p className="text-xs text-gray-500 mt-0.5 m-0">Scanned by {scanEvent.scannedBy}</p>
              </div>
              <button 
                className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors bg-transparent border-none p-1 cursor-pointer" 
                onClick={() => setScanEvent(null)}
              >
                <HiOutlineX size={20} />
              </button>
            </div>

            {/* Item Info */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-5 flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-gray-400 text-[0.78rem] uppercase tracking-wider font-medium">Item Code</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">{scanEvent.itemCode}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-gray-400 text-[0.78rem] uppercase tracking-wider font-medium">Item Name</span>
                <span className="text-gray-900 dark:text-gray-100 font-semibold">{scanEvent.itemName}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-gray-400 text-[0.78rem] uppercase tracking-wider font-medium">Current Stock</span>
                <span className="text-gray-900 dark:text-gray-100">{scanEvent.currentStock} {scanEvent.uom}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-gray-400 text-[0.78rem] uppercase tracking-wider font-medium">QR Pack Qty</span>
                <span className="text-gray-900 dark:text-gray-100">{scanEvent.packQty} {scanEvent.uom}</span>
              </div>
            </div>

            {/* Mode Toggle */}
            <div className="grid grid-cols-2 gap-2 bg-gray-50 dark:bg-gray-800/80 rounded-lg p-1.5 mb-5">
              <button
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded text-sm font-semibold transition-all cursor-pointer ${
                  scanMode === 'IN' 
                    ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-[0_2px_10px_rgba(34,197,94,0.3)]' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 bg-transparent'
                }`}
                onClick={() => setScanMode('IN')}
              >
                <HiOutlineArrowDown /> Inward (IN)
              </button>
              <button
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded text-sm font-semibold transition-all cursor-pointer ${
                  scanMode === 'OUT' 
                    ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-[0_2px_10px_rgba(245,158,11,0.3)]' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 bg-transparent'
                }`}
                onClick={() => setScanMode('OUT')}
              >
                <HiOutlineArrowUp /> Issue (OUT)
              </button>
            </div>

            {/* Quantity Input */}
            <div className="flex flex-col gap-1.5 mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Quantity ({scanEvent.uom})
              </label>
              <input
                type="number"
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                value={scanQty}
                min={1}
                max={scanMode === 'OUT' ? scanEvent.currentStock : undefined}
                onChange={(e) => setScanQty(Number(e.target.value))}
                autoFocus
              />
              {scanMode === 'OUT' && scanQty > scanEvent.currentStock && (
                <p className="text-sm text-red-500 font-medium mt-1">
                  ⚠ Exceeds current stock ({scanEvent.currentStock})
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-gray-200 dark:border-gray-800">
              <button 
                className="px-4 py-2 rounded-lg font-medium text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors" 
                onClick={() => setScanEvent(null)}
              >
                Cancel
              </button>
              <button
                className={`px-4 py-2 rounded-lg font-medium text-sm text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  scanMode === 'IN' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
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