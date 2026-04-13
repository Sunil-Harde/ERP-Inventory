import { useState, useEffect } from 'react';
import { rndAPI } from '../../services/api';
import Modal from '../../components/Modal';
import { 
  HiOutlineTruck, 
  HiPrinter, 
  HiOutlineCog, 
  HiOutlineEye, 
  HiOutlineDocumentText,
  HiOutlineSearch,
  HiOutlineFilter // ✨ NEW: Filter Icon
} from 'react-icons/hi';
import toast from 'react-hot-toast';

const Shop2 = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [activeTab, setActiveTab] = useState('APPROVED'); 
  const [selectedJob, setSelectedJob] = useState(null);
  const [isReceiptMode, setIsReceiptMode] = useState(false);
  
  // ✨ STATE: Search and Date Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('ALL'); // NEW: Date filter state

  // Reload data and clear filters whenever the user switches tabs
  useEffect(() => { 
    setSearchTerm(''); 
    setDateFilter('ALL'); // Reset date filter on tab switch
    loadRequests(); 
  }, [activeTab]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await rndAPI.listRequests(`status=${activeTab}`);
      setRequests(res.data);
    } catch (err) { 
      toast.error('Failed to load production data'); 
    }
    setLoading(false);
  };

  const handleOpenPreview = (req) => {
    setSelectedJob(req);
    setIsReceiptMode(false); 
  };

  const handleViewHistory = (req) => {
    setSelectedJob(req);
    setIsReceiptMode(true);
  };

  const handleConfirmIssue = async () => {
    setSubmitting(true);
    try {
      const res = await rndAPI.issue(selectedJob._id);
      toast.success('Production Complete! Stock Deducted.');
      
      setSelectedJob({ ...selectedJob, ...(res.data || {}) }); 
      setIsReceiptMode(true); 
      
      loadRequests(); 
    } catch (err) { 
      toast.error(err.message); 
    }
    setSubmitting(false);
  };

  const getMaterials = (data) => {
    if (!data) return [];
    return data.items || data.consumedItems || [];
  };

  const calculateTotalCost = (materials) => {
    return materials.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.price || 0)), 0);
  };

  // ✨ NEW: Combined Filtering Logic (Search + Date)
  const filteredRequests = requests.filter(req => {
    // 1. Text Search Filter
    let matchesText = true;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const jobMatch = (req.requestNumber || req.bomNumber || '').toLowerCase().includes(term);
      const purposeMatch = (req.purpose || '').toLowerCase().includes(term);
      const productMatch = (req.producedItem?.itemName || '').toLowerCase().includes(term);
      matchesText = jobMatch || purposeMatch || productMatch;
    }

    // 2. Date Filter Logic
    let matchesDate = true;
    if (dateFilter !== 'ALL' && (req.createdAt || req.updatedAt)) {
      const reqDate = new Date(req.createdAt || req.updatedAt);
      const now = new Date();
      // Calculate difference in days
      const diffTime = Math.abs(now - reqDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (dateFilter === '7_DAYS') matchesDate = diffDays <= 7;
      else if (dateFilter === '15_DAYS') matchesDate = diffDays <= 15;
      else if (dateFilter === '30_DAYS') matchesDate = diffDays <= 30;
      else if (dateFilter === '1_YEAR') matchesDate = diffDays <= 365;
    }

    return matchesText && matchesDate;
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-[fadeUp_0.35s_ease] relative z-0">
      
      <div className="flex justify-between items-center mb-2 flex-wrap gap-4">
        <h1 className="text-[1.6rem] font-bold bg-clip-text text-transparent bg-gradient-to-br from-[var(--text-primary)] to-[var(--primary-300)] tracking-[-0.02em] flex items-center gap-3">
          <HiOutlineCog className="text-[var(--primary-500)]" /> Shop 2: Production
        </h1>
      </div>

      {/* ── Tabs & Filters Row ── */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 border-b border-[var(--border-color)] pb-4 xl:pb-0">
        
        {/* Tabs */}
        <div className="flex gap-6 overflow-x-auto w-full xl:w-auto">
          <button 
            className={`pb-3 px-2 font-semibold transition-all whitespace-nowrap ${activeTab === 'APPROVED' ? 'text-[var(--primary-500)] border-b-2 border-[var(--primary-500)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`} 
            onClick={() => setActiveTab('APPROVED')}
          >
            Pending Production Queue
          </button>
          <button 
            className={`pb-3 px-2 font-semibold transition-all whitespace-nowrap ${activeTab === 'ISSUED' ? 'text-[var(--primary-500)] border-b-2 border-[var(--primary-500)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`} 
            onClick={() => setActiveTab('ISSUED')}
          >
            Production History
          </button>
        </div>

        {/* ✨ NEW: Filters Group (Search + Date Dropdown) */}
        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto xl:mb-3">
          
          {/* Date Filter Dropdown */}
          <div className="relative w-full sm:w-48">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <HiOutlineFilter className="text-[var(--text-muted)] text-lg" />
            </div>
            <select
              className="w-full pl-10 pr-8 py-2 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-[var(--radius-sm)] text-[0.9rem] text-[var(--text-primary)] outline-none focus:border-[var(--primary-500)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] transition-all cursor-pointer appearance-none"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option className="bg-[var(--bg-tertiary)]" value="ALL">All Time</option>
              <option className="bg-[var(--bg-tertiary)]" value="7_DAYS">Last 7 Days</option>
              <option className="bg-[var(--bg-tertiary)]" value="15_DAYS">Last 15 Days</option>
              <option className="bg-[var(--bg-tertiary)]" value="30_DAYS">Last 30 Days</option>
              <option className="bg-[var(--bg-tertiary)]" value="1_YEAR">Last 1 Year</option>
            </select>
            {/* Custom Arrow */}
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[var(--text-muted)]">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <HiOutlineSearch className="text-[var(--text-muted)] text-lg" />
            </div>
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-[var(--radius-sm)] text-[0.9rem] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary-500)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] outline-none transition-all"
              placeholder="Search Job #, Product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>
      
      {/* ── Main Table Card ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <div className="w-[44px] h-[44px] border-[3px] border-[var(--border-color)] border-t-[var(--primary-500)] rounded-full animate-[spin_0.8s_linear_infinite]" />
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-8 text-[var(--text-muted)] text-center">
          {activeTab === 'APPROVED' ? <HiOutlineTruck className="text-[3.5rem] mb-4 opacity-40" /> : <HiOutlineDocumentText className="text-[3.5rem] mb-4 opacity-40" />}
          <h3 className="text-[1.15rem] font-semibold text-[var(--text-secondary)] mb-1.5">
            {activeTab === 'APPROVED' ? 'No Pending Jobs' : 'No Production History'}
          </h3>
          <p className="text-[0.85rem] max-w-[320px] mx-auto">
            {activeTab === 'APPROVED' ? 'Waiting for Shop 1 to approve recipes.' : 'Completed production jobs will appear here.'}
          </p>
        </div>
      ) : filteredRequests.length === 0 ? (
        /* Empty state for Filters */
        <div className="flex flex-col items-center justify-center py-16 px-8 text-[var(--text-muted)] text-center">
          <HiOutlineSearch className="text-[3.5rem] mb-4 opacity-40" />
          <h3 className="text-[1.15rem] font-semibold text-[var(--text-secondary)] mb-1.5">No Matches Found</h3>
          <p className="text-[0.85rem] max-w-[320px] mx-auto">
            We couldn't find any jobs matching your search and date filters.
          </p>
          <button 
            onClick={() => { setSearchTerm(''); setDateFilter('ALL'); }}
            className="mt-4 text-[var(--primary-500)] hover:underline text-sm font-semibold"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto border border-[var(--border-color)] rounded-[var(--radius-lg)] bg-[var(--bg-card)]">
          <table className="w-full text-left border-collapse text-[0.875rem]">
            <thead className="bg-[var(--bg-tertiary)] sticky top-0 z-10">
              <tr>
                <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)] whitespace-nowrap">Job #</th>
                <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)]">Product / Purpose</th>
                <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)]">Materials Summary</th>
                <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)] whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map(req => (
                <tr 
                  key={req._id} 
                  className="hover:bg-[var(--bg-glass)] transition-colors cursor-pointer" 
                  onClick={() => activeTab === 'APPROVED' ? handleOpenPreview(req) : handleViewHistory(req)}
                >
                  <td className="px-4 py-[1rem] border-b border-[var(--border-color)] align-middle text-[var(--text-primary)]">
                    <span className="font-bold text-[var(--primary-400)]">{req.requestNumber || req.bomNumber}</span>
                    <div className="text-xs text-[var(--text-muted)] mt-1">{new Date(req.createdAt).toLocaleDateString()}</div>
                  </td>
                  
                  <td className="px-4 py-[1rem] border-b border-[var(--border-color)] align-middle text-[var(--text-primary)]">
                    {req.producedItem ? (
                      <div>
                        <div className="font-semibold text-[1rem]">{req.producedItem.itemName}</div>
                        <div className="text-xs text-[var(--text-muted)] font-mono mt-1">Code: {req.producedItem.itemCode}</div>
                        <div className="text-xs font-bold text-[#10b981] mt-1">Output: +{req.producedItem.quantity} {req.producedItem.uom}</div>
                      </div>
                    ) : (
                      <span className="text-[0.9rem] font-bold text-[var(--text-secondary)] block max-w-[200px]">{req.purpose}</span>
                    )}
                  </td>

                  <td className="px-4 py-[1rem] border-b border-[var(--border-color)] align-middle">
                    <span className="text-[0.85rem] text-[var(--text-secondary)] font-medium">
                      {getMaterials(req).length} distinct items required
                    </span>
                    <div className="text-xs text-[var(--text-muted)] mt-1">Est. Cost: ₹{calculateTotalCost(getMaterials(req)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                  </td>

                  <td className="px-4 py-[1rem] border-b border-[var(--border-color)] align-middle">
                    {activeTab === 'APPROVED' ? (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleOpenPreview(req); }} 
                        className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium transition-all whitespace-nowrap px-[1rem] py-[0.5rem] text-[0.8rem] bg-gradient-to-br from-[var(--primary-600)] to-[var(--primary-500)] text-white hover:-translate-y-[1px] hover:shadow-[0_4px_15px_rgba(99,102,241,0.3)]"
                      >
                        <HiOutlineEye className="text-[1.1rem]"/> View & Produce
                      </button>
                    ) : (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleViewHistory(req); }} 
                        className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium transition-all whitespace-nowrap px-[1rem] py-[0.5rem] text-[0.8rem] bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--bg-card-hover)]"
                      >
                        <HiPrinter className="text-[1.1rem]"/> Print Receipt
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Dynamic Preview & Receipt Modal ── */}
      <Modal 
        isOpen={!!selectedJob} 
        onClose={() => !submitting && setSelectedJob(null)} 
        title={isReceiptMode ? "Manufacturing Receipt" : "Review Production Requirements"} 
        wide 
        footer={
          !isReceiptMode ? (
            <>
              <button 
                className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium transition-all px-[1.25rem] py-[0.6rem] text-[0.875rem] bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--bg-card-hover)]" 
                onClick={() => setSelectedJob(null)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button 
                className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium transition-all px-[1.25rem] py-[0.6rem] text-[0.875rem] bg-gradient-to-br from-[var(--primary-600)] to-[var(--primary-500)] text-white hover:-translate-y-[1px] hover:shadow-[0_4px_15px_rgba(99,102,241,0.3)] disabled:opacity-50" 
                onClick={handleConfirmIssue}
                disabled={submitting}
              >
                {submitting ? 'Processing...' : 'Confirm & Deduct Stock'}
              </button>
            </>
          ) : (
            <>
              <button className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium transition-all px-[1.25rem] py-[0.6rem] text-[0.875rem] bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--bg-card-hover)]" onClick={() => setSelectedJob(null)}>Close</button>
              <button className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium transition-all px-[1.25rem] py-[0.6rem] text-[0.875rem] bg-gradient-to-br from-[#10b981] to-[#059669] text-white hover:-translate-y-[1px] hover:shadow-lg" onClick={() => window.print()}>
                <HiPrinter /> Print Document
              </button>
            </>
          )
        }
      >
        {selectedJob && (
          <div className="bg-white text-slate-800 p-6 rounded-lg font-mono print:shadow-none print:m-0">
            <div className="border-b-2 border-slate-800 pb-4 mb-4 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight">InventIQ ERP</h2>
                <p className={`text-sm font-sans font-bold ${!isReceiptMode ? 'text-amber-600' : 'text-slate-500'}`}>
                  {!isReceiptMode ? "⚠️ PREVIEW ONLY - STOCK NOT YET DEDUCTED" : "Store Issuance & Production Receipt"}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">Job #: {selectedJob.requestNumber || selectedJob.bomNumber}</p>
                <p className="text-xs text-slate-500">{new Date(selectedJob.updatedAt || selectedJob.createdAt).toLocaleString()}</p>
              </div>
            </div>

            <div className="mb-6 bg-slate-100 p-4 rounded-md border border-slate-300">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                {selectedJob.producedItem ? "Item To Produce" : "Job Purpose / Project"}
              </h3>
              
              {selectedJob.producedItem ? (
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-lg text-slate-900">{selectedJob.producedItem.itemName}</p>
                    <p className="text-sm font-mono text-slate-600">{selectedJob.producedItem.itemCode}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-green-600">+{selectedJob.producedItem.quantity}</p>
                    <p className="text-xs font-bold text-slate-500">{selectedJob.producedItem.uom}</p>
                  </div>
                </div>
              ) : (
                <div className="text-lg font-bold text-slate-900">
                  {selectedJob.purpose || "General R&D Testing"}
                </div>
              )}
            </div>

            <div className="mb-6">
              <h3 className="bg-slate-200 p-2 font-bold text-sm mb-2 uppercase text-slate-700 rounded-t-md">
                {!isReceiptMode ? "Materials Required (Will be deducted)" : "Materials Deducted"}
              </h3>
              <table className="w-full text-sm border-collapse">
                <thead className="border-b-2 border-slate-300">
                  <tr>
                    <th className="text-left py-2 px-2">Item Code / Name</th>
                    <th className="text-right py-2 px-2">Qty</th>
                    <th className="text-right py-2 px-2">Unit Price</th>
                    <th className="text-right py-2 px-2">Total Value</th>
                  </tr>
                </thead>
                <tbody>
                  {getMaterials(selectedJob).map((item, i) => {
                    const lineTotal = (Number(item.quantity) * Number(item.price || 0));
                    return (
                      <tr key={i} className="border-b border-slate-200">
                        <td className="py-3 px-2">
                          <div className="font-semibold text-slate-700">{item.itemCode}</div>
                          <div className="text-xs text-slate-500">{item.itemName}</div>
                        </td>
                        <td className="text-right py-3 px-2 font-bold text-red-600">
                          {item.quantity} {item.uom}
                        </td>
                        <td className="text-right py-3 px-2 text-slate-600">
                          ₹{Number(item.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="text-right py-3 px-2 font-bold text-slate-800">
                          ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="3" className="text-right py-4 px-2 font-bold uppercase tracking-wider text-slate-500">
                      Total Production Cost:
                    </td>
                    <td className="text-right py-4 px-2 font-black text-lg text-slate-900 border-t-2 border-slate-800">
                      ₹{calculateTotalCost(getMaterials(selectedJob)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="text-center mt-12 pt-8 border-t border-slate-300 text-xs text-slate-500 flex justify-between">
              <p>Issued by: Shop 2 Warehouse</p>
              <p>System Generated Document</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Shop2;