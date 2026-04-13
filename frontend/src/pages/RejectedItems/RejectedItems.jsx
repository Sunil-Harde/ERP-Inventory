import { useState, useEffect, useRef } from 'react';
import { rejectedItemsAPI } from '../../services/api';
import DetailModal from '../../components/DetailModal';
import {
  HiOutlineBan, HiOutlineDocumentText, HiOutlinePrinter,
  HiOutlineExclamationCircle, HiOutlineCheckCircle,
  HiOutlineCurrencyRupee, HiOutlineTruck,
} from 'react-icons/hi';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────────────────────
// Rejection Receipt Modal — full printable GRN / Rejection Note
// ─────────────────────────────────────────────────────────────────────────────
function RejectionReceiptModal({ item, onClose, onMarkPrinted }) {
  if (!item) return null;

  const formatCurrency = (n) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', maximumFractionDigits: 2,
    }).format(n || 0);

  const refundAmount  = (item.rejectedQty || 0) * (item.unitPrice || 0);
  const printedAt     = new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' });
  const rejectedDate  = item.createdAt
    ? new Date(item.createdAt).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })
    : '—';

  const handlePrint = () => {
    const content = document.getElementById('rejection-receipt-content').innerHTML;
    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(`
      <html>
        <head>
          <title>Rejection Note — ${item.itemCode}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; background: #fff; padding: 32px; font-size: 13px; }
            h2 { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
            h4 { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { padding: 8px 12px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; background: #f3f4f6; border-bottom: 1px solid #e5e7eb; color: #6b7280; }
            td { padding: 9px 12px; border-bottom: 1px solid #f3f4f6; color: #111; }
            .red { color: #dc2626; font-weight: 700; }
            .green { color: #16a34a; font-weight: 700; }
            .amber { color: #d97706; font-weight: 700; }
            .section { margin-bottom: 20px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; padding: 14px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; }
            .info-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 2px; }
            .info-value { font-size: 13px; color: #111; font-weight: 600; }
            .warning-box { margin-top: 12px; padding: 12px 14px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; }
            .warning-box ul { padding-left: 16px; line-height: 1.8; font-size: 12px; color: #92400e; }
            .summary-row { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid #f3f4f6; }
            .summary-label { font-size: 13px; color: #374151; }
            .divider { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
            .sig-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; }
            .sig-label { font-size: 10px; font-weight: 700; color: #6b7280; margin-top: 24px; text-transform: uppercase; letter-spacing: 0.05em; border-top: 1px solid #d1d5db; padding-top: 6px; }
            @media print { body { padding: 16px; } }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
    onMarkPrinted(item._id);
    toast.success('Receipt printed & marked');
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:1000, backdropFilter:'blur(4px)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div style={{
        position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
        zIndex:1001, background:'var(--bg-card)', border:'1px solid var(--border-color)',
        borderRadius:'var(--radius-lg)', width:'min(96vw, 780px)',
        maxHeight:'90vh', display:'flex', flexDirection:'column',
        boxShadow:'0 24px 64px rgba(0,0,0,0.35)',
      }}>

        {/* Header */}
        <div style={{ padding:'18px 22px', borderBottom:'1px solid var(--border-color)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <HiOutlineDocumentText style={{ fontSize:20, color:'var(--primary-400)' }} />
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)' }}>Rejection Note — {item.itemCode}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>Goods Return & Refund Document</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, color:'var(--text-muted)', cursor:'pointer', lineHeight:1 }}>×</button>
        </div>

        {/* Scrollable body */}
        <div style={{ padding:'20px 22px', overflowY:'auto', flex:1 }}>
          <div id="rejection-receipt-content">

            {/* Title */}
            <div style={{ textAlign:'center', marginBottom:22, paddingBottom:16, borderBottom:'2px solid var(--border-color)' }}>
              <h2 style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)', margin:0 }}>MATERIAL REJECTION NOTE</h2>
              <p style={{ fontSize:12, color:'var(--text-muted)', margin:'4px 0 0' }}>Goods Return &amp; Supplier Refund Document</p>
              <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>Printed on: {printedAt}</p>
            </div>

            {/* Info grid */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px 20px', marginBottom:20, padding:14, background:'var(--bg-tertiary)', borderRadius:'var(--radius-sm)', border:'1px solid var(--border-color)' }}>
              {[
                ['Rejection Date',  rejectedDate],
                ['PO Number',       item.purchaseOrder?.poNumber || '—'],
                ['Supplier',        item.purchaseOrder?.supplier || item.supplier || '—'],
                ['Checked By',      item.checkedBy?.name || '—'],
                ['Item Code',       item.itemCode],
                ['Item Name',       item.itemName],
                ['UOM',             item.uom || '—'],
                ['Document Ref',    `RN-${item._id?.slice(-6).toUpperCase() || 'XXXXXX'}`],
              ].map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:2 }}>{label}</div>
                  <div style={{ fontSize:13, color:'var(--text-primary)', fontWeight:600 }}>{val}</div>
                </div>
              ))}
            </div>

            {/* Rejection Details Table */}
            <div style={{ marginBottom:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <span style={{ width:10, height:10, borderRadius:'50%', background:'#ef4444', display:'inline-block', flexShrink:0 }} />
                <h4 style={{ margin:0, fontSize:12, fontWeight:700, color:'var(--text-primary)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Rejection Details</h4>
              </div>
              <div style={{ border:'1px solid rgba(239,68,68,0.25)', borderRadius:'var(--radius-sm)', overflow:'hidden', background:'rgba(239,68,68,0.02)' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr style={{ background:'rgba(239,68,68,0.08)' }}>
                      {['Field','Details'].map(h => (
                        <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'#f87171', textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1px solid rgba(239,68,68,0.15)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Rejected Quantity',  <span style={{ color:'#f87171', fontWeight:800, fontSize:15 }}>{item.rejectedQty} {item.uom || ''}</span>],
                      ['Rejection Reason',
                        <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 10px', borderRadius:20, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', color:'#f87171', fontSize:12, fontWeight:700 }}>
                          <HiOutlineExclamationCircle style={{ fontSize:14 }} />
                          {item.reason || 'Not specified'}
                        </span>
                      ],
                      ['Unit Price',         item.unitPrice ? `₹ ${Number(item.unitPrice).toFixed(2)}` : <span style={{ color:'var(--text-muted)' }}>Not recorded — update for refund calculation</span>],
                      ['Total Refund Value', item.unitPrice
                        ? <span style={{ color:'#f59e0b', fontWeight:800, fontSize:15 }}>₹ {refundAmount.toFixed(2)}</span>
                        : <span style={{ color:'var(--text-muted)' }}>—</span>
                      ],
                      ['Remarks / Notes',   item.remarks || item.notes || '—'],
                      ['Batch / Lot No.',   item.batchNo || item.lotNo || '—'],
                      ['Inspection Type',   item.inspectionType || 'Quality Inspection'],
                    ].map(([label, val]) => (
                      <tr key={label} style={{ borderBottom:'1px solid rgba(239,68,68,0.08)' }}>
                        <td style={{ padding:'10px 14px', fontWeight:600, color:'var(--text-secondary)', fontSize:12, width:'35%' }}>{label}</td>
                        <td style={{ padding:'10px 14px', color:'var(--text-primary)' }}>{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Return & Refund Process */}
            <div style={{ marginBottom:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <span style={{ width:10, height:10, borderRadius:'50%', background:'#f59e0b', display:'inline-block', flexShrink:0 }} />
                <h4 style={{ margin:0, fontSize:12, fontWeight:700, color:'var(--text-primary)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Return to Supplier Process</h4>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {[
                  { icon:<HiOutlineExclamationCircle style={{color:'#ef4444',fontSize:16,flexShrink:0}} />, step:'Step 1 — Isolate', text:`Quarantine ${item.rejectedQty} ${item.uom||'units'} of ${item.itemName} immediately. Label clearly as "REJECTED — DO NOT USE".` },
                  { icon:<HiOutlineDocumentText style={{color:'var(--primary-400)',fontSize:16,flexShrink:0}} />, step:'Step 2 — Document', text:`Attach this Rejection Note (Ref: RN-${item._id?.slice(-6).toUpperCase()}) to the rejected goods. Note PO: ${item.purchaseOrder?.poNumber||'—'}.` },
                  { icon:<HiOutlineTruck style={{color:'#f59e0b',fontSize:16,flexShrink:0}} />, step:'Step 3 — Return', text:`Contact supplier ${item.purchaseOrder?.supplier||'(see PO)'} to arrange return pickup or drop. Reason: ${item.reason||'Quality rejection'}.` },
                  { icon:<HiOutlineCurrencyRupee style={{color:'#22c55e',fontSize:16,flexShrink:0}} />, step:'Step 4 — Claim Refund', text: item.unitPrice
                    ? `Claim refund of ₹${refundAmount.toFixed(2)} (${item.rejectedQty} × ₹${Number(item.unitPrice).toFixed(2)}) against PO ${item.purchaseOrder?.poNumber||'—'}.`
                    : `Claim refund for ${item.rejectedQty} ${item.uom||'units'} of ${item.itemName} against PO ${item.purchaseOrder?.poNumber||'—'}. Add unit price for exact amount.`
                  },
                  { icon:<HiOutlineCheckCircle style={{color:'#22c55e',fontSize:16,flexShrink:0}} />, step:'Step 5 — Confirm', text:'Once supplier confirms receipt of returned goods, close this rejection entry. File this document for audit trail.' },
                ].map(({ icon, step, text }) => (
                  <div key={step} style={{ display:'flex', gap:12, padding:'11px 14px', background:'var(--bg-tertiary)', borderRadius:'var(--radius-sm)', border:'1px solid var(--border-color)', alignItems:'flex-start' }}>
                    {icon}
                    <div>
                      <div style={{ fontSize:11, fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:3 }}>{step}</div>
                      <div style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.6 }}>{text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div style={{ padding:16, background:'var(--bg-tertiary)', borderRadius:'var(--radius-sm)', border:'1px solid var(--border-color)', marginBottom:20 }}>
              <h4 style={{ margin:'0 0 12px', fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Financial Summary</h4>
              <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                {[
                  { label:'Rejected Quantity',        val: `${item.rejectedQty} ${item.uom||''}`, color:'#f87171', bold:false },
                  { label:'Unit Price',                val: item.unitPrice ? `₹ ${Number(item.unitPrice).toFixed(2)}` : 'Not recorded', color:'var(--text-primary)', bold:false },
                  { label:'Total Refund Claimable',   val: item.unitPrice ? `₹ ${refundAmount.toFixed(2)}` : '—', color:'#f59e0b', bold:true },
                  { label:'Supplier Owes You',        val: item.unitPrice ? `₹ ${refundAmount.toFixed(2)}` : '—', color:'#22c55e', bold:true },
                ].map(({ label, val, color, bold }, i, arr) => (
                  <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom: i < arr.length-1 ? '1px solid var(--border-color)' : 'none' }}>
                    <span style={{ fontSize:13, color:'var(--text-secondary)', fontWeight: bold?600:400 }}>{label}</span>
                    <span style={{ fontSize: bold?15:13, fontWeight: bold?800:600, color }}>{val}</span>
                  </div>
                ))}
              </div>
              {!item.unitPrice && (
                <div style={{ marginTop:10, padding:'8px 12px', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:'var(--radius-sm)', fontSize:12, color:'#f59e0b' }}>
                  ⚠ Unit price not recorded. Edit this rejection entry to add unit price for accurate refund calculation.
                </div>
              )}
            </div>

            {/* Signature block */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:20, paddingTop:16, borderTop:'1px solid var(--border-color)' }}>
              {['Prepared By (QC)','Approved By','Supplier Acknowledgement'].map(label => (
                <div key={label} style={{ textAlign:'center' }}>
                  <div style={{ height:36 }} />
                  <div style={{ borderTop:'1px solid var(--border-color)', paddingTop:6 }}>
                    <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600 }}>{label}</div>
                  </div>
                </div>
              ))}
            </div>

          </div>{/* /rejection-receipt-content */}
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 22px', borderTop:'1px solid var(--border-color)', display:'flex', justifyContent:'flex-end', gap:10, flexShrink:0 }}>
          <button
            onClick={onClose}
            style={{ padding:'9px 20px', borderRadius:'var(--radius-sm)', background:'var(--bg-tertiary)', border:'1px solid var(--border-color)', color:'var(--text-primary)', fontSize:14, fontWeight:600, cursor:'pointer' }}
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            style={{ padding:'9px 20px', borderRadius:'var(--radius-sm)', background:'linear-gradient(135deg,var(--primary-600),var(--primary-500))', border:'1px solid var(--primary-500)', color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}
          >
            <HiOutlinePrinter style={{ fontSize:16 }} /> Print Receipt
          </button>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main RejectedItems Page
// ─────────────────────────────────────────────────────────────────────────────
const RejectedItems = () => {
  const [items,       setItems]       = useState([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [pages,       setPages]       = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [stats,       setStats]       = useState(null);
  const [showDetail,  setShowDetail]  = useState(null);
  const [showReceipt, setShowReceipt] = useState(null);

  // Track printed receipts in localStorage
  const [printedMap, setPrintedMap] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rejection_receipts_printed') || '{}'); }
    catch { return {}; }
  });

  const markPrinted = (id) => {
    const updated = { ...printedMap, [id]: new Date().toISOString() };
    setPrintedMap(updated);
    localStorage.setItem('rejection_receipts_printed', JSON.stringify(updated));
  };

  useEffect(() => { loadItems(); }, [page]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      const [res, statsRes] = await Promise.all([
        rejectedItemsAPI.list(params.toString()),
        rejectedItemsAPI.stats(),
      ]);
      setItems(res.data);
      setTotal(res.total);
      setPages(res.pages);
      setStats(statsRes.data);
    } catch { toast.error('Failed to load rejected items'); }
    setLoading(false);
  };

  const formatDate = (d) =>
    new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  const totalRefundable = items.reduce((s, i) => s + (i.rejectedQty || 0) * (i.unitPrice || 0), 0);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Rejected / Bad Products</h1>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-grid" style={{ gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', marginBottom:'1.5rem' }}>
          <div className="stat-card" style={{ '--stat-accent':'#ef4444' }}>
            <div className="stat-icon" style={{ background:'rgba(239,68,68,0.12)', color:'#ef4444' }}>
              <HiOutlineBan />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalEntries}</div>
              <div className="stat-label">Rejection Entries</div>
            </div>
          </div>
          <div className="stat-card" style={{ '--stat-accent':'#f59e0b' }}>
            <div className="stat-icon" style={{ background:'rgba(245,158,11,0.12)', color:'#f59e0b' }}>
              <HiOutlineBan />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalRejectedQty}</div>
              <div className="stat-label">Total Rejected Qty</div>
            </div>
          </div>
          {/* Refundable value card */}
          <div className="stat-card" style={{ '--stat-accent':'#22c55e' }}>
            <div className="stat-icon" style={{ background:'rgba(34,197,94,0.12)', color:'#22c55e' }}>
              <HiOutlineCurrencyRupee />
            </div>
            <div className="stat-content">
              <div className="stat-value" style={{ fontSize:'1.1rem' }}>
                ₹{totalRefundable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div className="stat-label">Refundable Value</div>
            </div>
          </div>
          {/* Receipts printed card */}
          <div className="stat-card" style={{ '--stat-accent':'var(--primary-400)' }}>
            <div className="stat-icon" style={{ background:'rgba(99,102,241,0.12)', color:'var(--primary-400)' }}>
              <HiOutlineDocumentText />
            </div>
            <div className="stat-content">
              <div className="stat-value">{Object.keys(printedMap).length}</div>
              <div className="stat-label">Receipts Printed</div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="loading-page"><div className="spinner" /></div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <HiOutlineBan className="empty-state-icon" />
          <h3>No rejected items</h3>
          <p>Items rejected during quality inspection will appear here</p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Item Code</th>
                  <th>Item Name</th>
                  <th>Rejected Qty</th>
                  <th>UOM</th>
                  <th>Reason</th>
                  <th>Checked By</th>
                  <th>PO</th>
                  {/* ── NEW COLUMN ── */}
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const printed   = !!printedMap[item._id];
                  const printDate = printed
                    ? new Date(printedMap[item._id]).toLocaleDateString('en-IN')
                    : null;

                  return (
                    <tr
                      key={item._id}
                      className="cursor-pointer"
                      onClick={() => setShowDetail(item)}
                    >
                      <td className="text-muted text-sm">{formatDate(item.createdAt)}</td>
                      <td><span className="text-accent font-semibold">{item.itemCode}</span></td>
                      <td>{item.itemName}</td>
                      <td>
                        <span className="font-bold" style={{ color:'var(--danger)' }}>
                          {item.rejectedQty}
                        </span>
                      </td>
                      <td>{item.uom || '—'}</td>
                      <td className="text-sm" style={{ maxWidth:220 }}>{item.reason}</td>
                      <td className="text-muted">{item.checkedBy?.name || '—'}</td>
                      <td className="font-semibold">{item.purchaseOrder?.poNumber || '—'}</td>

                      {/* ── Receipt cell ── */}
                      <td onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setShowReceipt(item)}
                          title={printed
                            ? `Receipt printed on ${printDate}`
                            : 'Receipt not yet printed — click to generate'
                          }
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '5px 11px',
                            borderRadius: 'var(--radius-sm, 6px)',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            whiteSpace: 'nowrap',
                            border: `1px solid ${printed
                              ? 'rgba(34,197,94,0.35)'
                              : 'rgba(148,163,184,0.22)'}`,
                            background: printed
                              ? 'rgba(34,197,94,0.10)'
                              : 'rgba(148,163,184,0.07)',
                            color: printed ? '#22c55e' : 'var(--text-muted)',
                          }}
                        >
                          {printed
                            ? <><HiOutlineCheckCircle style={{ fontSize:14 }} /> Printed</>
                            : <><HiOutlineDocumentText style={{ fontSize:14 }} /> Get Receipt</>
                          }
                        </button>
                        {/* Print date sub-label */}
                        {printed && (
                          <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3, paddingLeft:2 }}>
                            {printDate}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
              {[...Array(Math.min(pages, 5))].map((_, i) => {
                const p = i + 1;
                return (
                  <button key={p} className={page === p ? 'active' : ''} onClick={() => setPage(p)}>
                    {p}
                  </button>
                );
              })}
              <span className="pagination-info">{total} items</span>
              <button disabled={page >= pages} onClick={() => setPage(page + 1)}>›</button>
            </div>
          )}
        </>
      )}

      {/* ── Detail Modal (existing) ── */}
      <DetailModal
        isOpen={!!showDetail}
        onClose={() => setShowDetail(null)}
        title={`Rejected Item — ${showDetail?.itemCode || ''}`}
        data={showDetail}
        fields={[
          { label:'Date',         key:'createdAt',                 render:(v)=>v?new Date(v).toLocaleString('en-IN',{dateStyle:'full',timeStyle:'medium'}):'—' },
          { label:'Item Code',    key:'itemCode' },
          { label:'Item Name',    key:'itemName' },
          { label:'Rejected Qty', key:'rejectedQty',              render:(v)=><span style={{fontWeight:700,color:'var(--danger)'}}>{v}</span> },
          { label:'UOM',          key:'uom',                       render:(v)=>v||'—' },
          { label:'Reason',       key:'reason' },
          { label:'Checked By',   key:'checkedBy.name',           render:(v)=>v||'—' },
          { label:'PO Number',    key:'purchaseOrder.poNumber',   render:(v)=>v||'—' },
          { label:'Unit Price',   key:'unitPrice',                 render:(v)=>v?`₹ ${Number(v).toFixed(2)}`:'—' },
        ]}
      />

      {/* ── Rejection Receipt Modal (NEW) ── */}
      {showReceipt && (
        <RejectionReceiptModal
          item={showReceipt}
          onClose={() => setShowReceipt(null)}
          onMarkPrinted={markPrinted}
        />
      )}
    </div>
  );
};

export default RejectedItems;