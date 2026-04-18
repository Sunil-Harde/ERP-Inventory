import { useState, useEffect, useRef, useCallback } from 'react';
import { purchaseAPI, inventoryAPI } from '../../services/api';
import Modal from '../../components/Modal';
import {
  HiOutlinePlus, HiOutlineShoppingCart, HiOutlineCheck,
  HiOutlineTrash, HiOutlineEye, HiOutlineX,
  HiOutlineSearch, HiOutlineChevronDown,
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
        // supports both { data: [...] } and direct array
        setResults(Array.isArray(res) ? res : (res.data || []));
      } catch { setResults([]); }
      setLoading(false);
    }, 250);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  return { results, loading };
}

// ── Item code input with autocomplete ────────────────────────────────────────
function ItemCodeInput({ value, itemName, uom, onChange, onSelect }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const wrapRef = useRef(null);
  const { results, loading } = useItemSearch(query);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Sync external value (e.g. on clear)
  useEffect(() => { setQuery(value); }, [value]);

  const handleInput = (e) => {
    const v = e.target.value.toUpperCase();
    setQuery(v);
    onChange('itemCode', v);
    onChange('itemName', '');
    onChange('uom', 'PCS');
    setOpen(true);
  };

  const handleSelect = (item) => {
    setQuery(item.itemCode);
    onSelect(item);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        className="w-full px-[0.9rem] py-[0.65rem] bg-[var(--bg-input)] border border-[var(--border-color)] rounded-[var(--radius-sm)] text-[0.9rem] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary-500)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] outline-none transition-all"
        placeholder="Item Code (type 2+ letters)"
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
              key={item._id || item.itemCode}
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
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-400)' }}>{item.itemCode}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{item.itemName}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 7px',
                  borderRadius: 20, background: 'rgba(99,102,241,0.12)',
                  border: '1px solid rgba(99,102,241,0.25)', color: 'var(--primary-400)',
                }}>{item.uom}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Stock: {item.stock ?? '—'}</span>
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

