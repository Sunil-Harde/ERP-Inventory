import { useState, useEffect } from 'react';
import { inventoryAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';
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
  const [showQR, setShowQR] = useState(null); // { item, qrData }
  const [qrLoading, setQrLoading] = useState(false);
  const [qrPackQty, setQrPackQty] = useState(1);

  // Form states
  const [form, setForm] = useState({ itemCode: '', itemName: '', uom: '', category: '', minStock: 10, description: '' });
  const [qrData, setQrData] = useState('');
  const [issueForm, setIssueForm] = useState({ itemCode: '', quantity: '', remarks: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadItems();
  }, [page, search, category]);

  const loadItems = async () => {
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
    }
    setLoading(false);
  };

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
    }
    setSubmitting(false);
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
    }
    setSubmitting(false);
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
    }
    setSubmitting(false);
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
    }
    setSubmitting(false);
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
    if (item.stock <= 0) return <span className="badge badge-danger">Out of Stock</span>;
    if (item.isLowStock) return <span className="badge badge-warning">Low Stock</span>;
    return <span className="badge badge-success">In Stock</span>;
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
    }
    setQrLoading(false);
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <h1>Inventory</h1>
        <div className="page-header-actions">
          {hasRole('ADMIN', 'STAFF_STORE', 'STAFF_QUALITY') && (
            <button className="btn btn-success" onClick={() => setShowInward(true)}>
              <HiOutlineArrowDown /> Inward
            </button>
          )}
          {hasRole('ADMIN', 'STAFF_STORE', 'STAFF_RND') && (
            <button className="btn btn-warning" onClick={() => setShowIssue(true)}>
              <HiOutlineArrowUp /> Issue
            </button>
          )}
          {hasRole('ADMIN', 'STAFF_STORE') && (
            <button className="btn btn-primary" onClick={() => { setForm({ itemCode: '', itemName: '', uom: '', category: '', minStock: 10, description: '' }); setShowCreate(true); }}>
              <HiOutlinePlus /> Add Item
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-input">
          <HiOutlineSearch className="search-icon" />
          <input
            type="text"
            className="form-control"
            placeholder="Search items..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="form-control" style={{ width: 180 }} value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
          <option value="">All Categories</option>
          <option value="Raw Material">Raw Material</option>
          <option value="Consumable">Consumable</option>
          <option value="Packaging">Packaging</option>
          <option value="Chemical">Chemical</option>
          <option value="General">General</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-page"><div className="spinner" /></div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <HiOutlineCube className="empty-state-icon" />
          <h3>No items found</h3>
          <p>Add your first inventory item to get started</p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item Code</th>
                  <th>Item Name</th>
                  <th>Stock</th>
                  <th>UOM</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id}>
                    <td><span className="font-semibold text-accent">{item.itemCode}</span></td>
                    <td>{item.itemName}</td>
                    <td><span className="font-bold">{item.stock}</span></td>
                    <td>{item.uom}</td>
                    <td><span className="badge badge-neutral">{item.category}</span></td>
                    <td>{getStockStatus(item)}</td>
                    <td>
                      <div className="flex gap-1">
                        <button className="btn btn-ghost btn-sm" title="View QR" onClick={() => openQR(item, item.minStock || 1)}>
                          <HiOutlineQrcode />
                        </button>
                        {hasRole('ADMIN', 'STAFF_STORE') && (
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)}>
                            <HiOutlinePencil />
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
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
              {[...Array(Math.min(pages, 5))].map((_, i) => {
                const p = i + 1;
                return <button key={p} className={page === p ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>;
              })}
              <span className="pagination-info">{total} items</span>
              <button disabled={page >= pages} onClick={() => setPage(page + 1)}>›</button>
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add New Item"
        footer={<><button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button><button className="btn btn-primary" onClick={handleCreate} disabled={submitting}>{submitting ? 'Saving...' : 'Create Item'}</button></>}>
        <form onSubmit={handleCreate}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Item Code *</label>
              <input className="form-control" placeholder="e.g., RM-001" value={form.itemCode} onChange={(e) => setForm({ ...form, itemCode: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Item Name *</label>
              <input className="form-control" placeholder="e.g., Steel Rod" value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">UOM *</label>
              <select className="form-control" value={form.uom} onChange={(e) => setForm({ ...form, uom: e.target.value })} required>
                <option value="">Select</option>
                <option value="KG">KG</option>
                <option value="PCS">PCS</option>
                <option value="LTR">LTR</option>
                <option value="MTR">MTR</option>
                <option value="BOX">BOX</option>
                <option value="NOS">NOS</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select className="form-control" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
                <option value="">Select</option>
                <option value="Raw Material">Raw Material</option>
                <option value="Consumable">Consumable</option>
                <option value="Packaging">Packaging</option>
                <option value="Chemical">Chemical</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Min Stock (Low stock threshold)</label>
            <input type="number" className="form-control" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })} min={0} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-control" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!showEdit} onClose={() => setShowEdit(null)} title="Edit Item"
        footer={<><button className="btn btn-secondary" onClick={() => setShowEdit(null)}>Cancel</button><button className="btn btn-primary" onClick={handleUpdate} disabled={submitting}>{submitting ? 'Saving...' : 'Update Item'}</button></>}>
        <form onSubmit={handleUpdate}>
          <div className="form-group">
            <label className="form-label">Item Code</label>
            <input className="form-control" value={form.itemCode} disabled />
          </div>
          <div className="form-group">
            <label className="form-label">Item Name</label>
            <input className="form-control" value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">UOM</label>
              <select className="form-control" value={form.uom} onChange={(e) => setForm({ ...form, uom: e.target.value })}>
                <option value="KG">KG</option><option value="PCS">PCS</option><option value="LTR">LTR</option><option value="MTR">MTR</option><option value="BOX">BOX</option><option value="NOS">NOS</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-control" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="Raw Material">Raw Material</option><option value="Consumable">Consumable</option><option value="Packaging">Packaging</option><option value="Chemical">Chemical</option><option value="General">General</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Min Stock</label>
            <input type="number" className="form-control" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })} min={0} />
          </div>
        </form>
      </Modal>

      {/* Inward Modal */}
      <Modal isOpen={showInward} onClose={() => setShowInward(false)} title="Stock Inward (QR Scan)"
        footer={<><button className="btn btn-secondary" onClick={() => setShowInward(false)}>Cancel</button><button className="btn btn-success" onClick={handleInward} disabled={submitting}>{submitting ? 'Processing...' : 'Process Inward'}</button></>}>
        <form onSubmit={handleInward}>
          <div className="form-group">
            <label className="form-label">QR Data (ITEMCODE|PACKQTY)</label>
            <div className="input-icon-wrapper">
              <HiOutlineQrcode className="input-icon" />
              <input className="form-control" style={{ paddingLeft: '2.5rem' }} placeholder="e.g., RM-001|50" value={qrData} onChange={(e) => setQrData(e.target.value)} autoFocus required />
            </div>
            <p className="text-xs text-muted" style={{ marginTop: 6 }}>Scan QR code or enter data in format: ITEMCODE|QUANTITY</p>
          </div>
        </form>
      </Modal>

      {/* Issue Modal */}
      <Modal isOpen={showIssue} onClose={() => setShowIssue(false)} title="Stock Issue"
        footer={<><button className="btn btn-secondary" onClick={() => setShowIssue(false)}>Cancel</button><button className="btn btn-warning" onClick={handleIssue} disabled={submitting}>{submitting ? 'Processing...' : 'Issue Stock'}</button></>}>
        <form onSubmit={handleIssue}>
          <div className="form-group">
            <label className="form-label">Item Code *</label>
            <input className="form-control" placeholder="e.g., RM-001" value={issueForm.itemCode} onChange={(e) => setIssueForm({ ...issueForm, itemCode: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Quantity *</label>
            <input type="number" className="form-control" placeholder="Enter quantity" value={issueForm.quantity} onChange={(e) => setIssueForm({ ...issueForm, quantity: e.target.value })} min={1} required />
          </div>
          <div className="form-group">
            <label className="form-label">Remarks</label>
            <textarea className="form-control" rows={2} value={issueForm.remarks} onChange={(e) => setIssueForm({ ...issueForm, remarks: e.target.value })} placeholder="Optional" />
          </div>
        </form>
      </Modal>
      {/* QR Code Modal */}
      <Modal isOpen={!!showQR} onClose={() => setShowQR(null)} title={`QR Code — ${showQR?.item?.itemCode || ''}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowQR(null)}>Close</button>
            {showQR?.qrImage && (
              <button className="btn btn-primary" onClick={() => {
                const win = window.open();
                win.document.write(`<img src="${showQR.qrImage}" style="display:block;margin:auto;max-width:300px"><p style="text-align:center;font-family:monospace;font-size:14px">${showQR.qrString}</p>`);
                win.print();
              }}>🖨 Print</button>
            )}
          </>
        }>
        {qrLoading ? (
          <div className="loading-page"><div className="spinner" /></div>
        ) : showQR?.qrImage ? (
          <div style={{ textAlign: 'center' }}>
            <img src={showQR.qrImage} alt="QR Code" style={{ width: 220, height: 220, margin: '0 auto 1rem', borderRadius: 8, border: '1px solid var(--border-color)' }} />
            <p style={{ fontFamily: 'monospace', fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{showQR.qrString}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{showQR.itemName} · {showQR.currentStock} {showQR.uom} in stock</p>
            <div className="flex gap-1" style={{ justifyContent: 'center', marginTop: '1rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Pack Qty:</span>
              <input type="number" className="form-control" style={{ width: 80 }} value={qrPackQty} min={1}
                onChange={(e) => { setQrPackQty(Number(e.target.value)); }}
                onBlur={() => openQR(showQR.item, qrPackQty)} />
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default Inventory;
