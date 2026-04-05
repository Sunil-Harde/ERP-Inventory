import { useState, useEffect } from 'react';
import { rndAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';
import {
  HiOutlinePlus, HiOutlineBeaker, HiOutlineCheck, HiOutlineX,
  HiOutlineTrash, HiOutlineTruck
} from 'react-icons/hi';
import toast from 'react-hot-toast';

const RnD = () => {
  const { hasRole } = useAuth();
  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showReject, setShowReject] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    purpose: '',
    items: [{ itemCode: '', itemName: '', quantity: '', uom: 'PCS' }],
  });

  useEffect(() => { loadRequests(); }, [page, status]);

  const loadRequests = async () => {
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (status) params.set('status', status);
      const res = await rndAPI.listRequests(params.toString());
      setRequests(res.data);
      setTotal(res.total);
      setPages(res.pages);
    } catch (err) {
      toast.error('Failed to load requests');
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
        purpose: form.purpose,
        items: form.items.map(i => ({ ...i, quantity: Number(i.quantity) })),
      };
      await rndAPI.createRequest(payload);
      toast.success('R&D request created');
      setShowCreate(false);
      setForm({ purpose: '', items: [{ itemCode: '', itemName: '', quantity: '', uom: 'PCS' }] });
      loadRequests();
    } catch (err) {
      toast.error(err.message);
    }
    setSubmitting(false);
  };

  const handleApprove = async (id) => {
    setSubmitting(true);
    try {
      await rndAPI.approve(id, {});
      toast.success('Request approved');
      loadRequests();
    } catch (err) {
      toast.error(err.message);
    }
    setSubmitting(false);
  };

  const handleReject = async () => {
    if (!remarks.trim()) return toast.error('Remarks required');
    setSubmitting(true);
    try {
      await rndAPI.reject(showReject._id, { remarks });
      toast.success('Request rejected');
      setShowReject(null);
      setRemarks('');
      loadRequests();
    } catch (err) {
      toast.error(err.message);
    }
    setSubmitting(false);
  };

  const handleIssue = async (id) => {
    if (!confirm('Issue materials for this request? Stock will be deducted.')) return;
    setSubmitting(true);
    try {
      const res = await rndAPI.issue(id);
      toast.success(res.message);
      loadRequests();
    } catch (err) {
      toast.error(err.message);
    }
    setSubmitting(false);
  };

  const statusBadge = (s) => {
    const map = { PENDING: 'badge-warning', APPROVED: 'badge-info', ISSUED: 'badge-success', REJECTED: 'badge-danger' };
    return <span className={`badge ${map[s]}`}>{s}</span>;
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { dateStyle: 'medium' });

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>R&D Requests</h1>
        {hasRole('ADMIN', 'STAFF_RND') && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <HiOutlinePlus /> New Request
          </button>
        )}
      </div>

      <div className="filter-bar">
        <select className="form-control" style={{ width: 180 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="ISSUED">Issued</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-page"><div className="spinner" /></div>
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <HiOutlineBeaker className="empty-state-icon" />
          <h3>No R&D requests</h3>
          <p>Material requests from R&D will appear here</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Request #</th>
                <th>Purpose</th>
                <th>Items</th>
                <th>Status</th>
                <th>Requested By</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req._id}>
                  <td><span className="font-semibold text-accent">{req.requestNumber}</span></td>
                  <td className="truncate" style={{ maxWidth: 200 }}>{req.purpose}</td>
                  <td>{req.items.length} items</td>
                  <td>{statusBadge(req.status)}</td>
                  <td>{req.requestedBy?.name || '—'}</td>
                  <td className="text-sm text-muted">{formatDate(req.createdAt)}</td>
                  <td>
                    <div className="flex gap-1">
                      {req.status === 'PENDING' && hasRole('ADMIN', 'STAFF_STORE') && (
                        <>
                          <button className="btn btn-success btn-sm" onClick={() => handleApprove(req._id)} disabled={submitting}><HiOutlineCheck /></button>
                          <button className="btn btn-danger btn-sm" onClick={() => setShowReject(req)}><HiOutlineX /></button>
                        </>
                      )}
                      {req.status === 'APPROVED' && hasRole('ADMIN', 'STAFF_STORE') && (
                        <button className="btn btn-primary btn-sm" onClick={() => handleIssue(req._id)} disabled={submitting}>
                          <HiOutlineTruck /> Issue
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

      {/* Create Request Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New R&D Material Request" wide
        footer={<><button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button><button className="btn btn-primary" onClick={handleCreate} disabled={submitting}>{submitting ? 'Creating...' : 'Submit Request'}</button></>}>
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Purpose / Project *</label>
            <textarea className="form-control" rows={2} placeholder="Describe the purpose..." value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} required />
          </div>
          <label className="form-label">Materials Needed</label>
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
        </form>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={!!showReject} onClose={() => setShowReject(null)} title="Reject Request"
        footer={<><button className="btn btn-secondary" onClick={() => setShowReject(null)}>Cancel</button><button className="btn btn-danger" onClick={handleReject} disabled={submitting}>Reject</button></>}>
        <div className="form-group">
          <label className="form-label">Rejection Reason *</label>
          <textarea className="form-control" rows={3} placeholder="Enter reason..." value={remarks} onChange={(e) => setRemarks(e.target.value)} autoFocus />
        </div>
      </Modal>
    </div>
  );
};

export default RnD;
