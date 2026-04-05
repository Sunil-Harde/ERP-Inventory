import { useState, useEffect } from 'react';
import { auditAPI } from '../../services/api';
import { HiOutlineClipboardList, HiOutlineSearch } from 'react-icons/hi';
import toast from 'react-hot-toast';

const Audit = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadLogs(); }, [page, action]);

  const loadLogs = async () => {
    try {
      const params = new URLSearchParams({ page, limit: 25 });
      if (action) params.set('action', action);
      const res = await auditAPI.logs(params.toString());
      setLogs(res.data);
      setTotal(res.total);
      setPages(res.pages);
    } catch (err) {
      toast.error('Failed to load audit logs');
    }
    setLoading(false);
  };

  const formatDate = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  const actionBadge = (a) => {
    if (a.includes('CREATED') || a.includes('REGISTERED')) return 'badge-info';
    if (a.includes('APPROVED') || a.includes('LOGIN')) return 'badge-success';
    if (a.includes('REJECTED') || a.includes('DEACTIVATED')) return 'badge-danger';
    if (a.includes('STOCK_IN')) return 'badge-success';
    if (a.includes('STOCK_OUT') || a.includes('ISSUED')) return 'badge-warning';
    return 'badge-neutral';
  };

  const actions = [
    'USER_REGISTERED', 'USER_LOGIN', 'USER_UPDATED', 'USER_DEACTIVATED', 'PASSWORD_CHANGED',
    'ITEM_CREATED', 'ITEM_UPDATED', 'STOCK_IN', 'STOCK_OUT',
    'PO_CREATED', 'PO_UPDATED', 'PO_RECEIVED',
    'QC_APPROVED', 'QC_REJECTED',
    'RND_REQUEST_CREATED', 'RND_REQUEST_APPROVED', 'RND_REQUEST_REJECTED', 'RND_MATERIAL_ISSUED',
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Audit Logs</h1>
        <span className="text-muted">{total} entries</span>
      </div>

      <div className="filter-bar">
        <select className="form-control" style={{ width: 220 }} value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
          <option value="">All Actions</option>
          {actions.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="loading-page"><div className="spinner" /></div>
      ) : logs.length === 0 ? (
        <div className="empty-state">
          <HiOutlineClipboardList className="empty-state-icon" />
          <h3>No audit logs</h3>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Item Code</th>
                  <th>Quantity</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td className="text-sm text-muted" style={{ whiteSpace: 'nowrap' }}>{formatDate(log.createdAt)}</td>
                    <td><span className={`badge ${actionBadge(log.action)}`}>{log.action.replace(/_/g, ' ')}</span></td>
                    <td className="font-semibold">{log.userName || log.userId?.name || '—'}</td>
                    <td className="text-xs text-muted">{log.userRole || '—'}</td>
                    <td className="text-accent">{log.itemCode || '—'}</td>
                    <td>{log.quantity ?? '—'}</td>
                    <td className="text-xs text-muted truncate" style={{ maxWidth: 200 }}>
                      {log.details ? JSON.stringify(log.details).slice(0, 80) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
              {[...Array(Math.min(pages, 7))].map((_, i) => {
                const p = i + 1;
                return <button key={p} className={page === p ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>;
              })}
              <span className="pagination-info">of {pages}</span>
              <button disabled={page >= pages} onClick={() => setPage(page + 1)}>›</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Audit;
