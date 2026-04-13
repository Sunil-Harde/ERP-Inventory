import { useState, useEffect } from 'react';
import { dashboardAPI } from '../../services/api';
import { HiOutlineChartBar, HiOutlineTrendingUp, HiOutlineUserGroup } from 'react-icons/hi';
import toast from 'react-hot-toast';

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
    } finally {
      setLoading(false);
    }
  };

  const loadPrediction = async () => {
    if (!predItemCode.trim()) return toast.error('Enter an item code');
    setPredLoading(true);
    try {
      const res = await dashboardAPI.prediction(predItemCode.trim());
      setPrediction(res.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPredLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh] flex-col gap-4">
      <div className="w-11 h-11 border-[3px] border-[var(--border-color)] border-t-[var(--primary-500)] rounded-full animate-[spin_0.8s_linear_infinite]" />
    </div>
  );

  const maxDept = Math.max(...deptUsage.map(d => d.totalQuantity), 1);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-[fadeUp_0.35s_ease] relative z-0">

      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Analytics</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Department Usage */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[var(--radius-lg)] p-5 md:p-6 backdrop-blur-md transition-all hover:border-[var(--border-hover)]">
          <div className="flex justify-between items-center mb-5 pb-4 border-b border-[var(--border-color)]">
            <span className="text-[1.1rem] font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <HiOutlineChartBar className="text-[var(--primary-400)]" size={20} />
              Department Usage (30 days)
            </span>
          </div>

          {deptUsage.length === 0 ? (
            <p className="text-[var(--text-muted)] text-sm">No data yet</p>
          ) : (
            <div className="flex flex-col gap-3">
              {deptUsage.map((d, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[0.8rem] font-medium text-[var(--text-secondary)] w-20 capitalize shrink-0 truncate" title={d.department || 'Unknown'}>
                    {d.department || 'Unknown'}
                  </span>
                  <div className="flex-1 h-6 bg-[var(--bg-tertiary)] rounded-md overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--primary-600)] to-[var(--accent-500)] rounded-md transition-all duration-[800ms] ease-out min-w-[4px]"
                      style={{ width: `${(d.totalQuantity / maxDept) * 100}%` }}
                    />
                  </div>
                  <span className="text-[0.85rem] font-bold text-[var(--text-primary)] w-12 text-right">
                    {d.totalQuantity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Staff Activity */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[var(--radius-lg)] p-5 md:p-6 backdrop-blur-md transition-all hover:border-[var(--border-hover)]">
          <div className="flex justify-between items-center mb-5 pb-4 border-b border-[var(--border-color)]">
            <span className="text-[1.1rem] font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <HiOutlineUserGroup className="text-[var(--accent-400)]" size={20} />
              Staff Activity (30 days)
            </span>
          </div>

          {staffActivity.length === 0 ? (
            <p className="text-[var(--text-muted)] text-sm">No data yet</p>
          ) : (
            <div className="border border-[var(--border-color)] rounded-[var(--radius-md)] overflow-hidden overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap text-[0.875rem]">
                <thead className="bg-[var(--bg-tertiary)]">
                  <tr>
                    <th className="px-4 py-3 border-b border-[var(--border-color)] text-[0.72rem] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.05em]">Staff</th>
                    <th className="px-4 py-3 border-b border-[var(--border-color)] text-[0.72rem] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.05em]">Role</th>
                    <th className="px-4 py-3 border-b border-[var(--border-color)] text-[0.72rem] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.05em]">Actions</th>
                    <th className="px-4 py-3 border-b border-[var(--border-color)] text-[0.72rem] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.05em]">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {staffActivity.map((s, i) => (
                    <tr key={i} className="hover:bg-[var(--bg-glass)] transition-colors border-b border-[var(--border-color)] last:border-none">
                      <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)] align-middle text-[var(--text-primary)] px-4 py-3 align-middle text-[var(--text-primary)] font-semibold">{s.userName || '—'}</td>
                      <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)] align-middle text-[var(--text-primary)] px-4 py-3 align-middle text-[0.75rem] text-[var(--text-[var(--text-muted)])]">{s.userRole}</td>
                      <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)] align-middle text-[var(--text-primary)] px-4 py-3 align-middle"><span className="font-bold text-[var(--text-accent)]">{s.actionCount}</span></td>
                      <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)] align-middle text-[var(--text-primary)] px-4 py-3 align-middle text-sm text-[var(--text-[var(--text-muted)])]">{new Date(s.lastAction).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* AI Stock Prediction */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[var(--radius-lg)] p-5 md:p-6 backdrop-blur-md transition-all hover:border-[var(--border-hover)] mt-6">
        <div className="flex justify-between items-center mb-5 pb-4 border-b border-[var(--border-color)]">
          <span className="text-[1.1rem] font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <HiOutlineTrendingUp className="text-[var(--warning)]" size={20} />
            AI Stock Prediction
          </span>
        </div>

        <div className="flex flex-wrap gap-3 mb-6 relative z-10">
          <input
            className="w-full sm:w-[260px] px-3.5 py-2.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-[var(--radius-sm)] text-[0.9rem] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary-500)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] focus:bg-[rgba(255,255,255,0.08)] outline-none transition-all"
            placeholder="Enter Item Code (e.g., RM-001)"
            value={predItemCode}
            onChange={(e) => setPredItemCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadPrediction()}
          />
          <button
            type="button"
            className="inline-flex items-center cursor-pointer justify-center px-6 py-2.5 bg-gradient-to-br from-[var(--primary-600)] to-[var(--primary-500)] hover:shadow-[0_4px_15px_rgba(99,102,241,0.3)] hover:-translate-y-[1px] text-white text-[0.875rem] font-medium rounded-[var(--radius-sm)] border border-[var(--primary-500)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={loadPrediction}
            disabled={predLoading}
          >
            {predLoading ? 'Analyzing...' : 'Predict'}
          </button>
        </div>

        {prediction && (
          <div className="animate-[fadeUp_0.3s_ease]">
            <div className="mb-5">
              <h3 className="text-[1.1rem] font-bold text-[var(--text-primary)]">
                {prediction.itemCode} — {prediction.itemName}
              </h3>
            </div>

            {!prediction.hasEnoughData ? (
              <p className="text-[var(--text-muted)] p-4 bg-[var(--bg-tertiary)] rounded-[var(--radius-md)] border border-[var(--border-color)]">
                {prediction.message}
              </p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3.5">

                <div className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-[var(--radius-md)] p-4 flex flex-col gap-1.5 transition-colors hover:border-[var(--primary-500)]">
                  <span className="text-[0.7rem] uppercase tracking-[0.05em] text-[var(--text-muted)] font-medium">Current Stock</span>
                  <span className="text-[1.1rem] font-bold text-[var(--text-primary)]">{prediction.currentStock}</span>
                </div>

                <div className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-[var(--radius-md)] p-4 flex flex-col gap-1.5 transition-colors hover:border-[var(--primary-500)]">
                  <span className="text-[0.7rem] uppercase tracking-[0.05em] text-[var(--text-muted)] font-medium">Daily Usage Rate</span>
                  <span className="text-[1.1rem] font-bold text-[var(--text-primary)]">{prediction.dailyUsageRate}/day</span>
                </div>

                <div className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-[var(--radius-md)] p-4 flex flex-col gap-1.5 transition-colors hover:border-[var(--primary-500)]">
                  <span className="text-[0.7rem] uppercase tracking-[0.05em] text-[var(--text-muted)] font-medium">Days Until Depletion</span>
                  <span className={`text-[1.1rem] font-bold ${prediction.daysUntilDepletion < 14 ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>
                    {prediction.daysUntilDepletion ?? 'N/A'} days
                  </span>
                </div>

                <div className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-[var(--radius-md)] p-4 flex flex-col gap-1.5 transition-colors hover:border-[var(--primary-500)]">
                  <span className="text-[0.7rem] uppercasFe tracking-[0.05em] text-[var(--text-muted)] font-medium">Depletion Date</span>
                  <span className="text-[1.1rem] font-bold text-[var(--text-primary)]">{prediction.depletionDate || 'N/A'}</span>
                </div>

                <div className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-[var(--radius-md)] p-4 flex flex-col gap-1.5 transition-colors hover:border-[var(--primary-500)]">
                  <span className="text-[0.7rem] uppercase tracking-[0.05em] text-[var(--text-muted)] font-medium">Suggested Reorder</span>
                  <span className="text-[1.1rem] font-bold text-[var(--text-accent)]">{prediction.suggestedReorderQty}</span>
                </div>

                <div className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-[var(--radius-md)] p-4 flex flex-col gap-1.5 transition-colors hover:border-[var(--primary-500)]">
                  <span className="text-[0.7rem] uppercase tracking-[0.05em] text-[var(--text-muted)] font-medium">Reorder Point</span>
                  <span className="text-[1.1rem] font-bold text-[var(--text-primary)]">{prediction.reorderPoint}</span>
                </div>

                <div className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-[var(--radius-md)] p-4 flex flex-col gap-1.5 transition-colors hover:border-[var(--primary-500)]">
                  <span className="text-[0.7rem] uppercase tracking-[0.05em] text-[var(--text-muted)] font-medium">Usage Trend</span>
                  <span className={`text-[1.1rem] font-bold ${prediction.trend === 'increasing' ? 'text-[var(--danger)]' : prediction.trend === 'decreasing' ? 'text-[var(--success)]' : 'text-[var(--text-primary)]'}`}>
                    {prediction.trend?.charAt(0).toUpperCase() + prediction.trend?.slice(1)}
                  </span>
                </div>

                <div className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-[var(--radius-md)] p-4 flex flex-col gap-1.5 transition-colors hover:border-[var(--primary-500)]">
                  <span className="text-[0.7rem] uppercase tracking-[0.05em] text-[var(--text-muted)] font-medium">Analysis Window</span>
                  <span className="text-[1.1rem] font-bold text-[var(--text-primary)] text-sm">
                    {prediction.analysisWindow} <span className="text-xs font-normal text-[var(--text-muted)]">({prediction.dataPoints} txns)</span>
                  </span>
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