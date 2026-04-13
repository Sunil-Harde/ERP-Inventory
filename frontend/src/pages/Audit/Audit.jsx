import { useState, useEffect } from 'react';
import { auditAPI } from '../../services/api';
import DetailModal from '../../components/DetailModal';
import { HiOutlineClipboardList, HiOutlineSearch } from 'react-icons/hi';
import toast from 'react-hot-toast';

const Audit = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(null);

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
    if (a.includes('CREATED') || a.includes('REGISTERED')) return 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.72rem] font-semibold uppercase tracking-[0.03em] whitespace-nowrap bg-[rgba(59,130,246,0.1)] text-[#3b82f6] border border-[rgba(59,130,246,0.2)]';
    if (a.includes('APPROVED') || a.includes('LOGIN')) return 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.72rem] font-semibold uppercase tracking-[0.03em] whitespace-nowrap bg-[rgba(34,197,94,0.1)] text-[#22c55e] border border-[rgba(34,197,94,0.2)]';
    if (a.includes('REJECTED') || a.includes('DEACTIVATED')) return 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.72rem] font-semibold uppercase tracking-[0.03em] whitespace-nowrap bg-[rgba(239,68,68,0.1)] text-[#ef4444] border border-[rgba(239,68,68,0.2)]';
    if (a.includes('STOCK_IN')) return 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.72rem] font-semibold uppercase tracking-[0.03em] whitespace-nowrap bg-[rgba(34,197,94,0.1)] text-[#22c55e] border border-[rgba(34,197,94,0.2)]';
    if (a.includes('STOCK_OUT') || a.includes('ISSUED')) return 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.72rem] font-semibold uppercase tracking-[0.03em] whitespace-nowrap bg-[rgba(245,158,11,0.1)] text-[#f59e0b] border border-[rgba(245,158,11,0.2)]';
    return 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.72rem] font-semibold uppercase tracking-[0.03em] whitespace-nowrap bg-[rgba(148,163,184,0.1)] text-[var(--text-secondary)] border border-[rgba(148,163,184,0.15)]';
  };

  const actions = [
    'USER_REGISTERED', 'USER_LOGIN', 'USER_UPDATED', 'USER_DEACTIVATED', 'PASSWORD_CHANGED',
    'ITEM_CREATED', 'ITEM_UPDATED', 'STOCK_IN', 'STOCK_OUT',
    'PO_CREATED', 'PO_UPDATED', 'PO_RECEIVED',
    'QC_APPROVED', 'QC_REJECTED',
    'RND_REQUEST_CREATED', 'RND_REQUEST_APPROVED', 'RND_REQUEST_REJECTED', 'RND_MATERIAL_ISSUED',
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-[fadeUp_0.35s_ease] relative z-0">
      <div className="flex justify-between items-center mb-7 flex-wrap gap-4">
        <h1 className="text-[1.6rem] font-bold bg-clip-text text-transparent bg-gradient-to-br from-[var(--text-primary)] to-[var(--primary-300)] tracking-[-0.02em]">Audit Logs</h1>
        <span className="text-muted">{total} entries</span>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <select className="w-full px-[0.9rem] py-[0.65rem] bg-[var(--bg-input)] border border-[var(--border-color)] rounded-[var(--radius-sm)] text-[0.9rem] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary-500)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] focus:bg-[rgba(255,255,255,0.08)] outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed" style={{ width: 220 }} value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
          <option className="bg-[var(--bg-tertiary)] " value="">All Actions</option>
          {actions.map(a => <option className="bg-[var(--bg-tertiary)] " key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4"><div className="w-[44px] h-[44px] border-[3px] border-[var(--border-color)] border-t-[var(--primary-500)] rounded-full animate-[spin_0.8s_linear_infinite]" /></div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-8 text-[var(--text-muted)] text-center">
          <HiOutlineClipboardList className="text-[3.5rem] mb-4 opacity-40" />
          <h3 className="text-[1.15rem] font-semibold text-[var(--text-secondary)] mb-1.5">No audit logs</h3>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto border border-[var(--border-color)] rounded-[var(--radius-lg)] bg-[var(--bg-card)]">
            <table className="w-full text-left border-collapse text-[0.875rem]">
              <thead className="bg-[var(--bg-tertiary)] sticky top-0 z-10">
                <tr>
                  <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)] whitespace-nowrap">Timestamp</th>
                  <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)] whitespace-nowrap">Action</th>
                  <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)] whitespace-nowrap">User</th>
                  <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)] whitespace-nowrap">Role</th>
                  <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)] whitespace-nowrap">Item Code</th>
                  <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)] whitespace-nowrap">Quantity</th>
                  <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)] whitespace-nowrap">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr className="hover:bg-[var(--bg-glass)] transition-colors cursor-pointer" key={log._id} onClick={() => setShowDetail(log)}>
                    <td className="text-sm text-muted" style={{ whiteSpace: 'nowrap' }}>{formatDate(log.createdAt)}</td>
                    <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)] align-middle text-[var(--text-primary)] px-4 py-[0.8rem] border-b border-[var(--border-color)] text-[var(--text-primary)] align-middle"><span className={`actionBadge(log.action)}`}>{log.action.replace(/_/g, ' ')}</span></td>
                    <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)] align-middle text-[var(--text-primary)] font-semibold">{log.userName || log.userId?.name || '—'}</td>
                    <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)] align-middle text-[var(--text-primary)] text-xs text-[var(--text-muted)]">{log.userRole || '—'}</td>
                    <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)] align-middle text-[var(--text-primary)] text-[var(--text-accent)]">{log.itemCode || '—'}</td>
                    <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)] align-middle text-[var(--text-primary)] px-4 py-[0.8rem] border-b border-[var(--border-color)] text-[var(--text-primary)] align-middle">{log.quantity ?? '—'}</td>
                    <td className="text-xs text-muted truncate" style={{ maxWidth: 200 }}>
                      {log.details ? JSON.stringify(log.details).slice(0, 80) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
              {[...Array(Math.min(pages, 7))].map((_, i) => {
                const p = i + 1;
                return <button key={p} className={page === p ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>;
              })}
              <span className="text-[0.8rem] text-[var(--text-muted)] mx-2">of {pages}</span>
              <button disabled={page >= pages} onClick={() => setPage(page + 1)}>›</button>
            </div>
          )}
        </>
      )}

      <DetailModal
        isOpen={!!showDetail}
        onClose={() => setShowDetail(null)}
        title="Audit Log Details"
        data={showDetail}
        fields={[
          { label: 'Timestamp', key: 'createdAt', render: (v) => v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'medium' }) : '—' },
          { label: 'Action', key: 'action', render: (v) => v?.replace(/_/g, ' ') || '—' },
          { label: 'User', key: 'userName', render: (v, d) => v || d.userId?.name || '—' },
          { label: 'Role', key: 'userRole', render: (v) => v || '—' },
          { label: 'Item Code', key: 'itemCode', render: (v) => v || '—' },
          { label: 'Quantity', key: 'quantity', render: (v) => v ?? '—' },
          { label: 'Details', key: 'details', render: (v) => v ? <pre style={{ fontSize: '0.78rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0, color: 'var(--text-secondary)' }}>{JSON.stringify(v, null, 2)}</pre> : '—' },
        ]}
      />
    </div>
  );
};

export default Audit;
