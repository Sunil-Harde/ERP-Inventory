import { useState, useEffect } from 'react';
import { purchaseAPI } from '../../services/api';
import Modal from '../../components/Modal';
import { HiOutlinePlus, HiOutlineSearch, HiOutlineShoppingCart, HiOutlineCheck, HiOutlineTrash } from 'react-icons/hi';
import toast from 'react-hot-toast';

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

  const [form, setForm] = useState({ supplier: '', remarks: '', items: [{ itemCode: '', itemName: '', quantity: '', uom: 'PCS' }] });
  const [receiveItems, setReceiveItems] = useState([]);

  useEffect(() => { loadOrders(); }, [page, status]);

  const loadOrders = async () => {
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (status) params.set('status', status);
      const res = await purchaseAPI.list(params.toString());
      setOrders(res.data);
      setTotal(res.total);
      setPages(res.pages);
    } catch (err) {
      toast.error('Failed to load purchase orders');
    }
    setLoading(false);
  };

  const addItem = () => {
    setForm({ ...form, items: [...form.items, { itemCode: '', itemName: '', quantity: '', uom: 'PCS' }] });
  };

  const removeItem = (index) => {
    if (form.items.length <= 1) return;
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
  };

  const updateItem = (index, field, value) => {
    const items = [...form.items];
    items[index][field] = value;
    setForm({ ...form, items });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        supplier: form.supplier,
        remarks: form.remarks,
        items: form.items.map(i => ({ ...i, quantity: Number(i.quantity) })),
      };
      await purchaseAPI.create(payload);
      toast.success('Purchase order created');
      setShowCreate(false);
      setForm({ supplier: '', remarks: '', items: [{ itemCode: '', itemName: '', quantity: '', uom: 'PCS' }] });
      loadOrders();
    } catch (err) {
      toast.error(err.message);
    }
    setSubmitting(false);
  };

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
      const items = receiveItems.filter(i => i.receivedQty > 0).map(i => ({ itemCode: i.itemCode, receivedQty: i.receivedQty }));
      if (items.length === 0) return toast.error('Enter received quantities');
      const res = await purchaseAPI.receive(showReceive._id, { receivedItems: items });
      toast.success(res.message);
      setShowReceive(null);
      loadOrders();
    } catch (err) {
      toast.error(err.message);
    }
    setSubmitting(false);
  };

  const statusBadge = (s) => {
    const map = {
      ORDERED: 'badge-info',
      PARTIALLY_RECEIVED: 'badge-warning',
      RECEIVED: 'badge-success',
    };
    return <span className={`badge ${map[s] || 'badge-neutral'}`}>{s.replace('_', ' ')}</span>;
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { dateStyle: 'medium' });

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Purchase Orders</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <HiOutlinePlus /> Create PO
        </button>
      </div>

      <div className="filter-bar">
        <select className="form-control" style={{ width: 200 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="ORDERED">Ordered</option>
          <option value="PARTIALLY_RECEIVED">Partially Received</option>
          <option value="RECEIVED">Received</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-page"><div className="spinner" /></div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <HiOutlineShoppingCart className="empty-state-icon" />
          <h3>No purchase orders</h3>
          <p>Create your first purchase order</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Supplier</th>
                <th>Items</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((po) => (
                <tr key={po._id}>
                  <td><span className="font-semibold text-accent">{po.poNumber}</span></td>
                  <td>{po.supplier}</td>
                  <td>{po.items.length} items</td>
                  <td>{statusBadge(po.status)}</td>
                  <td className="text-sm text-muted">{formatDate(po.createdAt)}</td>
                  <td>
                    {po.status !== 'RECEIVED' && (
                      <button className="btn btn-success btn-sm" onClick={() => openReceive(po)}>
                        <HiOutlineCheck /> Receive
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create PO Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Purchase Order" wide
        footer={<><button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button><button className="btn btn-primary" onClick={handleCreate} disabled={submitting}>{submitting ? 'Creating...' : 'Create PO'}</button></>}>
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Supplier *</label>
            <input className="form-control" placeholder="Supplier name" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} required />
          </div>
          <label className="form-label">Items</label>
          {form.items.map((item, idx) => (
            <div key={idx} className="form-row" style={{ marginBottom: '0.5rem', alignItems: 'end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <input className="form-control" placeholder="Item Code" value={item.itemCode} onChange={(e) => updateItem(idx, 'itemCode', e.target.value)} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <input className="form-control" placeholder="Item Name" value={item.itemName} onChange={(e) => updateItem(idx, 'itemName', e.target.value)} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <input type="number" className="form-control" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} min={1} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <select className="form-control" value={item.uom} onChange={(e) => updateItem(idx, 'uom', e.target.value)}>
                  <option>PCS</option><option>KG</option><option>LTR</option><option>MTR</option><option>BOX</option><option>NOS</option>
                </select>
              </div>
              {form.items.length > 1 && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeItem(idx)}><HiOutlineTrash /></button>
              )}
            </div>
          ))}
          <button type="button" className="btn btn-secondary btn-sm" onClick={addItem} style={{ marginTop: '0.5rem' }}>
            <HiOutlinePlus /> Add Item
          </button>
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label">Remarks</label>
            <textarea className="form-control" rows={2} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
          </div>
        </form>
      </Modal>

      {/* Receive Materials Modal */}
      <Modal isOpen={!!showReceive} onClose={() => setShowReceive(null)} title={`Receive — ${showReceive?.poNumber}`} wide
        footer={<><button className="btn btn-secondary" onClick={() => setShowReceive(null)}>Cancel</button><button className="btn btn-success" onClick={handleReceive} disabled={submitting}>{submitting ? 'Processing...' : 'Confirm Receipt'}</button></>}>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr><th>Item Code</th><th>Item Name</th><th>Ordered</th><th>Already Recv</th><th>Receive Now</th></tr>
            </thead>
            <tbody>
              {receiveItems.map((item, idx) => (
                <tr key={idx}>
                  <td className="font-semibold">{item.itemCode}</td>
                  <td>{item.itemName}</td>
                  <td>{item.ordered}</td>
                  <td>{item.alreadyReceived}</td>
                  <td>
                    <input type="number" className="form-control" style={{ width: 100 }}
                      value={item.receivedQty} min={0} max={item.ordered - item.alreadyReceived}
                      onChange={(e) => {
                        const arr = [...receiveItems];
                        arr[idx].receivedQty = Number(e.target.value);
                        setReceiveItems(arr);
                      }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
};

export default Purchase;
