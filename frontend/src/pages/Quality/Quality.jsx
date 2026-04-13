import { useState, useEffect, useRef } from 'react';
import { qualityAPI } from '../../services/api';
import Modal from '../../components/Modal';
import DetailModal from '../../components/DetailModal';
import { HiOutlineShieldCheck, HiOutlineCheck, HiOutlineX } from 'react-icons/hi';
import toast from 'react-hot-toast';

const Quality = () => {
  const [inspections, setInspections] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Reject modal (full reject)
  const [showReject, setShowReject] = useState(null);
  const [remarks, setRemarks] = useState('');

  // Split-approval modal
  const [showSplit, setShowSplit] = useState(null); // the inspection object
  const [approvedQty, setApprovedQty] = useState(0);
  const [rejectedQty, setRejectedQty] = useState(''); // <--- FIX: Start as empty string, not 0
  const [rejectReason, setRejectReason] = useState('');
  const [showDetail, setShowDetail] = useState(null);
  
  // Auto-focus and red error styling
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const rejectReasonRef = useRef(null);

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

  // Open split-approval modal
  const openSplitApproval = (insp) => {
    setShowSplit(insp);
    setApprovedQty(insp.quantity); // default: approve all
    setRejectedQty('');            // <--- FIX: Start completely empty
    setRejectReason('');
    setHasAttemptedSubmit(false);  // Reset the error state when opening
  };

  // Handle approved qty change — auto-calc rejected
  const onApprovedChange = (val) => {
    if (val === '') {
      setApprovedQty('');
      setRejectedQty(showSplit.quantity);
      return;
    }
    const parsed = parseInt(val, 10);
    if (isNaN(parsed)) return;
    const v = Math.max(0, Math.min(showSplit.quantity, parsed));
    setApprovedQty(v);
    setRejectedQty(showSplit.quantity - v === 0 ? '' : showSplit.quantity - v);
  };

  // Handle rejected qty change — auto-calc approved
  const onRejectedChange = (val) => {
    if (val === '') {
      setRejectedQty('');
      setApprovedQty(showSplit.quantity);
      return;
    }
    const parsed = parseInt(val, 10);
    if (isNaN(parsed)) return;
    const v = Math.max(0, Math.min(showSplit.quantity, parsed));
    setRejectedQty(v);
    setApprovedQty(showSplit.quantity - v === 0 ? '' : showSplit.quantity - v);
  };

  // Safely convert to numbers for math & API (treats empty string as 0)
  const numApproved = approvedQty === '' ? 0 : Number(approvedQty);
  const numRejected = rejectedQty === '' ? 0 : Number(rejectedQty);
  const splitQuantity = showSplit?.quantity || 0;
  const isValidSplit = (numApproved + numRejected) === splitQuantity;

  // Submit split-approval
  const handleSplitApprove = async () => {
    setHasAttemptedSubmit(true);

    if (!isValidSplit) {
      return toast.error(`Approved + Rejected must equal ${splitQuantity}`);
    }
    
    // Validate reason and AUTO-FOCUS if missing
    if (numRejected > 0 && !rejectReason.trim()) {
      toast.error('Rejection reason is required');
      
      setTimeout(() => {
        if (rejectReasonRef.current) {
          rejectReasonRef.current.focus();
        }
      }, 50);
      
      return; 
    }

    setSubmitting(true);
    try {
      const res = await qualityAPI.partialApprove(showSplit._id, {
        approvedQty: numApproved,
        rejectedQty: numRejected,
        reason: rejectReason.trim(),
        remarks: `Approved: ${numApproved}, Rejected: ${numRejected}`,
      });
      toast.success(res.message);
      setShowSplit(null);
      loadInspections();
    } catch (err) {
      toast.error(err.message);
    }
    setSubmitting(false);
  };

  // Full reject
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
    const map = {
      PENDING: 'badge badge-warning',
      APPROVED: 'badge badge-success',
      PARTIAL_APPROVED: 'badge badge-info',
      REJECTED: 'badge badge-danger',
    };
    return <span className={map[s] || 'badge'}>{s === 'PARTIAL_APPROVED' ? 'Partial' : s}</span>;
  };

  const formatDate = (d) => {
    return new Date(d).toLocaleString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const isReasonError = hasAttemptedSubmit && numRejected > 0 && !rejectReason.trim();

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Quality Inspections</h1>
      </div>

      {/* Filter */}
      <div className="filter-bar">
        <select className="form-control" style={{ width: 180 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option className="bg-[var(--bg-tertiary)] " value="">All Status</option>
          <option className="bg-[var(--bg-tertiary)] " value="PENDING">Pending</option>
          <option className="bg-[var(--bg-tertiary)] " value="APPROVED">Approved</option>
          <option className="bg-[var(--bg-tertiary)] " value="PARTIAL_APPROVED">Partial Approved</option>
          <option className="bg-[var(--bg-tertiary)] " value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-page"><div className="spinner" /></div>
      ) : inspections.length === 0 ? (
        <div className="empty-state">
          <HiOutlineShieldCheck className="empty-state-icon" />
          <h3>No inspections</h3>
          <p>Quality inspections will appear when PO materials are received</p>
        </div>
      ) : (
        <>
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
                  <th>Approved</th>
                  <th>Rejected</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {inspections.map((insp) => (
                  <tr key={insp._id} className="cursor-pointer" onClick={() => setShowDetail(insp)}>
                    <td className="text-muted text-sm">{formatDate(insp.createdAt)}</td>
                    <td className="font-semibold">{insp.purchaseOrder?.poNumber || '—'}</td>
                    <td><span className="text-accent font-semibold">{insp.itemCode}</span></td>
                    <td>{insp.itemName}</td>
                    <td><span className="font-bold">{insp.quantity}</span></td>
                    <td>{statusBadge(insp.status)}</td>
                    <td className="font-semibold" style={{ color: 'var(--success)' }}>
                      {insp.approvedQty != null ? insp.approvedQty : '—'}
                    </td>
                    <td className="font-semibold" style={{ color: 'var(--danger)' }}>
                      {insp.rejectedQty != null ? insp.rejectedQty : '—'}
                    </td>
                    <td>
                      {insp.status === 'PENDING' && (
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <button className="btn btn-success btn-sm" onClick={() => openSplitApproval(insp)} disabled={submitting}>
                            <HiOutlineCheck /> Inspect
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => setShowReject(insp)}>
                            <HiOutlineX /> Reject All
                          </button>
                        </div>
                      )}
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

      {/* ── Split-Approval Modal ── */}
      <Modal
        isOpen={!!showSplit}
        onClose={() => setShowSplit(null)}
        title="Quality Inspection — Split Approval"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowSplit(null)}>Cancel</button>
            <button
              className="btn btn-success"
              onClick={handleSplitApprove}
              disabled={submitting || !isValidSplit}
            >
              {submitting ? 'Processing...' : 'Approve'}
            </button>
          </>
        }
      >
        {showSplit && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* Item info */}
            <div className="scan-item-info" style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem' }}>
              <div className="scan-info-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span className="scan-info-label" style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Item Code</span>
                <span className="text-accent font-bold">{showSplit.itemCode}</span>
              </div>
              <div className="scan-info-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span className="scan-info-label" style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Item Name</span>
                <span className="font-semibold">{showSplit.itemName}</span>
              </div>
              <div className="scan-info-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="scan-info-label" style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Received</span>
                <span className="font-bold" style={{ fontSize: '1.1rem' }}>{splitQuantity} {showSplit.uom || ''}</span>
              </div>
            </div>

            {/* Quantity inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--success)' }}>✓ Approved Qty</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="0"
                  value={approvedQty}
                  min={0}
                  max={splitQuantity}
                  onChange={(e) => onApprovedChange(e.target.value)}
                  onFocus={(e) => e.target.select()} // <-- FIX: Highlights text on click
                  style={{ fontSize: '1.1rem', fontWeight: 700, borderColor: 'rgba(34, 197, 94, 0.3)' }}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--danger)' }}>✗ Rejected Qty</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="0"
                  value={rejectedQty}
                  min={0}
                  max={splitQuantity}
                  onChange={(e) => onRejectedChange(e.target.value)}
                  onFocus={(e) => e.target.select()} // <-- FIX: Highlights text on click
                  style={{ fontSize: '1.1rem', fontWeight: 700, borderColor: 'rgba(239, 68, 68, 0.3)' }}
                />
              </div>
            </div>

            {/* Validation bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              background: isValidSplit ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${isValidSplit ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
            }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {numApproved} + {numRejected} = {numApproved + numRejected}
              </span>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isValidSplit ? 'var(--success)' : 'var(--danger)' }}>
                {isValidSplit ? '✓ Valid' : `Must equal ${splitQuantity}`}
              </span>
            </div>

            {/* Visual split bar */}
            <div style={{ borderRadius: 6, overflow: 'hidden', height: 8, display: 'flex', background: 'var(--bg-tertiary)' }}>
              {numApproved > 0 && (
                <div style={{ width: `${(numApproved / splitQuantity) * 100}%`, background: 'linear-gradient(90deg, #16a34a, #22c55e)', transition: 'width 0.3s ease' }} />
              )}
              {numRejected > 0 && (
                <div style={{ width: `${(numRejected / splitQuantity) * 100}%`, background: 'linear-gradient(90deg, #dc2626, #ef4444)', transition: 'width 0.3s ease' }} />
              )}
            </div>

            {/* Reason for rejection with Error Styles */}
            {numRejected > 0 && (
              <div className="form-group">
                <label 
                  className="form-label" 
                  style={{ color: isReasonError ? 'var(--danger)' : 'var(--text-secondary)' }}
                >
                  Reason for Rejection <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <textarea
                  ref={rejectReasonRef}
                  className="form-control"
                  rows={2}
                  style={{
                    backgroundColor: isReasonError ? 'rgba(239, 68, 68, 0.08)' : '',
                    borderColor: isReasonError ? 'var(--danger)' : '',
                    boxShadow: isReasonError ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : ''
                  }}
                  placeholder="Enter reason for rejection..."
                  value={rejectReason}
                  onChange={(e) => {
                    setRejectReason(e.target.value);
                    setHasAttemptedSubmit(false);
                  }}
                />
                
                {isReasonError && (
                  <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.35rem', fontWeight: 500 }}>
                    Please provide a reason for the rejected items.
                  </p>
                )}
              </div>
            )}

            {/* Summary */}
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              {numApproved > 0 && <p>→ <strong style={{ color: 'var(--success)' }}>{numApproved}</strong> units will be added to <strong>Inventory</strong></p>}
              {numRejected > 0 && <p>→ <strong style={{ color: 'var(--danger)' }}>{numRejected}</strong> units will be saved as <strong>Rejected / Bad Product</strong></p>}
            </div>
          </div>
        )}
      </Modal>

      {/* ── Full Reject Modal ── */}
      <Modal isOpen={!!showReject} onClose={() => setShowReject(null)} title="Reject Inspection"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowReject(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleReject} disabled={submitting}>{submitting ? 'Rejecting...' : 'Reject All'}</button>
          </>
        }
      >
        <p style={{ marginBottom: '1rem' }}>
          Rejecting <strong>{showReject?.itemCode}</strong> — {showReject?.quantity} units
        </p>
        <div className="form-group">
          <label className="form-label">Rejection Reason *</label>
          <textarea
            className="form-control"
            rows={3}
            placeholder="Enter reason for rejection..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            autoFocus
          />
        </div>
      </Modal>

      <DetailModal
        isOpen={!!showDetail}
        onClose={() => setShowDetail(null)}
        title={`Inspection Details — ${showDetail?.itemCode || ''}`}
        data={showDetail}
        fields={[
          { label: 'Date', key: 'createdAt', render: (v) => v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'medium' }) : '—' },
          { label: 'PO Number', key: 'purchaseOrder.poNumber', render: (v) => v || '—' },
          { label: 'Item Code', key: 'itemCode' },
          { label: 'Item Name', key: 'itemName' },
          { label: 'Total Quantity', key: 'quantity', render: (v) => <span style={{ fontWeight: 700 }}>{v}</span> },
          { label: 'UOM', key: 'uom', render: (v) => v || '—' },
          { label: 'Status', key: 'status' },
          { label: 'Approved Qty', key: 'approvedQty', render: (v) => v != null ? <span style={{ color: 'var(--success)', fontWeight: 700 }}>{v}</span> : '—' },
          { label: 'Rejected Qty', key: 'rejectedQty', render: (v) => v != null ? <span style={{ color: 'var(--danger)', fontWeight: 700 }}>{v}</span> : '—' },
          { label: 'Rejection Reason', key: 'rejectionReason', render: (v) => v || '—' },
          { label: 'Inspected By', key: 'inspectedBy.name', render: (v) => v || '—' },
          { label: 'Remarks', key: 'remarks', render: (v) => v || '—' },
        ]}
      />
    </div>
  );
};

export default Quality;