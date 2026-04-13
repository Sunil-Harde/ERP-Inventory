import { useState, useEffect } from 'react';
import { rndAPI, inventoryAPI } from '../../services/api';
import Modal from '../../components/Modal';
import { HiOutlineCheck, HiOutlineX, HiOutlineEye, HiOutlineExclamationCircle, HiOutlineClipboardCheck } from 'react-icons/hi';
import toast from 'react-hot-toast';

const Shop1 = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [selectedJob, setSelectedJob] = useState(null);
  const [showReject, setShowReject] = useState(false);
  const [remarks, setRemarks] = useState('');

  // Global cache for true, live stock levels from the warehouse
  const [liveStocks, setLiveStocks] = useState({});

  useEffect(() => { loadRequests(); }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      // ✨ THE FIX: We now ask for 'CREATED' jobs, because that is what your BOM backend uses for new recipes!
      const res = await rndAPI.listRequests('status=CREATED');
      const pendingJobs = res.data || [];
      setRequests(pendingJobs);

      // ─────────────────────────────────────────────────────────────
      // LIVE INVENTORY SYNC
      // ─────────────────────────────────────────────────────────────
      const uniqueItemCodes = new Set();
      pendingJobs.forEach(job => {
          (job.items || job.consumedItems || []).forEach(item => {
              if (item.itemCode) uniqueItemCodes.add(item.itemCode);
          });
      });

      const stockMap = {};
      
      // Fetch live stock for all required materials in parallel (super fast)
      await Promise.all(Array.from(uniqueItemCodes).map(async (code) => {
          try {
              const invRes = await inventoryAPI.list(`search=${encodeURIComponent(code)}`);
              const items = invRes.data || invRes;
              
              const match = items.find(inv => inv.itemCode === code || inv.sku === code);
              
              if (match) {
                  stockMap[code] = Number(match.currentStock ?? match.stock ?? 0);
              } else {
                  stockMap[code] = 0; // Item not found in DB
              }
          } catch (e) {
              stockMap[code] = 0;
          }
      }));

      // Save the true stock levels to our state
      setLiveStocks(stockMap);

    } catch (err) { 
      toast.error('Failed to load pending approvals'); 
    }
    setLoading(false);
  };

  const getMaterials = (data) => {
    if (!data) return [];
    return data.items || data.consumedItems || [];
  };

  const getAvailableStock = (item) => {
    return liveStocks[item.itemCode] ?? 0;
  };

  const isJobOutOfStock = (job) => {
    if (!job) return false;
    const materials = getMaterials(job);
    return materials.some(item => getAvailableStock(item) < Number(item.quantity));
  };

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      await rndAPI.approve(selectedJob._id, {});
      toast.success('Recipe Approved for Shop 2');
      setSelectedJob(null);
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
      await rndAPI.reject(selectedJob._id, { remarks });
      toast.success('Request rejected');
      setShowReject(false); 
      setSelectedJob(null);
      setRemarks(''); 
      loadRequests();
    } catch (err) { 
      toast.error(err.message); 
    }
    setSubmitting(false);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-[fadeUp_0.35s_ease] relative z-0">
      
      <div className="flex justify-between items-center mb-7 flex-wrap gap-4">
        <h1 className="text-[1.6rem] font-bold bg-clip-text text-transparent bg-gradient-to-br from-[var(--text-primary)] to-[var(--primary-300)] tracking-[-0.02em] flex items-center gap-3">
          <HiOutlineClipboardCheck className="text-[var(--primary-500)]" /> Shop 1: Pending Approvals
        </h1>
      </div>
      
      {loading ? (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <div className="w-[44px] h-[44px] border-[3px] border-[var(--border-color)] border-t-[var(--primary-500)] rounded-full animate-[spin_0.8s_linear_infinite]" />
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-8 text-[var(--text-muted)] text-center">
          <HiOutlineClipboardCheck className="text-[3.5rem] mb-4 opacity-40" />
          <h3 className="text-[1.15rem] font-semibold text-[var(--text-secondary)] mb-1.5">No Pending Approvals</h3>
          <p className="text-[0.85rem] max-w-[320px] mx-auto">Shop 1 is completely caught up.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-[var(--border-color)] rounded-[var(--radius-lg)] bg-[var(--bg-card)]">
          <table className="w-full text-left border-collapse text-[0.875rem]">
            <thead className="bg-[var(--bg-tertiary)] sticky top-0 z-10">
              <tr>
                <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)] whitespace-nowrap">Job #</th>
                <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)] whitespace-nowrap">Purpose / Product</th>
                <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)] whitespace-nowrap">Materials Summary</th>
                <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)] whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(req => {
                const isShort = isJobOutOfStock(req);
                return (
                  <tr key={req._id} className="hover:bg-[var(--bg-glass)] transition-colors cursor-pointer" onClick={() => setSelectedJob(req)}>
                    <td className="px-4 py-[1rem] border-b border-[var(--border-color)] align-middle text-[var(--text-primary)]">
                      <span className="font-bold text-[var(--primary-400)]">{req.requestNumber || req.bomNumber}</span>
                      <div className="text-xs text-[var(--text-muted)] mt-1">{new Date(req.createdAt).toLocaleDateString()}</div>
                    </td>
                    
                    <td className="px-4 py-[1rem] border-b border-[var(--border-color)] align-middle text-[var(--text-primary)]">
                      <span className="text-[0.9rem] font-bold text-[var(--text-secondary)] block max-w-[250px] truncate">{req.purpose || req.producedItem?.itemName}</span>
                    </td>

                    <td className="px-4 py-[1rem] border-b border-[var(--border-color)] align-middle">
                      <span className="text-[0.85rem] text-[var(--text-secondary)] font-medium">
                        {getMaterials(req).length} items required
                      </span>
                      {isShort && (
                        <div className="text-[0.7rem] font-bold text-[#ef4444] mt-1 flex items-center gap-1">
                          <HiOutlineExclamationCircle /> Missing Stock
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-[1rem] border-b border-[var(--border-color)] align-middle">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedJob(req); }} 
                        className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium transition-all whitespace-nowrap px-[1rem] py-[0.5rem] text-[0.8rem] bg-gradient-to-br from-[var(--primary-600)] to-[var(--primary-500)] text-white hover:-translate-y-[1px] hover:shadow-[0_4px_15px_rgba(99,102,241,0.3)]"
                      >
                        <HiOutlineEye className="text-[1.1rem]" /> Review Job
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Review Job Modal (Checks Live Stock) ── */}
      <Modal 
        isOpen={!!selectedJob && !showReject} 
        onClose={() => setSelectedJob(null)} 
        title="Review Production Request" 
        wide 
        footer={
          <>
            <button 
              className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium transition-all px-[1.25rem] py-[0.6rem] text-[0.875rem] bg-[var(--bg-tertiary)] text-[#ef4444] border border-[var(--border-color)] hover:bg-[#ef4444] hover:text-white" 
              onClick={() => setShowReject(true)}
            >
              <HiOutlineX /> Reject Job
            </button>

            <button 
              className={`inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium transition-all px-[1.25rem] py-[0.6rem] text-[0.875rem] text-white
                ${isJobOutOfStock(selectedJob) 
                  ? 'bg-gray-500 cursor-not-allowed opacity-50' 
                  : 'bg-gradient-to-br from-[#16a34a] to-[#22c55e] hover:-translate-y-[1px] hover:shadow-[0_4px_15px_rgba(34,197,94,0.3)]'}`} 
              onClick={handleApprove}
              disabled={submitting || isJobOutOfStock(selectedJob)}
            >
              {submitting ? 'Processing...' : <><HiOutlineCheck /> Approve For Shop 2</>}
            </button>
          </>
        }
      >
        {selectedJob && (
          <div className="space-y-6">
            
            <div className="bg-[var(--bg-tertiary)] p-4 rounded-md border border-[var(--border-color)]">
              <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Job Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[0.75rem] text-[var(--text-muted)]">Job Number</p>
                  <p className="font-bold text-[var(--text-primary)]">{selectedJob.requestNumber || selectedJob.bomNumber}</p>
                </div>
                <div>
                  <p className="text-[0.75rem] text-[var(--text-muted)]">Purpose / Target Product</p>
                  <p className="font-bold text-[var(--text-primary)]">{selectedJob.purpose || selectedJob.producedItem?.itemName}</p>
                </div>
              </div>
            </div>

            {isJobOutOfStock(selectedJob) && (
              <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 p-3 rounded-md flex items-center gap-3 text-[#ef4444]">
                <HiOutlineExclamationCircle className="text-2xl flex-shrink-0" />
                <div className="text-sm font-semibold">
                  Approval Blocked: One or more required materials are currently out of stock in the warehouse.
                </div>
              </div>
            )}

            <div>
              <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Live Materials Availability</h3>
              <div className="overflow-hidden border border-[var(--border-color)] rounded-md">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[var(--bg-tertiary)]">
                    <tr>
                      <th className="py-2 px-3 text-[var(--text-secondary)] font-semibold">Item</th>
                      <th className="py-2 px-3 text-[var(--text-secondary)] font-semibold text-right">Required</th>
                      <th className="py-2 px-3 text-[var(--text-secondary)] font-semibold text-right">Available</th>
                      <th className="py-2 px-3 text-[var(--text-secondary)] font-semibold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getMaterials(selectedJob).map((item, i) => {
                      const required = Number(item.quantity);
                      const available = getAvailableStock(item);
                      const hasEnough = available >= required;

                      return (
                        <tr key={i} className={`border-t border-[var(--border-color)] ${!hasEnough ? 'bg-[#ef4444]/5' : ''}`}>
                          <td className="py-2 px-3">
                            <div className="font-semibold text-[var(--text-primary)]">{item.itemCode}</div>
                            <div className="text-xs text-[var(--text-muted)]">{item.itemName}</div>
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-[var(--text-primary)]">
                            {required} {item.uom}
                          </td>
                          <td className={`py-2 px-3 text-right font-bold ${hasEnough ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                            {available} {item.uom}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {hasEnough ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#10b981]/10 text-[#10b981]">OK</span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#ef4444]/10 text-[#ef4444]">Shortage</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </Modal>

      {/* ── Rejection Modal ── */}
      <Modal 
        isOpen={showReject} 
        onClose={() => setShowReject(false)} 
        title="Reject Production Request" 
        footer={
          <>
            <button onClick={() => setShowReject(false)} className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium transition-all px-[1.25rem] py-[0.6rem] text-[0.875rem] bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--bg-card-hover)]">Back</button>
            <button onClick={handleReject} disabled={submitting} className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] font-medium transition-all px-[1.25rem] py-[0.6rem] text-[0.875rem] bg-[#ef4444] text-white hover:-translate-y-[1px] hover:shadow-[0_4px_15px_rgba(239,68,68,0.3)] disabled:opacity-50">Confirm Reject</button>
          </>
        }
      >
        <div className="mb-5">
          <label className="block text-[0.8rem] font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-[0.05em]">Reason for rejection *</label>
          <textarea className="w-full px-[0.9rem] py-[0.65rem] bg-[var(--bg-input)] border border-[var(--border-color)] rounded-[var(--radius-sm)] text-[0.9rem] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary-500)] outline-none" rows="3" placeholder="Enter reason (e.g. 'Out of stock for Item XYZ')..." value={remarks} onChange={(e) => setRemarks(e.target.value)} autoFocus />
        </div>
      </Modal>
    </div>
  );
};

export default Shop1;