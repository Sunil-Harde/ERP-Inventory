import { useState, useEffect } from 'react';
import { dashboardAPI } from '../../services/api';
import { HiOutlineChartBar, HiOutlineTrendingUp, HiOutlineUserGroup } from 'react-icons/hi';
import toast from 'react-hot-toast';
import './Analytics.css';

const Analytics = () => {
  const [deptUsage, setDeptUsage] = useState([]);
  const [staffActivity, setStaffActivity] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [predItemCode, setPredItemCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [predLoading, setPredLoading] = useState(false);

  useEffect(() => { loadAnalytics(); }, []);

  const loadAnalytics = async () => {
    try {
      const [deptRes, staffRes] = await Promise.all([
        dashboardAPI.departmentUsage('days=30'),
        dashboardAPI.staffActivity('days=30&limit=10'),
      ]);
      setDeptUsage(deptRes.data);
      setStaffActivity(staffRes.data);
    } catch (err) {
      toast.error('Failed to load analytics');
    }
    setLoading(false);
  };

  const loadPrediction = async () => {
    if (!predItemCode.trim()) return toast.error('Enter an item code');
    setPredLoading(true);
    try {
      const res = await dashboardAPI.prediction(predItemCode.trim());
      setPrediction(res.data);
    } catch (err) {
      toast.error(err.message);
    }
    setPredLoading(false);
  };

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  const maxDept = Math.max(...deptUsage.map(d => d.totalQuantity), 1);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Analytics</h1>
      </div>

      <div className="analytics-grid">
        {/* Department Usage */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><HiOutlineChartBar style={{ marginRight: 6, verticalAlign: 'middle' }} /> Department Usage (30 days)</span>
          </div>
          {deptUsage.length === 0 ? (
            <p className="text-muted text-sm">No data yet</p>
          ) : (
            <div className="dept-bars">
              {deptUsage.map((d, i) => (
                <div key={i} className="dept-bar-row">
                  <span className="dept-name">{d.department || 'Unknown'}</span>
                  <div className="dept-bar-track">
                    <div
                      className="dept-bar-fill"
                      style={{ width: `${(d.totalQuantity / maxDept) * 100}%` }}
                    />
                  </div>
                  <span className="dept-value">{d.totalQuantity}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Staff Activity */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><HiOutlineUserGroup style={{ marginRight: 6, verticalAlign: 'middle' }} /> Staff Activity (30 days)</span>
          </div>
          {staffActivity.length === 0 ? (
            <p className="text-muted text-sm">No data yet</p>
          ) : (
            <div className="table-container" style={{ border: 'none' }}>
              <table className="data-table">
                <thead>
                  <tr><th>Staff</th><th>Role</th><th>Actions</th><th>Last Active</th></tr>
                </thead>
                <tbody>
                  {staffActivity.map((s, i) => (
                    <tr key={i}>
                      <td className="font-semibold">{s.userName || '—'}</td>
                      <td className="text-xs text-muted">{s.userRole}</td>
                      <td><span className="font-bold text-accent">{s.actionCount}</span></td>
                      <td className="text-sm text-muted">{new Date(s.lastAction).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* AI Stock Prediction */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <span className="card-title"><HiOutlineTrendingUp style={{ marginRight: 6, verticalAlign: 'middle' }} /> AI Stock Prediction</span>
        </div>
        <div className="flex gap-2" style={{ marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <input
            className="form-control"
            style={{ width: 220 }}
            placeholder="Enter Item Code (e.g., RM-001)"
            value={predItemCode}
            onChange={(e) => setPredItemCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadPrediction()}
          />
          <button className="btn btn-primary" onClick={loadPrediction} disabled={predLoading}>
            {predLoading ? 'Analyzing...' : 'Predict'}
          </button>
        </div>

        {prediction && (
          <div className="prediction-results">
            <div className="prediction-header">
              <h3>{prediction.itemCode} — {prediction.itemName}</h3>
            </div>
            {!prediction.hasEnoughData ? (
              <p className="text-muted">{prediction.message}</p>
            ) : (
              <div className="prediction-grid">
                <div className="pred-card">
                  <span className="pred-label">Current Stock</span>
                  <span className="pred-value">{prediction.currentStock}</span>
                </div>
                <div className="pred-card">
                  <span className="pred-label">Daily Usage Rate</span>
                  <span className="pred-value">{prediction.dailyUsageRate}/day</span>
                </div>
                <div className="pred-card">
                  <span className="pred-label">Days Until Depletion</span>
                  <span className="pred-value" style={{ color: prediction.daysUntilDepletion < 14 ? 'var(--danger)' : 'var(--success)' }}>
                    {prediction.daysUntilDepletion ?? 'N/A'} days
                  </span>
                </div>
                <div className="pred-card">
                  <span className="pred-label">Depletion Date</span>
                  <span className="pred-value">{prediction.depletionDate || 'N/A'}</span>
                </div>
                <div className="pred-card">
                  <span className="pred-label">Suggested Reorder Qty</span>
                  <span className="pred-value text-accent">{prediction.suggestedReorderQty}</span>
                </div>
                <div className="pred-card">
                  <span className="pred-label">Reorder Point</span>
                  <span className="pred-value">{prediction.reorderPoint}</span>
                </div>
                <div className="pred-card">
                  <span className="pred-label">Usage Trend</span>
                  <span className={`pred-value ${prediction.trend === 'increasing' ? 'text-danger' : prediction.trend === 'decreasing' ? 'text-success' : ''}`}>
                    {prediction.trend?.charAt(0).toUpperCase() + prediction.trend?.slice(1)}
                  </span>
                </div>
                <div className="pred-card">
                  <span className="pred-label">Analysis Window</span>
                  <span className="pred-value">{prediction.analysisWindow} ({prediction.dataPoints} txns)</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
