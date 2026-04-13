import { useState, useEffect, useRef } from 'react';
import { transactionsAPI, inventoryAPI } from '../../services/api';
import { HiOutlineSearch, HiOutlineSwitchHorizontal } from 'react-icons/hi';
import DetailModal from '../../components/DetailModal';
import toast from 'react-hot-toast';

// ── Inline item-search hook for suggestions ──────────────────────────────────
function useItemSearch(query) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await inventoryAPI.list(`search=${encodeURIComponent(query)}&limit=8`);
        setResults(Array.isArray(res) ? res : (res.data || []));
      } catch { setResults([]); }
      setLoading(false);
    }, 250);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  return { results, loading };
}

const Transactions = () => {
  const [txns, setTxns] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [type, setType] = useState('');
  
  // States for live search and suggestions
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(null);
  
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchWrapRef = useRef(null);
  
  // Only fetch suggestions if the dropdown is meant to be shown
  const { results: suggestions, loading: loadingSuggestions } = useItemSearch(showSuggestions ? searchInput : '');

  // Close suggestions when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Debounce effect for Search ──
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput.length >= 2 || searchInput.length === 0) {
        if (activeSearch !== searchInput) {
          setActiveSearch(searchInput.toUpperCase());
          setPage(1);
        }
      }
    }, 400); 
    return () => clearTimeout(timer);
  }, [searchInput, activeSearch]);

  // Load transactions whenever page, type, or the debounced search changes
  useEffect(() => {
    loadTxns();
  }, [page, type, activeSearch]);

  const loadTxns = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (type) params.set('type', type);
      if (activeSearch) params.set('search', activeSearch); 
      
      const res = await transactionsAPI.list(params.toString());
      setTxns(res.data);
      setTotal(res.total);
      setPages(res.pages);
    } catch (err) {
      toast.error('Failed to load transactions');
    }
    setLoading(false);
  };

  const handleSelectSuggestion = (item) => {
    setSearchInput(item.itemCode);
    setActiveSearch(item.itemCode);
    setShowSuggestions(false);
    setPage(1);
  };

  const formatDate = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-[fadeUp_0.35s_ease] relative z-0">
      
      <div className="flex justify-between items-center mb-7 flex-wrap gap-4">
        <h1 className="text-[1.6rem] font-bold bg-clip-text text-transparent bg-gradient-to-br from-[var(--text-primary)] to-[var(--primary-300)] tracking-[-0.02em]">Transactions</h1>
      </div>

      {/* ── Filters & Search ── */}
      <div className="flex gap-3 mb-6 flex-wrap items-center">
        
        {/* Search Wrapper with Ref for Outside Click Detection */}
        <div ref={searchWrapRef} className="relative flex-1 min-w-[220px]" style={{ maxWidth: 280, zIndex: 50 }}>
          <HiOutlineSearch className="absolute right-[0.85rem] top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-[1rem]" />
          <input 
            type="text" 
            className="w-full uppercase  pl-[2.2rem] pr-[0.9rem] py-[0.65rem] bg-[var(--bg-input)] border border-[var(--border-color)] rounded-[var(--radius-sm)] text-[0.9rem] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary-500)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] focus:bg-[rgba(255,255,255,0.08)] outline-none transition-all disabled:opacity-50" 
            placeholder="Type 2+ letters to search" 
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setShowSuggestions(true); // Show dropdown when typing
            }}
            onFocus={() => {
              if (searchInput.length >= 2) setShowSuggestions(true);
            }}
            autoComplete="off"
          />

          {/* Suggestions Dropdown */}
          {showSuggestions && (suggestions.length > 0 || loadingSuggestions) && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              background: 'var(--bg-card)', border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)', boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
              marginTop: 4, maxHeight: 220, overflowY: 'auto'
            }}>
              {loadingSuggestions && (
                <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ width: 14, height: 14, border: '2px solid var(--border-color)', borderTopColor: 'var(--primary-500)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  Searching…
                </div>
              )}
              {!loadingSuggestions && suggestions.map((item) => (
                <button
                  key={item._id || item.itemCode}
                  type="button"
                  onMouseDown={() => handleSelectSuggestion(item)} 
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '9px 14px', background: 'none', border: 'none',
                    cursor: 'pointer', textAlign: 'left', gap: 12,
                    borderBottom: '1px solid var(--border-color)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-400)' }}>{item.itemCode}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{item.itemName}</div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 7px',
                    borderRadius: 20, background: 'rgba(99,102,241,0.12)',
                    border: '1px solid rgba(99,102,241,0.25)', color: 'var(--primary-400)',
                  }}>{item.uom}</span>
                </button>
              ))}
              {!loadingSuggestions && suggestions.length === 0 && searchInput.length >= 2 && (
                <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)' }}>No items found</div>
              )}
            </div>
          )}
        </div>

        <select 
          className="w-full px-[0.9rem] py-[0.65rem] bg-[var(--bg-input)] border border-[var(--border-color)] rounded-[var(--radius-sm)] text-[0.9rem] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary-500)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] focus:bg-[rgba(255,255,255,0.08)] outline-none transition-all disabled:opacity-50" 
          style={{ width: 150 }} 
          value={type} 
          onChange={(e) => { setType(e.target.value); setPage(1); }}
        >
          <option className="bg-[var(--bg-tertiary)] " value="">All Types</option>
          <option className="bg-[var(--bg-tertiary)] " value="IN">IN</option>
          <option className="bg-[var(--bg-tertiary)] " value="OUT">OUT</option>
        </select>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4"><div className="w-[44px] h-[44px] border-[3px] border-[var(--border-color)] border-t-[var(--primary-500)] rounded-full animate-[spin_0.8s_linear_infinite]" /></div>
      ) : txns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-8 text-[var(--text-muted)] text-center">
          <HiOutlineSwitchHorizontal className="text-[3.5rem] mb-4 opacity-40" />
          <h3 className="text-[1.15rem] font-semibold text-[var(--text-secondary)] mb-1.5">No transactions found</h3>
          <p className="text-[0.85rem] max-w-[320px] mx-auto">Inventory movements will appear here</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto border border-[var(--border-color)] rounded-[var(--radius-lg)] bg-[var(--bg-card)]">
            <table className="w-full text-left border-collapse text-[0.875rem]">
              <thead className="bg-[var(--bg-tertiary)] sticky top-0 z-10">
                <tr>
                  <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)] whitespace-nowrap">Date</th>
                  <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)] whitespace-nowrap">Item Code</th>
                  <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)] whitespace-nowrap">Item Name</th>
                  <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)] whitespace-nowrap">Type</th>
                  <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)] whitespace-nowrap">Quantity</th>
                  <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)] whitespace-nowrap">Performed By</th>
                  <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)] whitespace-nowrap">Department</th>
                  <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)] whitespace-nowrap">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {txns.map((t) => (
                  <tr className="hover:bg-[var(--bg-glass)] transition-colors cursor-pointer" key={t._id} onClick={() => setShowDetail(t)}>
                    <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)] align-middle text-[var(--text-primary)] text-sm text-[var(--text-muted)]">{formatDate(t.createdAt)}</td>
                    <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)] align-middle text-[var(--text-primary)]"><span className="font-semibold text-[var(--primary-400)]">{t.itemCode}</span></td>
                    <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)] align-middle text-[var(--text-primary)]">{t.itemName || '—'}</td>
                    <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)] align-middle">
                      <span className={t.type === 'IN' 
                        ? 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.72rem] font-semibold uppercase tracking-[0.03em] whitespace-nowrap bg-[rgba(34,197,94,0.1)] text-[#22c55e] border border-[rgba(34,197,94,0.2)]' 
                        : 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.72rem] font-semibold uppercase tracking-[0.03em] whitespace-nowrap bg-[rgba(239,68,68,0.1)] text-[#ef4444] border border-[rgba(239,68,68,0.2)]'
                      }>
                        {t.type}
                      </span>
                    </td>
                    <td className={`px-4 py-[0.8rem] border-b border-[var(--border-color)] align-middle font-bold ${t.type === 'IN' ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                      {t.type === 'IN' ? '+' : '-'}{t.quantity}
                    </td>
                    <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)] align-middle text-[var(--text-primary)]">{t.performedBy?.name || '—'}</td>
                    <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)] align-middle text-[var(--text-primary)]">{t.department || '—'}</td>
                    <td className="text-sm text-[var(--text-muted)] truncate px-4 py-[0.8rem] border-b border-[var(--border-color)]" style={{ maxWidth: 200 }}>{t.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
              {[...Array(Math.min(pages, 5))].map((_, i) => {
                const p = i + 1;
                return <button key={p} className={page === p ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>;
              })}
              <span className="text-[0.8rem] text-[var(--text-muted)] mx-2">{total} total</span>
              <button disabled={page >= pages} onClick={() => setPage(page + 1)}>›</button>
            </div>
          )}
        </>
      )}

      <DetailModal
        isOpen={!!showDetail}
        onClose={() => setShowDetail(null)}
        title={`Transaction Details`}
        data={showDetail}
        fields={[
          { label: 'Date', key: 'createdAt', render: (v) => v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'medium' }) : '—' },
          { label: 'Item Code', key: 'itemCode' },
          { label: 'Item Name', key: 'itemName', render: (v) => v || '—' },
          { label: 'Type', key: 'type', render: (v) => <span style={{ fontWeight: 700, color: v === 'IN' ? '#22c55e' : '#ef4444' }}>{v}</span> },
          { label: 'Quantity', key: 'quantity', render: (v, d) => <span style={{ fontWeight: 700, color: d.type === 'IN' ? '#22c55e' : '#ef4444' }}>{d.type === 'IN' ? '+' : '-'}{v}</span> },
          { label: 'Performed By', key: 'performedBy.name', render: (v) => v || '—' },
          { label: 'Department', key: 'department', render: (v) => v || '—' },
          { label: 'Remarks', key: 'remarks', render: (v) => v || '—' },
        ]}
      />
    </div>
  );
};

export default Transactions;