import { useState, useEffect, useCallback } from 'react';
import { inventoryAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';
import DetailModal from '../../components/DetailModal';
import {
  HiOutlinePlus, HiOutlineSearch, HiOutlinePencil,
  HiOutlineArrowDown, HiOutlineArrowUp, HiOutlineQrcode, HiOutlineCube
} from 'react-icons/hi';
import toast from 'react-hot-toast';

const Inventory = () => {
  const { hasRole } = useAuth();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [showInward, setShowInward] = useState(false);
  const [showIssue, setShowIssue] = useState(false);
  const [showQR, setShowQR] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrPackQty, setQrPackQty] = useState(1);
  const [showDetail, setShowDetail] = useState(null);

  // Form states
  const [form, setForm] = useState({ itemCode: '', itemName: '', uom: '', category: '', minStock: 10, description: '' });
  const [qrData, setQrData] = useState('');
  const [issueForm, setIssueForm] = useState({ itemCode: '', quantity: '', remarks: '' });
  const [submitting, setSubmitting] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      const res = await inventoryAPI.list(params.toString());
      setItems(res.data);
      setTotal(res.total);
      setPages(res.pages);
    } catch (err) {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [page, search, category]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await inventoryAPI.create(form);
      toast.success('Item created');
      setShowCreate(false);
      setForm({ itemCode: '', itemName: '', uom: '', category: '', minStock: 10, description: '' });
      loadItems();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await inventoryAPI.update(showEdit._id, form);
      toast.success('Item updated');
      setShowEdit(null);
      loadItems();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInward = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await inventoryAPI.inward({ qrData });
      toast.success(res.message);
      setShowInward(false);
      setQrData('');
      loadItems();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleIssue = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await inventoryAPI.issue({
        itemCode: issueForm.itemCode,
        quantity: Number(issueForm.quantity),
        remarks: issueForm.remarks,
      });
      toast.success(res.message);
      setShowIssue(false);
      setIssueForm({ itemCode: '', quantity: '', remarks: '' });
      loadItems();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (item) => {
    setForm({
      itemCode: item.itemCode,
      itemName: item.itemName,
      uom: item.uom,
      category: item.category,
      minStock: item.minStock,
      description: item.description || '',
    });
    setShowEdit(item);
  };

  const getStockStatus = (item) => {
    const baseClasses = "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.72rem] font-semibold uppercase tracking-[0.03em] whitespace-nowrap border";
    if (item.stock <= 0) return <span className={`${baseClasses} bg-[var(--danger-bg)] text-[var(--danger)] border-[rgba(239,68,68,0.2)]`}>Out of Stock</span>;
    if (item.isLowStock) return <span className={`${baseClasses} bg-[var(--warning-bg)] text-[var(--warning)] border-[rgba(245,158,11,0.2)]`}>Low Stock</span>;
    return <span className={`${baseClasses} bg-[var(--success-bg)] text-[var(--success)] border-[rgba(34,197,94,0.2)]`}>In Stock</span>;
  };

  const openQR = async (item, qty = 1) => {
    setQrPackQty(qty);
    setQrLoading(true);
    setShowQR({ item, qrImage: null });
    try {
      const res = await inventoryAPI.getQR(item.itemCode, qty);
      setShowQR({ item, ...res.data });
    } catch (err) {
      toast.error('Failed to generate QR');
      setShowQR(null);
    } finally {
      setQrLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-[fadeUp_0.35s_ease] relative z-0">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-7">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Inventory</h1>
        <div className="flex flex-wrap items-center gap-3">
          {hasRole('ADMIN', 'STAFF_STORE', 'STAFF_QUALITY') && (
            <button
              type="button"
              className="relative z-10 inline-flex items-center cursor-pointer gap-2 px-5 py-2.5 bg-gradient-to-br from-[#16a34a] to-[#22c55e] hover:shadow-[0_4px_15px_rgba(34,197,94,0.3)] hover:-translate-y-[1px] text-white text-[0.875rem] font-medium rounded-[var(--radius-sm)] transition-all"
              onClick={() => setShowInward(true)}
            >
              <HiOutlineArrowDown size={18} className="pointer-events-none" /> Inward
            </button>
          )}
          {hasRole('ADMIN', 'STAFF_STORE', 'STAFF_RND') && (
            <button
              type="button"
              className="relative z-10 inline-flex items-center cursor-pointer gap-2 px-5 py-2.5 bg-gradient-to-br from-[#d97706] to-[#f59e0b] hover:shadow-[0_4px_15px_rgba(245,158,11,0.3)] hover:-translate-y-[1px] text-white text-[0.875rem] font-medium rounded-[var(--radius-sm)] transition-all"
              onClick={() => setShowIssue(true)}
            >
              <HiOutlineArrowUp size={18} className="pointer-events-none" /> Issue
            </button>
          )}
          {hasRole('ADMIN', 'STAFF_STORE') && (
            <button
              type="button"
              className="relative z-10 inline-flex items-center cursor-pointer gap-2 px-5 py-2.5 bg-gradient-to-br from-[var(--primary-600)] to-[var(--primary-500)] hover:shadow-[0_4px_15px_rgba(99,102,241,0.3)] hover:-translate-y-[1px] text-white text-[0.875rem] font-medium rounded-[var(--radius-sm)] border border-[var(--primary-500)] transition-all"
              onClick={() => { setForm({ itemCode: '', itemName: '', uom: '', category: '', minStock: 10, description: '' }); setShowCreate(true); }}
            >
              <HiOutlinePlus size={18} className="pointer-events-none" /> Add Item
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center mb-6">
        <div className="relative flex-1 w-full sm:min-w-[220px]">
          <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-[1rem] pointer-events-none" />
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-[var(--radius-sm)] text-[0.9rem] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary-500)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] focus:bg-[rgba(255,255,255,0.08)] outline-none transition-all relative z-10"
            placeholder="Search items..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="w-full sm:w-[180px] px-3.5 py-2.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-[var(--radius-sm)] text-[0.9rem] text-[var(--text-primary)] focus:border-[var(--primary-500)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] focus:bg-[rgba(255,255,255,0.08)] outline-none transition-all cursor-pointer relative z-10"
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
        >
          <option className="bg-[var(--bg-tertiary)] " value="">All Categories</option>
          <option className="bg-[var(--bg-tertiary)] " value="Raw Material">Raw Material</option>
          <option className="bg-[var(--bg-tertiary)] " value="Consumable">Consumable</option>
          <option className="bg-[var(--bg-tertiary)] " value="Packaging">Packaging</option>
          <option className="bg-[var(--bg-tertiary)] " value="Chemical">Chemical</option>
          <option className="bg-[var(--bg-tertiary)] " value="General">General</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[60vh] flex-col gap-4">
          <div className="w-11 h-11 border-[3px] border-[var(--border-color)] border-t-[var(--primary-500)] rounded-full animate-[spin_0.8s_linear_infinite]" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-8 text-center text-[var(--text-muted)]">
          <HiOutlineCube className="text-[3.5rem] mb-4 opacity-40" />
          <h3 className="text-[1.15rem] font-semibold text-[var(--text-secondary)] mb-1">No items found</h3>
          <p className="text-[0.85rem] max-w-[320px]">Add your first inventory item to get started</p>
        </div>
      ) : (
        <>
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[var(--radius-lg)] overflow-hidden overflow-x-auto relative z-10">
            <table className="w-full text-left border-collapse whitespace-nowrap text-[0.875rem]">
              <thead className="bg-[var(--bg-tertiary)] sticky top-0 z-20">
                <tr>
                  <th className="px-4 py-3.5 border-b border-[var(--border-color)] text-[0.72rem] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.05em]">Item Code</th>
                  <th className="px-4 py-3.5 border-b border-[var(--border-color)] text-[0.72rem] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.05em]">Item Name</th>
                  <th className="px-4 py-3.5 border-b border-[var(--border-color)] text-[0.72rem] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.05em]">Stock</th>
                  <th className="px-4 py-3.5 border-b border-[var(--border-color)] text-[0.72rem] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.05em]">UOM</th>
                  <th className="px-4 py-3.5 border-b border-[var(--border-color)] text-[0.72rem] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.05em]">Category</th>
                  <th className="px-4 py-3.5 border-b border-[var(--border-color)] text-[0.72rem] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.05em]">Status</th>
                  <th className="px-4 py-3.5 border-b border-[var(--border-color)] text-[0.72rem] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.05em] text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id} className="hover:bg-[var(--bg-glass)] transition-colors border-b border-[var(--border-color)] last:border-none cursor-pointer" onClick={() => setShowDetail(item)}>
                    <td className="px-4 py-3.5 align-middle text-[var(--text-primary)]"><span className="font-semibold text-[var(--text-accent)]">{item.itemCode}</span></td>
                    <td className="px-4 py-3.5 align-middle text-[var(--text-primary)]">{item.itemName}</td>
                    <td className="px-4 py-3.5 align-middle text-[var(--text-primary)]"><span className="font-bold">{item.stock}</span></td>
                    <td className="px-4 py-3.5 align-middle text-[var(--text-primary)]">{item.uom}</td>
                    <td className="px-4 py-3.5 align-middle">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.72rem] font-semibold uppercase tracking-[0.03em] whitespace-nowrap bg-[rgba(148,163,184,0.1)] text-[var(--text-secondary)] border border-[rgba(148,163,184,0.15)]">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 align-middle">{getStockStatus(item)}</td>
                    <td className="px-4 py-3.5 align-middle text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="relative z-20 w-9 h-9 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] bg-transparent hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)] transition-all cursor-pointer"
                          title="View QR"
                          onClick={() => openQR(item, item.minStock || 1)}
                        >
                          <HiOutlineQrcode size={18} className="pointer-events-none" />
                        </button>
                        {hasRole('ADMIN', 'STAFF_STORE') && (
                          <button
                            type="button"
                            className="relative z-20 w-9 h-9 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] bg-transparent hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)] transition-all cursor-pointer"
                            title="Edit Item"
                            onClick={() => openEdit(item)}
                          >
                            <HiOutlinePencil size={18} className="pointer-events-none" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 relative z-10">
              <button
                type="button"
                className="cursor-pointer w-9 h-9 flex items-center justify-center border border-[var(--border-color)] rounded-[var(--radius-sm)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-[0.85rem] transition-all hover:border-[var(--primary-500)] hover:text-[var(--primary-400)] disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                ‹
              </button>
              {[...Array(Math.min(pages, 5))].map((_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    type="button"
                    className={`cursor-pointer w-9 h-9 flex items-center justify-center border rounded-[var(--radius-sm)] text-[0.85rem] transition-all ${page === p
                        ? 'bg-[var(--primary-600)] border-[var(--primary-500)] text-white'
                        : 'border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:border-[var(--primary-500)] hover:text-[var(--primary-400)]'
                      }`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                );
              })}
              <span className="text-[0.8rem] text-[var(--text-muted)] mx-2">
                {total} items
              </span>
              <button
                type="button"
                className="cursor-pointer w-9 h-9 flex items-center justify-center border border-[var(--border-color)] rounded-[var(--radius-sm)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-[0.85rem] transition-all hover:border-[var(--primary-500)] hover:text-[var(--primary-400)] disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={page >= pages}
                onClick={() => setPage(page + 1)}
              >
                ›
              </button>
            </div>
          )}
        </>
      )}

      {/* Modals remain structurally identical to handle your internal Modal component */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Add New Item"
        footer={
          <div className="flex gap-3">
            <button type="button" className="cursor-pointer px-4 py-2 rounded-[var(--radius-sm)] text-sm font-medium bg-[var(--bg-tertiary)] hover:bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] transition-colors" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="button" className="cursor-pointer px-4 py-2 rounded-[var(--radius-sm)] text-sm font-medium bg-[var(--primary-600)] hover:bg-[var(--primary-500)] text-white transition-colors disabled:opacity-50" onClick={handleCreate} disabled={submitting}>
              {submitting ? 'Saving...' : 'Create Item'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Item Code *</label>
              <input className="w-full uppercase px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-[var(--radius-sm)] text-sm focus:border-[var(--primary-500)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] outline-none text-[var(--text-primary)]" placeholder="e.g., RM-001" value={form.itemCode} onChange={(e) => setForm({ ...form, itemCode: e.target.value })} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Item Name *</label>
              <input className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-[var(--radius-sm)] text-sm focus:border-[var(--primary-500)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] outline-none text-[var(--text-primary)]" placeholder="e.g., Steel Rod" value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">UOM *</label>
              <select className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-[var(--radius-sm)] text-sm focus:border-[var(--primary-500)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] outline-none text-[var(--text-primary)]" value={form.uom} onChange={(e) => setForm({ ...form, uom: e.target.value })} required>
                
                <option className="bg-[var(--bg-tertiary)]" value="">Select</option>
                <option className="bg-[var(--bg-tertiary)]" value="KG">KG</option>
                <option className="bg-[var(--bg-tertiary)]" value="PCS">PCS</option>
                <option className="bg-[var(--bg-tertiary)]" value="LTR">LTR</option>
                <option className="bg-[var(--bg-tertiary)]" value="MTR">MTR</option>
                <option className="bg-[var(--bg-tertiary)]" value="BOX">BOX</option>
                <option className="bg-[var(--bg-tertiary)]" value="NOS">NOS</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Category *</label>
              <select className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-[var(--radius-sm)] text-sm focus:border-[var(--primary-500)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] outline-none text-[var(--text-primary)]" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
                
                <option className="bg-[var(--bg-tertiary)]" value="">Select</option>
                <option className="bg-[var(--bg-tertiary)]" value="Raw Material">Raw Material</option>
                <option className="bg-[var(--bg-tertiary)]" value="Consumable">Consumable</option>
                <option className="bg-[var(--bg-tertiary)]" value="Packaging">Packaging</option>
                <option className="bg-[var(--bg-tertiary)]" value="Chemical">Chemical</option>
                <option className="bg-[var(--bg-tertiary)]" value="General">General</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Min Stock</label>
            <input type="number" className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-[var(--radius-sm)] text-sm focus:border-[var(--primary-500)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] outline-none text-[var(--text-primary)]" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })} min={0} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Description</label>
            <textarea className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-[var(--radius-sm)] text-sm focus:border-[var(--primary-500)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] outline-none resize-y text-[var(--text-primary)]" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!showEdit}
        onClose={() => setShowEdit(null)}
        title="Edit Item"
        footer={
          <div className="flex gap-3">
            <button type="button" className="cursor-pointer px-4 py-2 rounded-[var(--radius-sm)] text-sm font-medium bg-[var(--bg-tertiary)] hover:bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] transition-colors" onClick={() => setShowEdit(null)}>Cancel</button>
            <button type="button" className="cursor-pointer px-4 py-2 rounded-[var(--radius-sm)] text-sm font-medium bg-[var(--primary-600)] hover:bg-[var(--primary-500)] text-white transition-colors disabled:opacity-50" onClick={handleUpdate} disabled={submitting}>
              {submitting ? 'Saving...' : 'Update Item'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Item Code</label>
            <input className="w-full px-3 py-2 bg-[rgba(255,255,255,0.02)] border border-[var(--border-color)] rounded-[var(--radius-sm)] text-sm text-[var(--text-muted)] cursor-not-allowed" value={form.itemCode} disabled />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Item Name</label>
            <input className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-[var(--radius-sm)] text-sm focus:border-[var(--primary-500)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] outline-none text-[var(--text-primary)]" value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">UOM</label>
              <select className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-[var(--radius-sm)] text-sm focus:border-[var(--primary-500)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] outline-none text-[var(--text-primary)]" value={form.uom} onChange={(e) => setForm({ ...form, uom: e.target.value })}>
                <option className="bg-[var(--bg-tertiary)]" value="KG">KG</option>
                <option className="bg-[var(--bg-tertiary)]" value="PCS">PCS</option>
                <option className="bg-[var(--bg-tertiary)]" value="LTR">LTR</option>
                <option className="bg-[var(--bg-tertiary)]" value="MTR">MTR</option>
                <option className="bg-[var(--bg-tertiary)]" value="BOX">BOX</option>
                <option className="bg-[var(--bg-tertiary)]" value="NOS">NOS</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Category</label>
              <select className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-[var(--radius-sm)] text-sm focus:border-[var(--primary-500)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] outline-none text-[var(--text-primary)]" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option className='bg-[var(--bg-tertiary)]' value="Raw Material">Raw Material</option>
                <option className='bg-[var(--bg-tertiary)]' value="Consumable">Consumable</option>
                <option className='bg-[var(--bg-tertiary)]' value="Packaging">Packaging</option>
                <option className='bg-[var(--bg-tertiary)]' value="Chemical">Chemical</option>
                <option className='bg-[var(--bg-tertiary)]' value="General">General</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Min Stock</label>
            <input type="number" className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-[var(--radius-sm)] text-sm focus:border-[var(--primary-500)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] outline-none text-[var(--text-primary)]" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })} min={0} />
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showInward}
        onClose={() => setShowInward(false)}
        title="Stock Inward (QR Scan)"
        footer={
          <div className="flex gap-3">
            <button type="button" className="cursor-pointer px-4 py-2 rounded-[var(--radius-sm)] text-sm font-medium bg-[var(--bg-tertiary)] hover:bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] transition-colors" onClick={() => setShowInward(false)}>Cancel</button>
            <button type="button" className="cursor-pointer px-4 py-2 rounded-[var(--radius-sm)] text-sm font-medium bg-[#16a34a] hover:bg-[#15803d] text-white transition-colors disabled:opacity-50" onClick={handleInward} disabled={submitting}>
              {submitting ? 'Processing...' : 'Process Inward'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleInward} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">QR Data (ITEMCODE|PACKQTY)</label>
            <div className="relative">
              <HiOutlineQrcode className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-[1.2rem] pointer-events-none" />
              <input className="w-full pl-10 pr-3 py-2 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-[var(--radius-sm)] text-sm focus:border-[#16a34a] focus:shadow-[0_0_0_3px_rgba(34,197,94,0.15)] outline-none text-[var(--text-primary)]" placeholder="e.g., RM-001|50" value={qrData} onChange={(e) => setQrData(e.target.value)} autoFocus required />
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">Scan QR code or enter data in format: ITEMCODE|QUANTITY</p>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showIssue}
        onClose={() => setShowIssue(false)}
        title="Stock Issue"
        footer={
          <div className="flex gap-3">
            <button type="button" className="cursor-pointer px-4 py-2 rounded-[var(--radius-sm)] text-sm font-medium bg-[var(--bg-tertiary)] hover:bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] transition-colors" onClick={() => setShowIssue(false)}>Cancel</button>
            <button type="button" className="cursor-pointer px-4 py-2 rounded-[var(--radius-sm)] text-sm font-medium bg-[#d97706] hover:bg-[#b45309] text-white transition-colors disabled:opacity-50" onClick={handleIssue} disabled={submitting}>
              {submitting ? 'Processing...' : 'Issue Stock'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleIssue} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Item Code *</label>
            <input className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-[var(--radius-sm)] text-sm focus:border-[#d97706] focus:shadow-[0_0_0_3px_rgba(245,158,11,0.15)] outline-none text-[var(--text-primary)]" placeholder="e.g., RM-001" value={issueForm.itemCode} onChange={(e) => setIssueForm({ ...issueForm, itemCode: e.target.value })} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Quantity *</label>
            <input type="number" className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-[var(--radius-sm)] text-sm focus:border-[#d97706] focus:shadow-[0_0_0_3px_rgba(245,158,11,0.15)] outline-none text-[var(--text-primary)]" placeholder="Enter quantity" value={issueForm.quantity} onChange={(e) => setIssueForm({ ...issueForm, quantity: e.target.value })} min={1} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Remarks</label>
            <textarea className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-[var(--radius-sm)] text-sm focus:border-[#d97706] focus:shadow-[0_0_0_3px_rgba(245,158,11,0.15)] outline-none resize-y text-[var(--text-primary)]" rows={2} value={issueForm.remarks} onChange={(e) => setIssueForm({ ...issueForm, remarks: e.target.value })} placeholder="Optional" />
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!showQR}
        onClose={() => setShowQR(null)}
        title={`QR Code — ${showQR?.item?.itemCode || ''}`}
        footer={
          <div className="flex gap-3">
            <button type="button" className="cursor-pointer px-4 py-2 rounded-[var(--radius-sm)] text-sm font-medium bg-[var(--bg-tertiary)] hover:bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] transition-colors" onClick={() => setShowQR(null)}>Close</button>
            {showQR?.qrImage && (
              <button type="button" className="cursor-pointer px-4 py-2 rounded-[var(--radius-sm)] text-sm font-medium bg-[var(--primary-600)] hover:bg-[var(--primary-500)] text-white transition-colors" onClick={() => {
                const win = window.open();
                win.document.write(`<img src="${showQR.qrImage}" style="display:block;margin:auto;max-width:300px"><p style="text-align:center;font-family:monospace;font-size:14px">${showQR.qrString}</p>`);
                win.print();
              }}>🖨 Print</button>
            )}
          </div>
        }
      >
        {qrLoading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="w-10 h-10 border-[3px] border-[var(--border-color)] border-t-[var(--primary-500)] rounded-full animate-spin" />
          </div>
        ) : showQR?.qrImage ? (
          <div className="flex flex-col items-center text-center p-4">
            <img src={showQR.qrImage} alt="QR Code" className="w-[220px] h-[220px] mb-4 rounded-xl border border-[var(--border-color)] shadow-sm" />
            <p className="font-mono text-lg text-[var(--text-primary)] mb-2 font-bold tracking-wide">{showQR.qrString}</p>
            <p className="text-sm text-[var(--text-muted)] font-medium">
              {showQR.itemName} <span className="mx-1.5">•</span> {showQR.currentStock} {showQR.uom} in stock
            </p>
            <div className="flex items-center justify-center gap-3 mt-6 p-3 bg-[rgba(255,255,255,0.02)] rounded-[var(--radius-sm)] border border-[var(--border-color)]">
              <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Pack Qty:</span>
              <input
                type="number"
                className="w-20 px-3 py-1.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded text-sm font-bold focus:border-[var(--primary-500)] outline-none text-center text-[var(--text-primary)]"
                value={qrPackQty}
                min={1}
                onChange={(e) => setQrPackQty(Number(e.target.value))}
                onBlur={() => openQR(showQR.item, qrPackQty)}
              />
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Detail Modal */}
      <DetailModal
        isOpen={!!showDetail}
        onClose={() => setShowDetail(null)}
        title={`Item Details — ${showDetail?.itemCode || ''}`}
        data={showDetail}
        fields={[
          { label: 'Item Code', key: 'itemCode' },
          { label: 'Item Name', key: 'itemName' },
          { label: 'Stock', key: 'stock', render: (v) => <span style={{ fontWeight: 700 }}>{v}</span> },
          { label: 'UOM', key: 'uom' },
          { label: 'Category', key: 'category' },
          { label: 'Min Stock', key: 'minStock' },
          { label: 'Low Stock', key: 'isLowStock', render: (v) => v ? '⚠ Yes' : 'No' },
          { label: 'Description', key: 'description', render: (v) => v || '—' },
          { label: 'Created', key: 'createdAt', render: (v) => v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—' },
          { label: 'Updated', key: 'updatedAt', render: (v) => v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—' },
        ]}
      />
    </div>
  );
};

export default Inventory;