// ── Item detail view modal ────────────────────────────────────────────────────
function ItemDetailModal({ item, onClose }) {
  if (!item) return null;
  const rows = [
    ['Item Code', item.itemCode],
    ['Item Name', item.itemName],
    ['Category', item.category || '—'],
    ['UOM', item.uom],
    ['Current Stock', `${item.stock ?? 0} ${item.uom}`],
    ['Min Stock', item.minStock != null ? `${item.minStock} ${item.uom}` : '—'],
    ['Location', item.location || '—'],
    ['HSN Code', item.hsnCode || '—'],
    ['Description', item.description || '—'],
  ];
  return (
    <Modal isOpen={!!item} onClose={onClose} title="Item Details"
      footer={<button className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium transition-all px-[1.25rem] py-[0.6rem] text-[0.875rem] bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--bg-card-hover)]" onClick={onClose}>Close</button>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
        {rows.map(([label, val], i) => (
          <div key={label} style={{
            display: 'flex', gap: 12, padding: '10px 14px',
            background: i % 2 === 0 ? 'var(--bg-tertiary)' : 'var(--bg-card)',
            borderBottom: i < rows.length - 1 ? '1px solid var(--border-color)' : 'none',
          }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', width: 120, flexShrink: 0 }}>{label}</span>
            <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: label === 'Item Code' ? 700 : 400 }}>{val}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const EMPTY_ITEM = { itemCode: '', itemName: '', quantity: '', uom: 'PCS' };

const Purchase = () => {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showReceive, setShowReceive] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewItem, setViewItem] = useState(null);   // item detail popup
  const [viewPO, setViewPO] = useState(null);   // PO details popup

  const [form, setForm] = useState({
    supplier: '', remarks: '',
    items: [{ ...EMPTY_ITEM }],
  });
  const [receiveItems, setReceiveItems] = useState([]);

  useEffect(() => { loadOrders(); }, [page, status]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (status) params.set('status', status);
      const res = await purchaseAPI.list(params.toString());
      setOrders(res.data);
      setTotal(res.total);
      setPages(res.pages);
    } catch { toast.error('Failed to load purchase orders'); }
    setLoading(false);
  };

  // ── Form item helpers ─────────────────────────────────────────────────────
  const addItem = () =>
    setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }));

  const removeItem = (idx) =>
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const updateItem = (idx, field, value) =>
    setForm(f => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...f, items };
    });

  // Called when user picks an item from the autocomplete dropdown
  const selectItem = (idx, inventoryItem) => {
    setForm(f => {
      const items = [...f.items];
      items[idx] = {
        ...items[idx],
        itemCode: inventoryItem.itemCode,
        itemName: inventoryItem.itemName,
        uom: inventoryItem.uom || 'PCS',
      };
      return { ...f, items };
    });
  };

  // ── Create PO ─────────────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e?.preventDefault();
    setSubmitting(true);
    try {
      await purchaseAPI.create({
        supplier: form.supplier,
        remarks: form.remarks,
        items: form.items.map(i => ({ ...i, quantity: Number(i.quantity) })),
      });
      toast.success('Purchase order created');
      setShowCreate(false);
      setForm({ supplier: '', remarks: '', items: [{ ...EMPTY_ITEM }] });
      loadOrders();
    } catch (err) { toast.error(err.message); }
    setSubmitting(false);   
  };

  // ── Receive ───────────────────────────────────────────────────────────────
  const openReceive = (po) => {
    setReceiveItems(po.items.map(i => ({
      itemCode: i.itemCode,
      itemName: i.itemName,
      ordered: i.quantity,
      alreadyReceived: i.receivedQty || 0,
      receivedQty: 0,
    })));
    setShowReceive(po);
  };

  const handleReceive = async () => {
    setSubmitting(true);
    try {
      const items = receiveItems
        .filter(i => i.receivedQty > 0)
        .map(i => ({ itemCode: i.itemCode, receivedQty: i.receivedQty }));
      if (!items.length) { toast.error('Enter received quantities'); setSubmitting(false); return; }
      const res = await purchaseAPI.receive(showReceive._id, { receivedItems: items });
      toast.success(res.message);
      setShowReceive(null);
      loadOrders();
    } catch (err) { toast.error(err.message); }
    setSubmitting(false);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const statusBadge = (s) => {
    const styles = {
      ORDERED: 'bg-[rgba(59,130,246,0.1)] text-[#3b82f6] border-[rgba(59,130,246,0.2)]',
      PARTIALLY_RECEIVED: 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b] border-[rgba(245,158,11,0.2)]',
      RECEIVED: 'bg-[rgba(34,197,94,0.1)] text-[#22c55e] border-[rgba(34,197,94,0.2)]',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[0.72rem] font-semibold uppercase tracking-[0.03em] border ${styles[s] || 'bg-[rgba(148,163,184,0.1)] text-[var(--text-secondary)] border-[rgba(148,163,184,0.15)]'}`}>
        {s.replace(/_/g, ' ')}
      </span>
    );
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { dateStyle: 'medium' });

  // shared input class
  const inp = "w-full px-[0.9rem] py-[0.65rem] bg-[var(--bg-input)] border border-[var(--border-color)] rounded-[var(--radius-sm)] text-[0.9rem] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary-500)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] outline-none transition-all disabled:opacity-50";

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-[fadeUp_0.35s_ease] relative z-0">

      {/* Header */}
      <div className="flex justify-between items-center mb-7 flex-wrap gap-4">
        <h1 className="text-[1.6rem] font-bold bg-clip-text text-transparent bg-gradient-to-br from-[var(--text-primary)] to-[var(--primary-300)] tracking-[-0.02em]">
          Purchase Orders
        </h1>
        <button
          className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] font-medium px-[1.25rem] py-[0.6rem] text-[0.875rem] bg-gradient-to-br from-[var(--primary-600)] to-[var(--primary-500)] text-white border border-[var(--primary-500)] hover:-translate-y-[1px] hover:shadow-[0_4px_15px_rgba(99,102,241,0.3)] transition-all"
          onClick={() => setShowCreate(true)}
        >
          <HiOutlinePlus /> Create PO
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <select
          className={inp} style={{ width: 200 }}
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
        >
          <option className="bg-[var(--bg-tertiary)] " value="">All Status</option>
          <option className="bg-[var(--bg-tertiary)] " value="ORDERED">Ordered</option>
          <option className="bg-[var(--bg-tertiary)] " value="PARTIALLY_RECEIVED">Partially Received</option>
          <option className="bg-[var(--bg-tertiary)] " value="RECEIVED">Received</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-[44px] h-[44px] border-[3px] border-[var(--border-color)] border-t-[var(--primary-500)] rounded-full animate-[spin_0.8s_linear_infinite]" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)] text-center">
          <HiOutlineShoppingCart className="text-[3.5rem] mb-4 opacity-40" />
          <h3 className="text-[1.15rem] font-semibold text-[var(--text-secondary)] mb-1.5">No purchase orders</h3>
          <p className="text-[0.85rem]">Create your first purchase order</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-[var(--border-color)] rounded-[var(--radius-lg)] bg-[var(--bg-card)]">
          <table className="w-full text-left border-collapse text-[0.875rem]">
            <thead className="bg-[var(--bg-tertiary)] sticky top-0 z-10">
              <tr>
                {['PO Number', 'Supplier', 'Items', 'Status', 'Created', 'Actions'].map(h => (
                  <th key={h} className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map(po => (
                <tr key={po._id} className="hover:bg-[var(--bg-glass)] transition-colors cursor-pointer" onClick={() => setViewPO(po)}>
                  <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)]">
                    <span className="font-semibold text-[var(--primary-400)]">{po.poNumber}</span>
                  </td>
                  <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)] text-[var(--text-primary)]">{po.supplier}</td>
                  <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)] text-[var(--text-muted)]">{po.items.length} items</td>
                  <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)]">{statusBadge(po.status)}</td>
                  <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)] text-[var(--text-muted)] text-sm">{formatDate(po.createdAt)}</td>
                  <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)]">
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {/* ── NEW: View Products Button ── */}
                      <button
                        className="inline-flex items-center gap-1.5 px-[0.75rem] py-[0.35rem] text-[0.8rem] rounded-[var(--radius-sm)] font-medium bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] transition-all"
                        onClick={() => setViewPO(po)}
                        title="View PO Products"
                      >
                        <HiOutlineEye /> View
                      </button>

                      {/* Existing Receive Button */}
                      {po.status !== 'RECEIVED' && (
                        <button
                          className="inline-flex items-center gap-1.5 px-[0.75rem] py-[0.35rem] text-[0.8rem] rounded-[var(--radius-sm)] font-medium bg-gradient-to-br from-[#16a34a] to-[#22c55e] text-white hover:-translate-y-[1px] hover:shadow-[0_4px_15px_rgba(34,197,94,0.3)] transition-all"
                          onClick={() => openReceive(po)}
                        >
                          <HiOutlineCheck /> Receive
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button className={`px-3 py-1.5 rounded text-sm border transition-all ${page === 1 ? 'opacity-40 cursor-not-allowed border-[var(--border-color)]' : 'border-[var(--primary-500)] text-[var(--primary-400)] hover:bg-[var(--primary-500)] hover:text-white'}`} disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
          <span className="text-sm text-[var(--text-muted)] px-2">{page} / {pages}</span>
          <button className={`px-3 py-1.5 rounded text-sm border transition-all ${page === pages ? 'opacity-40 cursor-not-allowed border-[var(--border-color)]' : 'border-[var(--primary-500)] text-[var(--primary-400)] hover:bg-[var(--primary-500)] hover:text-white'}`} disabled={page === pages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}

      {/* ── Create PO Modal ── */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Purchase Order"
        wide
        footer={
          <>
            <button className={`inline-flex items-center gap-2 rounded-[var(--radius-sm)] font-medium px-[1.25rem] py-[0.6rem] text-[0.875rem] bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] transition-all`} onClick={() => setShowCreate(false)}>Cancel</button>
            <button className={`inline-flex items-center gap-2 rounded-[var(--radius-sm)] font-medium px-[1.25rem] py-[0.6rem] text-[0.875rem] bg-gradient-to-br from-[var(--primary-600)] to-[var(--primary-500)] text-white border border-[var(--primary-500)] hover:-translate-y-[1px] hover:shadow-[0_4px_15px_rgba(99,102,241,0.3)] transition-all disabled:opacity-50`} onClick={handleCreate} disabled={submitting}>{submitting ? 'Creating...' : 'Create PO'}</button>
          </>
        }
      >
        <form onSubmit={handleCreate}>
          {/* Supplier */}
          <div className="mb-5">
            <label className="block text-[0.8rem] font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-[0.05em]">Supplier *</label>
            <input className={inp} placeholder="Supplier name" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} required />
          </div>

          {/* Items */}
          <label className="block text-[0.8rem] font-medium text-[var(--text-secondary)] mb-3 uppercase tracking-[0.05em]">Items</label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {form.items.map((item, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px 14px 10px',
                  position: 'relative',
                }}
              >
                {/* Row label */}
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                  Item {idx + 1}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, alignItems: 'end' }}>

                  {/* Item Code with autocomplete */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Item Code *</label>
                    <ItemCodeInput
                      value={item.itemCode}
                      itemName={item.itemName}
                      uom={item.uom}
                      onChange={(field, val) => updateItem(idx, field, val)}
                      onSelect={(inv) => selectItem(idx, inv)}
                    />
                  </div>

                  {/* Item Name — auto-filled, editable */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Item Name *</label>
                    <input
                      className={inp}
                      placeholder="Auto-filled on selection"
                      value={item.itemName}
                      onChange={e => updateItem(idx, 'itemName', e.target.value)}
                      required
                    />
                  </div>

                  {/* Quantity */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Quantity *</label>
                    <input
                      type="number"
                      className={inp}
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={e => updateItem(idx, 'quantity', e.target.value)}
                      min={1}
                      required
                    />
                  </div>

                  {/* UOM — auto-filled */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>UOM</label>
                    <div style={{ position: 'relative' }}>
                      <select
                        className={`bg-[var(--bg-tertiary)] ${inp}`}
                        value={item.uom}
                        onChange={e => updateItem(idx, 'uom', e.target.value)}
                        style={{ appearance: 'none', paddingRight: '2rem' }}
                      >
                        {['PCS', 'KG', 'LTR', 'MTR', 'BOX', 'NOS', 'GMS', 'TON'].map(u => <option key={u}>{u}</option>)}
                      </select>
                      <HiOutlineChevronDown style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', fontSize: 14 }} />
                    </div>
                    {/* Auto-filled indicator */}
                    {item.itemCode && (
                      <div style={{ fontSize: 10, color: 'var(--primary-400)', marginTop: 3, opacity: 0.8 }}>
                        ✓ auto-filled
                      </div>
                    )}
                  </div>

                  {/* View button + Remove */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingBottom: 2 }}>
                    {/* View item details */}
                    <button
                      type="button"
                      title="View item details"
                      disabled={!item.itemCode}
                      onClick={async () => {
                        try {
                          const res = await inventoryAPI.list(`search=${encodeURIComponent(item.itemCode)}&limit=1`);
                          const arr = Array.isArray(res) ? res : (res.data || []);
                          const found = arr.find(i => i.itemCode === item.itemCode) || arr[0];
                          if (found) setViewItem(found);
                          else toast.error('Item details not found');
                        } catch { toast.error('Could not load item details'); }
                      }}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '7px 12px', borderRadius: 'var(--radius-sm)',
                        background: item.itemCode ? 'rgba(99,102,241,0.12)' : 'var(--bg-input)',
                        border: `1px solid ${item.itemCode ? 'rgba(99,102,241,0.3)' : 'var(--border-color)'}`,
                        color: item.itemCode ? 'var(--primary-400)' : 'var(--text-muted)',
                        fontSize: 13, fontWeight: 600, cursor: item.itemCode ? 'pointer' : 'not-allowed',
                        opacity: item.itemCode ? 1 : 0.5, transition: 'all 0.15s',
                      }}
                    >
                      <HiOutlineEye style={{ fontSize: 15 }} /> View
                    </button>

                    {/* Remove row */}
                    {form.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        title="Remove item"
                        style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 34, height: 34, borderRadius: 'var(--radius-sm)',
                          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                          color: '#f87171', cursor: 'pointer', transition: 'all 0.15s', fontSize: 15,
                        }}
                      >
                        <HiOutlineTrash />
                      </button>
                    )}
                  </div>

                </div>
              </div>
            ))}
          </div>

          {/* Add item row */}
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] font-medium px-[0.75rem] py-[0.45rem] text-[0.8rem] bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-hover)] transition-all"
            onClick={addItem}
            style={{ marginTop: 10 }}
          >
            <HiOutlinePlus /> Add Item
          </button>

          {/* Remarks */}
          <div className="mb-5" style={{ marginTop: '1rem' }}>
            <label className="block text-[0.8rem] font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-[0.05em]">Remarks</label>
            <textarea
              className={inp}
              rows={2}
              placeholder="Optional remarks…"
              value={form.remarks}
              onChange={e => setForm({ ...form, remarks: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* ── Receive Materials Modal ── */}
      <Modal
        isOpen={!!showReceive}
        onClose={() => setShowReceive(null)}
        title={`Receive — ${showReceive?.poNumber}`}
        wide
        footer={
          <>
            <button className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] font-medium px-[1.25rem] py-[0.6rem] text-[0.875rem] bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] transition-all" onClick={() => setShowReceive(null)}>Cancel</button>
            <button className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] font-medium px-[1.25rem] py-[0.6rem] text-[0.875rem] bg-gradient-to-br from-[#16a34a] to-[#22c55e] text-white hover:-translate-y-[1px] hover:shadow-[0_4px_15px_rgba(34,197,94,0.3)] transition-all disabled:opacity-50" onClick={handleReceive} disabled={submitting}>{submitting ? 'Processing...' : 'Confirm Receipt'}</button>
          </>
        }
      >
        <div className="overflow-x-auto border border-[var(--border-color)] rounded-[var(--radius-lg)]">
          <table className="w-full text-left border-collapse text-[0.875rem]">
            <thead className="bg-[var(--bg-tertiary)]">
              <tr>
                {['Item Code', 'Item Name', 'Ordered', 'Already Recv', 'Receive Now'].map(h => (
                  <th key={h} className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {receiveItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-[var(--bg-glass)] transition-colors">
                  <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)] font-semibold text-[var(--primary-400)]">{item.itemCode}</td>
                  <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)] text-[var(--text-primary)]">{item.itemName}</td>
                  <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)] text-[var(--text-muted)]">{item.ordered}</td>
                  <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)] text-[var(--text-muted)]">{item.alreadyReceived}</td>

                  {
                    console.log(item.orders)
                  }

                  {
                    item.ordered !== item.alreadyReceived ? (
                      <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)]">
                        <input
                          type="number"
                          className={inp}
                          style={{ width: 100 }}
                          value={item.receivedQty}
                          min={0}
                          max={item.ordered - item.alreadyReceived}
                          onChange={e => {
                            const arr = [...receiveItems];
                            arr[idx].receivedQty = Number(e.target.value);
                            setReceiveItems(arr);
                          }}
                        />
                      </td>
                    ) : (

                      <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)]">
                        All Items Received
                      </td>

                    )
                  }
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>

      {/* ── View PO Details Modal ── */}
      <Modal
        isOpen={!!viewPO}
        onClose={() => setViewPO(null)}
        title={`Purchase Order — ${viewPO?.poNumber}`}
        wide
        footer={
          <button
            className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium transition-all px-[1.25rem] py-[0.6rem] text-[0.875rem] bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--bg-card-hover)]"
            onClick={() => setViewPO(null)}
          >
            Close
          </button>
        }
      >
        {viewPO && (
          <div className="space-y-5">
            {/* PO Summary Info */}
            <div className="grid grid-cols-2 gap-4 text-[0.875rem] p-4 bg-[var(--bg-tertiary)] rounded-[var(--radius-sm)] border border-[var(--border-color)]">
              <div><span className="text-[var(--text-muted)] uppercase tracking-wide text-[0.75rem] font-semibold block mb-1">Supplier</span> <span className="font-medium text-[var(--text-primary)]">{viewPO.supplier}</span></div>
              <div><span className="text-[var(--text-muted)] uppercase tracking-wide text-[0.75rem] font-semibold block mb-1">Status</span> {statusBadge(viewPO.status)}</div>
              {viewPO.remarks && <div className="col-span-2 mt-2"><span className="text-[var(--text-muted)] uppercase tracking-wide text-[0.75rem] font-semibold block mb-1">Remarks</span> <span className="text-[var(--text-primary)]">{viewPO.remarks}</span></div>}
            </div>

            {/* Products Table */}
            <div>
              <h3 className="text-[0.85rem] font-semibold text-[var(--text-secondary)] mb-3 uppercase tracking-[0.05em]">Ordered Products</h3>
              <div className="overflow-x-auto border border-[var(--border-color)] rounded-[var(--radius-sm)]">
                <table className="w-full text-left border-collapse text-[0.875rem]">
                  <thead className="bg-[var(--bg-tertiary)]">
                    <tr>
                      <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-3 py-2.5 border-b border-[var(--border-color)]">Item Code</th>
                      <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-3 py-2.5 border-b border-[var(--border-color)]">Item Name</th>
                      <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-3 py-2.5 border-b border-[var(--border-color)]">Ordered Qty</th>
                      <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-3 py-2.5 border-b border-[var(--border-color)]">Received Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewPO.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[var(--bg-glass)] border-b border-[var(--border-color)] last:border-0 transition-colors">
                        <td className="px-3 py-2.5 font-semibold text-[var(--primary-400)]">{item.itemCode}</td>
                        <td className="px-3 py-2.5 text-[var(--text-primary)]">{item.itemName}</td>
                        <td className="px-3 py-2.5 text-[var(--text-muted)]">{item.quantity} <span className="text-[0.75rem] ml-1">{item.uom}</span></td>
                        <td className="px-3 py-2.5 text-[var(--text-muted)]">{item.receivedQty || 0} <span className="text-[0.75rem] ml-1">{item.uom}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Existing Item Detail View Modal ── */}
      <ItemDetailModal item={viewItem} onClose={() => setViewItem(null)} />

    </div>
  );
};

export default Purchase;