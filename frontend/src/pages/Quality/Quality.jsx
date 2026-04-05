import { useState, useEffect } from 'react';
import { qualityAPI } from '../../services/api';
import Modal from '../../components/Modal';
import { HiOutlineShieldCheck, HiOutlineCheck, HiOutlineX } from 'react-icons/hi';
import toast from 'react-hot-toast';

const Quality = () => {
  const [inspections, setInspections] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [showReject, setShowReject] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadInspections(); }, [page, status]);

  const loadInspections = async () => {
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (status) params.set('status', status);
      const res = await qualityAPI.list(params.toString());
      setInspections(res.data);
      setTotal(res.total);
      setPages(res.pages);
    } catch (err) {
      toast.error('Failed to load inspections');
    }
    setLoading(false);
  };

  const handleApprove = async (id) => {
    if (!confirm('Approve this inspection? Stock will be auto-added to inventory.')) return;
    setSubmitting(true);
    try {
      const res = await qualityAPI.approve(id, { remarks: 'Approved' });
      toast.success(res.message);
      loadInspections();
    } catch (err) {
      toast.error(err.message);
    }
    setSubmitting(false);
  };

  const handleReject = async () => {
    if (!remarks.trim()) return toast.error('Remarks required');
    setSubmitting(true);
    try {
      const res = await qualityAPI.reject(showReject._id, { remarks });
      toast.success(res.message);
      setShowReject(null);
      setRemarks('');
      loadInspections();
    } catch (err) {
      toast.error(err.message);
    }
    setSubmitting(false);
  };

  const statusBadge = (s) => {
    const map = { PENDING: 'badge-warning', APPROVED: 'badge-success', REJECTED: 'badge-danger' };
    return <span className={`badge ${map[s]}`}>{s}</span>;
  };

  const formatDate = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Quality Inspections</h1>
      </div>

      <div className="filter-bar">
        <select className="form-control" style={{ width: 180 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-page"><div className="spinner" /></div>
      ) : inspections.length === 0 ? (
        <div className="empty-state">
          <HiOutlineShieldCheck className="empty-state-icon" />
          <h3>No inspections</h3>
          <p>Quality inspections will appear when PO materials are received</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>PO</th>
                <th>Item Code</th>
                <th>Item Name</th>
                <th>Quantity</th>
                <th>Status</th>
                <th>Remarks</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {inspections.map((insp) => (
                <tr key={insp._id}>
                  <td className="text-sm text-muted">{formatDate(insp.createdAt)}</td>
                  <td className="font-semibold">{insp.purchaseOrder?.poNumber || '—'}</td>
                  <td className="text-accent font-semibold">{insp.itemCode}</td>
                  <td>{insp.itemName}</td>
                  <td className="font-bold">{insp.quantity}</td>
                  <td>{statusBadge(insp.status)}</td>
                  <td className="text-sm text-muted truncate" style={{ maxWidth: 180 }}>{insp.remarks || '—'}</td>
                  <td>
                    {insp.status === 'PENDING' && (
                      <div className="flex gap-1">
                        <button className="btn btn-success btn-sm" onClick={() => handleApprove(insp._id)} disabled={submitting}>
                          <HiOutlineCheck /> Approve
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => setShowReject(insp)}>
                          <HiOutlineX /> Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Modal */}
      <Modal isOpen={!!showReject} onClose={() => setShowReject(null)} title="Reject Inspection"
        footer={<><button className="btn btn-secondary" onClick={() => setShowReject(null)}>Cancel</button><button className="btn btn-danger" onClick={handleReject} disabled={submitting}>{submitting ? 'Rejecting...' : 'Reject'}</button></>}>
        <p style={{ marginBottom: '1rem' }}>
          Rejecting <strong>{showReject?.itemCode}</strong> — {showReject?.quantity} units
        </p>
        <div className="form-group">
          <label className="form-label">Rejection Reason *</label>
          <textarea className="form-control" rows={3} placeholder="Enter reason for rejection..." value={remarks} onChange={(e) => setRemarks(e.target.value)} autoFocus />
        </div>
      </Modal>
    </div>
  );
};

export default Quality;
