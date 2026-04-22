import { useState, useEffect, useRef } from 'react';
import { rndAPI, inventoryAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';
import {
  HiOutlinePlus, HiOutlineBeaker, HiOutlineTrash, HiOutlineChevronDown, HiOutlinePencilAlt, HiOutlineSave
} from 'react-icons/hi';
import toast from 'react-hot-toast';

// ── Inline item-search hook ───────────────────────────────────────────────────
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

function ItemCodeInput({ value, itemName, uom, onChange, onSelect }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const wrapRef = useRef(null);
  const { results, loading } = useItemSearch(query);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { setQuery(value); }, [value]);

  const handleInput = (e) => {
    const v = e.target.value.toUpperCase();
    setQuery(v);
    onChange('itemCode', v);
    onChange('itemName', '');
    onChange('uom', 'PCS');
    onChange('stock', null);
    setOpen(true);
  };

  const handleSelect = (item) => {
    setQuery(item.itemCode || item.sku);
    onSelect(item);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        className="w-full px-[0.9rem] py-[0.65rem] bg-[var(--bg-input)] border border-[var(--border-color)] rounded-[var(--radius-sm)] text-[0.9rem] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary-500)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] outline-none transition-all"
        placeholder="Code (min 2 letters)"
        value={query}
        onChange={handleInput}
        onFocus={() => query.length >= 2 && setOpen(true)}
        autoComplete="off"
        required
      />
      {open && (results.length > 0 || loading) && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999,
          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)', boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          marginTop: 4, maxHeight: 220, overflowY: 'auto',
        }}>
          {loading && (
            <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ width: 14, height: 14, border: '2px solid var(--border-color)', borderTopColor: 'var(--primary-500)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              Searching…
            </div>
          )}
          {!loading && results.map((item) => (
            <button
              key={item._id || item.itemCode || item.sku}
              type="button"
              onMouseDown={() => handleSelect(item)}
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
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-400)' }}>{item.itemCode || item.sku}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{item.itemName || item.partName}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 7px',
                  borderRadius: 20, background: 'rgba(99,102,241,0.12)',
                  border: '1px solid rgba(99,102,241,0.25)', color: 'var(--primary-400)',
                }}>{item.uom || item.unitOfMeasure}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Stock: {item.stock ?? item.currentStock ?? '—'}</span>
              </div>
            </button>
          ))}
          {!loading && results.length === 0 && (
            <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)' }}>No items found</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const EMPTY_ITEM = { itemCode: '', itemName: '', quantity: '', uom: 'PCS', stock: null };
const EMPTY_PRODUCED = { itemCode: '', itemName: '', quantity: 1, uom: 'PCS' };

const RnD = () => {
  const { hasRole } = useAuth();
  const [requests, setRequests] = useState([]);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [viewJob, setViewJob] = useState(null); // ✨ NEW: Holds the job clicked
  const [isEditing, setIsEditing] = useState(false); // ✨ NEW: Edit mode toggle

  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [form, setForm] = useState({ purpose: '', producedItem: { ...EMPTY_PRODUCED }, items: [{ ...EMPTY_ITEM }] });
  const [editForm, setEditForm] = useState({}); // ✨ NEW: Holds data while editing

  useEffect(() => { loadRequests(); }, [page, status]);

  const loadRequests = async () => {
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (status) params.set('status', status);
      const res = await rndAPI.listRequests(params.toString());
      setRequests(res.data);
    } catch (err) {
      toast.error('Failed to load requests');
    }
    setLoading(false);
  };

  // ── Form item helpers ──
  const addItem = () => setForm({ ...form, items: [...form.items, { ...EMPTY_ITEM }] });
  const removeItem = (index) => { if (form.items.length > 1) setForm({ ...form, items: form.items.filter((_, i) => i !== index) }); };
  const updateItem = (index, field, value) => {
    const items = [...form.items];
    items[index][field] = value;
    setForm({ ...form, items });
  };
  const selectItem = (index, inventoryItem) => {
    const items = [...form.items];
    items[index] = {
      ...items[index], itemCode: inventoryItem.itemCode || inventoryItem.sku, itemName: inventoryItem.itemName || inventoryItem.partName, uom: inventoryItem.uom || inventoryItem.unitOfMeasure || 'PCS', stock: inventoryItem.stock ?? inventoryItem.currentStock ?? 0
    };
    setForm({ ...form, items });
  };

  // ── Actions ──
  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        purpose: form.purpose || `Production of ${form.producedItem.itemName}`,
        producedItem: { ...form.producedItem, quantity: Number(form.producedItem.quantity), itemCode: form.producedItem.itemCode.toUpperCase() },
        consumedItems: form.items.map(i => ({ itemCode: i.itemCode, itemName: i.itemName, quantity: Number(i.quantity), uom: i.uom })),
        warehouseFrom: 'SHOP1', warehouseTo: 'SHOP2'
      };
      await rndAPI.createRequest(payload);
      toast.success('R&D recipe created successfully');
      setShowCreate(false);
      setForm({ purpose: '', producedItem: { ...EMPTY_PRODUCED }, items: [{ ...EMPTY_ITEM }] });
      loadRequests();
    } catch (err) { toast.error(err.message); }
    setSubmitting(false);
  };

  const handleRowClick = (job) => {
    setViewJob(job);
    setIsEditing(false);
    setEditForm({
      consumedItems: (job.consumedItems || job.items || []).map(i => ({ ...i }))
    });
  };

  // ✨ NEW: Submit edits to backend
  const handleSaveEdit = async () => {
    setSubmitting(true);
    try {
      // Send the updated quantities to the backend
      const payload = {
        consumedItems: editForm.consumedItems.map(i => ({ ...i, quantity: Number(i.quantity) }))
      };

      await rndAPI.updateBOM(viewJob._id, payload);
      toast.success('Recipe updated! Inventory adjusted automatically.');
      setViewJob(null);
      setIsEditing(false);
      loadRequests();
    } catch (err) {
      toast.error(err.message);
    }
    setSubmitting(false);
  };

  const statusBadge = (s) => {
    const map = {
      CREATED: 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.72rem] font-semibold uppercase tracking-[0.03em] whitespace-nowrap bg-[rgba(245,158,11,0.1)] text-[#f59e0b] border border-[rgba(245,158,11,0.2)]',
      PENDING: 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.72rem] font-semibold uppercase tracking-[0.03em] whitespace-nowrap bg-[rgba(245,158,11,0.1)] text-[#f59e0b] border border-[rgba(245,158,11,0.2)]',
      APPROVED: 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.72rem] font-semibold uppercase tracking-[0.03em] whitespace-nowrap bg-[rgba(59,130,246,0.1)] text-[#3b82f6] border border-[rgba(59,130,246,0.2)]',
      ISSUED: 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.72rem] font-semibold uppercase tracking-[0.03em] whitespace-nowrap bg-[rgba(34,197,94,0.1)] text-[#22c55e] border border-[rgba(34,197,94,0.2)]',
      REJECTED: 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.72rem] font-semibold uppercase tracking-[0.03em] whitespace-nowrap bg-[rgba(239,68,68,0.1)] text-[#ef4444] border border-[rgba(239,68,68,0.2)]'
    };
    return <span className={map[s] || ''}>{s || 'CREATED'}</span>;
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { dateStyle: 'medium' });
  const inp = "w-full px-[0.9rem] py-[0.65rem] bg-[var(--bg-input)] border border-[var(--border-color)] rounded-[var(--radius-sm)] text-[0.9rem] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary-500)] outline-none transition-all";

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-[fadeUp_0.35s_ease] relative z-0">

      {/* Header */}
      <div className="flex justify-between items-center mb-7 flex-wrap gap-4">
        <h1 className="text-[1.6rem] font-bold bg-clip-text text-transparent bg-gradient-to-br from-[var(--text-primary)] to-[var(--primary-300)] tracking-[-0.02em]">R&D Material Recipes</h1>
        {hasRole('ADMIN', 'STAFF_RND') && (
          <button className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium transition-all px-[1.25rem] py-[0.6rem] text-[0.875rem] bg-gradient-to-br from-[var(--primary-600)] to-[var(--primary-500)] text-white border border-[var(--primary-500)] hover:-translate-y-[1px] hover:shadow-[0_4px_15px_rgba(99,102,241,0.3)]" onClick={() => setShowCreate(true)}>
            <HiOutlinePlus /> New Recipe
          </button>
        )}
      </div>

      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <select className={inp} style={{ width: 180 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="CREATED">Created (Pending)</option>
          <option value="APPROVED">Approved</option>
          <option value="ISSUED">Issued</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4"><div className="w-[44px] h-[44px] border-[3px] border-[var(--border-color)] border-t-[var(--primary-500)] rounded-full animate-[spin_0.8s_linear_infinite]" /></div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-8 text-[var(--text-muted)] text-center">
          <HiOutlineBeaker className="text-[3.5rem] mb-4 opacity-40" />
          <h3 className="text-[1.15rem] font-semibold text-[var(--text-secondary)] mb-1.5">No R&D recipes</h3>
          <p className="text-[0.85rem] max-w-[320px] mx-auto">Material recipes from R&D will appear here</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-[var(--border-color)] rounded-[var(--radius-lg)] bg-[var(--bg-card)]">
          <table className="w-full text-left border-collapse text-[0.875rem]">
            <thead className="bg-[var(--bg-tertiary)] sticky top-0 z-10">
              <tr>
                <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)]">Job #</th>
                <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)]">Target Product</th>
                <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)]">Materials Needed</th>
                <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)]">Status</th>
                <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)]">Date</th>

                {
                  hasRole('ADMIN') && (
                    <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 text-center py-[0.85rem] border-b border-[var(--border-color)]">Action</th>

                  )
                }
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr className="hover:bg-[var(--bg-glass)] transition-colors cursor-pointer" key={req._id} onClick={() => handleRowClick(req)}>
                  <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)] align-middle"><span className="font-semibold text-[var(--primary-400)]">{req.requestNumber || req.bomNumber}</span></td>
                  <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)] truncate font-semibold" style={{ maxWidth: 200 }}>
                    {req.producedItem ? req.producedItem.itemName : req.purpose}
                  </td>
                  <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)] text-[var(--text-muted)]">{(req.consumedItems || req.items || []).length} items</td>
                  <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)]">{statusBadge(req.status)}</td>
                  <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)] text-sm text-[var(--text-muted)]">{formatDate(req.createdAt)}</td>


                  {!isEditing && (
                    <>
                      {/* <button className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium transition-all px-[1.25rem] py-[0.6rem] text-[0.875rem] bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--bg-card-hover)]" onClick={() => setViewJob(null)}>Close</button> */}
                      {/* Only ADMIN can see the edit button */}
                        {hasRole('ADMIN') && (
                      <td className="px-4 py-[0.8rem] text-center border-b border-[var(--border-color)] text-sm text-[var(--text-muted)] ">
                          <button className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium transition-all px-[1.25rem] py-[0.6rem] text-[0.875rem] bg-gradient-to-br from-[#f59e0b] to-[#d97706] text-white hover:shadow-lg" onClick={() => setIsEditing(true)}>
                            <HiOutlinePencilAlt /> Edit Quantities
                          </button>
                      </td>
                        )}
                    </>
                  ) }


                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── ✨ NEW: View & Edit Details Modal ── */}
      <Modal isOpen={!!viewJob} onClose={() => { setViewJob(null); setIsEditing(false); }} title={isEditing ? "Edit Recipe Quantities" : "Recipe Details"} wide
        footer={
          <>
            {!isEditing ? (
              <>
                <button className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium transition-all px-[1.25rem] py-[0.6rem] text-[0.875rem] bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--bg-card-hover)]" onClick={() => setViewJob(null)}>Close</button>
                {/* Only ADMIN can see the edit button */}
                {hasRole('ADMIN') && (
                  <button className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium transition-all px-[1.25rem] py-[0.6rem] text-[0.875rem] bg-gradient-to-br from-[#f59e0b] to-[#d97706] text-white hover:shadow-lg" onClick={() => setIsEditing(true)}>
                    <HiOutlinePencilAlt /> Edit Quantities
                  </button>
                )}
              </>
            ) : (
              <>
                <button className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium transition-all px-[1.25rem] py-[0.6rem] text-[0.875rem] bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--bg-card-hover)]" onClick={() => setIsEditing(false)} disabled={submitting}>Cancel Edit</button>
                <button className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium transition-all px-[1.25rem] py-[0.6rem] text-[0.875rem] bg-gradient-to-br from-[var(--primary-600)] to-[var(--primary-500)] text-white hover:-translate-y-[1px] hover:shadow-lg disabled:opacity-50" onClick={handleSaveEdit} disabled={submitting}>
                  {submitting ? 'Saving & Updating Stock...' : <><HiOutlineSave /> Save & Adjust Stock</>}
                </button>
              </>
            )}
          </>
        }
      >
        {viewJob && (
          <div className="space-y-6">
            <div className="flex justify-between items-start border-b border-[var(--border-color)] pb-4">
              <div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-1">{viewJob.requestNumber || viewJob.bomNumber}</h3>
                <p className="text-sm text-[var(--text-muted)]">Target: <span className="font-semibold text-[var(--text-secondary)]">{viewJob.producedItem ? viewJob.producedItem.itemName : viewJob.purpose}</span></p>
              </div>
              <div className="text-right">
                <div className="mb-1">{statusBadge(viewJob.status)}</div>
                <p className="text-xs text-[var(--text-muted)]">Created: {formatDate(viewJob.createdAt)}</p>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                {isEditing ? 'Update Material Quantities' : 'Raw Materials Required'}
              </h3>

              {isEditing && (
                <div className="mb-4 bg-[#f59e0b]/10 border border-[#f59e0b]/20 p-3 rounded-md text-sm text-[#d97706] font-medium">
                  <strong>Admin Edit Mode:</strong> Changing quantities here will automatically calculate the difference and return items to the inventory if this BOM was already issued.
                </div>
              )}

              <div className="overflow-hidden border border-[var(--border-color)] rounded-md">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[var(--bg-tertiary)]">
                    <tr>
                      <th className="py-2 px-3 text-[var(--text-secondary)] font-semibold">Item Code</th>
                      <th className="py-2 px-3 text-[var(--text-secondary)] font-semibold">Name</th>
                      <th className="py-2 px-3 text-[var(--text-secondary)] font-semibold text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!isEditing ? (viewJob.consumedItems || viewJob.items || []) : editForm.consumedItems).map((item, idx) => (
                      <tr key={idx} className="border-t border-[var(--border-color)]">
                        <td className="py-2 px-3 font-semibold text-[var(--text-primary)]">{item.itemCode}</td>
                        <td className="py-2 px-3 text-[var(--text-muted)]">{item.itemName}</td>
                        <td className="py-2 px-3 text-right font-bold text-[var(--primary-400)]">
                          {!isEditing ? (
                            `${item.quantity} ${item.uom}`
                          ) : (
                            <div className="flex justify-end items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                className="w-20 px-2 py-1 text-right bg-[var(--bg-input)] border border-[var(--border-color)] rounded outline-none focus:border-[var(--primary-500)] text-[var(--text-primary)]"
                                value={item.quantity}
                                onChange={(e) => {
                                  const newItems = [...editForm.consumedItems];
                                  newItems[idx].quantity = e.target.value;
                                  setEditForm({ consumedItems: newItems });
                                }}
                              />
                              <span className="text-[var(--text-muted)] text-xs">{item.uom}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Create Request Modal ── */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Production Recipe" wide footer={<><button className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium transition-all px-[1.25rem] py-[0.6rem] text-[0.875rem] bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--bg-card-hover)]" onClick={() => setShowCreate(false)}>Cancel</button><button className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium transition-all px-[1.25rem] py-[0.6rem] text-[0.875rem] bg-gradient-to-br from-[var(--primary-600)] to-[var(--primary-500)] text-white border border-[var(--primary-500)] hover:-translate-y-[1px] hover:shadow-[0_4px_15px_rgba(99,102,241,0.3)] disabled:opacity-50" onClick={handleCreate} disabled={submitting}>{submitting ? 'Creating...' : 'Submit Recipe'}</button></>}>
        <form onSubmit={handleCreate}>
          <div className="mb-6 bg-[rgba(16,185,129,0.05)] border border-[rgba(16,185,129,0.2)] p-4 rounded-md">
            <h3 className="text-xs font-bold text-[#10b981] uppercase tracking-wider mb-3">1. Target Output (Finished Product)</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-1"><label className="block text-[0.75rem] font-bold text-[var(--text-secondary)] mb-1 uppercase">Item Code / SKU *</label><input className={inp} placeholder="e.g. FIN-LED-01" value={form.producedItem.itemCode} onChange={(e) => setForm({ ...form, producedItem: { ...form.producedItem, itemCode: e.target.value } })} required /></div>
              <div className="md:col-span-2"><label className="block text-[0.75rem] font-bold text-[var(--text-secondary)] mb-1 uppercase">Product Name *</label><input className={inp} placeholder="e.g. Assembled Headlight" value={form.producedItem.itemName} onChange={(e) => setForm({ ...form, producedItem: { ...form.producedItem, itemName: e.target.value } })} required /></div>
              <div className="md:col-span-1 flex gap-2"><div className="w-1/2"><label className="block text-[0.75rem] font-bold text-[var(--text-secondary)] mb-1 uppercase">Output Qty</label><input type="number" className={inp} value={form.producedItem.quantity} onChange={(e) => setForm({ ...form, producedItem: { ...form.producedItem, quantity: e.target.value } })} min={1} required /></div><div className="w-1/2"><label className="block text-[0.75rem] font-bold text-[var(--text-secondary)] mb-1 uppercase">UOM</label><select className={inp} value={form.producedItem.uom} onChange={(e) => setForm({ ...form, producedItem: { ...form.producedItem, uom: e.target.value } })}><option className="bg-[var(--bg-tertiary)]">PCS</option><option className="bg-[var(--bg-tertiary)]">SET</option><option className="bg-[var(--bg-tertiary)]">BOX</option></select></div></div>
            </div>
          </div>
          <div className="mb-5"><label className="block text-[0.8rem] font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-[0.05em]">Purpose / Project Details (Optional)</label><textarea className={inp} rows={2} placeholder="Describe the purpose of this production run..." value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} /></div>
          <label className="block text-[0.8rem] font-bold text-[var(--text-secondary)] mb-3 uppercase tracking-[0.05em]">2. Raw Materials Needed (Input)</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {form.items.map((item, idx) => {
              const requestedQty = Number(item.quantity) || 0;
              const remainingStock = item.stock != null ? item.stock - requestedQty : null;
              const isOutOfStock = remainingStock != null && remainingStock < 0;
              return (
                <div key={idx} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '14px 14px 10px', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}><div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Material {idx + 1}</div>{form.items.length > 1 && (<button type="button" onClick={() => removeItem(idx)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><HiOutlineTrash size={16} /></button>)}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, alignItems: 'start' }}>
                    <div><label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase' }}>Item Code *</label><ItemCodeInput value={item.itemCode} itemName={item.itemName} uom={item.uom} onChange={(field, val) => updateItem(idx, field, val)} onSelect={(inv) => selectItem(idx, inv)} /></div>
                    <div><label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase' }}>Item Name *</label><input className={inp} placeholder="Auto-filled" value={item.itemName} onChange={(e) => updateItem(idx, 'itemName', e.target.value)} required /></div>
                    <div><label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase' }}>Quantity *</label><input type="number" className={inp} style={{ borderColor: isOutOfStock ? '#ef4444' : '' }} placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} min={1} required />{item.stock != null && item.itemCode && (<div style={{ fontSize: '0.75rem', marginTop: 4, display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Avail: {item.stock}</span><span style={{ color: isOutOfStock ? '#ef4444' : '#10b981', fontWeight: 600 }}>{remainingStock} Left</span></div>)}</div>
                    <div><label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase' }}>UOM</label><div style={{ position: 'relative' }}><select className={inp} value={item.uom} onChange={(e) => updateItem(idx, 'uom', e.target.value)} style={{ appearance: 'none', paddingRight: '2rem' }}><option className="bg-[var(--bg-tertiary)]" >PCS</option><option className="bg-[var(--bg-tertiary)]" >KG</option><option className="bg-[var(--bg-tertiary)]" >LTR</option><option className="bg-[var(--bg-tertiary)]" >MTR</option><option className="bg-[var(--bg-tertiary)]" >BOX</option><option className="bg-[var(--bg-tertiary)]" >NOS</option><option className="bg-[var(--bg-tertiary)]" >GMS</option></select><HiOutlineChevronDown style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', fontSize: 14 }} /></div></div>
                  </div>
                </div>
              );
            })}
          </div>
          <button type="button" className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] font-medium px-[0.75rem] py-[0.45rem] text-[0.8rem] bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] transition-all" onClick={addItem} style={{ marginTop: 12 }}><HiOutlinePlus /> Add Material</button>
        </form>
      </Modal>

    </div >
  );
};

export default RnD;