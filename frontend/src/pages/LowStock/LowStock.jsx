import { useState, useEffect } from 'react';
import { inventoryAPI } from '../../services/api';
import DetailModal from '../../components/DetailModal';
import { HiOutlineExclamationCircle } from 'react-icons/hi';
import toast from 'react-hot-toast';

const LowStock = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(null);

  useEffect(() => {
    loadLowStock();
  }, []);

  const loadLowStock = async () => {
    try {
      const res = await inventoryAPI.lowStock();
      setItems(res.data);
    } catch (err) {
      toast.error('Failed to load low stock items');
    }
    setLoading(false);
  };

  if (loading) return <div className="flex flex-col items-center justify-center h-[60vh] gap-4"><div className="w-[44px] h-[44px] border-[3px] border-[var(--border-color)] border-t-[var(--primary-500)] rounded-full animate-[spin_0.8s_linear_infinite]" /></div>;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-[fadeUp_0.35s_ease] relative z-0">
      <div className="flex justify-between items-center mb-7 flex-wrap gap-4">
        <h1 className="text-[1.6rem] font-bold bg-clip-text text-transparent bg-gradient-to-br from-[var(--text-primary)] to-[var(--primary-300)] tracking-[-0.02em]">Low Stock Alerts</h1>
        <span className="badge inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.72rem] font-semibold uppercase tracking-[0.03em] whitespace-nowrap bg-[rgba(239,68,68,0.1)] text-[#ef4444] border border-[rgba(239,68,68,0.2)]" style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}>
          {items.length} items
        </span>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-8 text-[var(--text-muted)] text-center">
          <HiOutlineExclamationCircle className="text-[3.5rem] mb-4 opacity-40" />
          <h3 className="text-[1.15rem] font-semibold text-[var(--text-secondary)] mb-1.5">All stock levels are healthy</h3>
          <p className="text-[0.85rem] max-w-[320px] mx-auto">No items are below their minimum stock threshold</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-[var(--border-color)] rounded-[var(--radius-lg)] bg-[var(--bg-card)]">
          <table className="w-full text-left border-collapse text-[0.875rem]">
            <thead className="bg-[var(--bg-tertiary)] sticky top-0 z-10">
              <tr>
                <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)] whitespace-nowrap">Item Code</th>
                <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)] whitespace-nowrap">Item Name</th>
                <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)] whitespace-nowrap">Current Stock</th>
                <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)] whitespace-nowrap">Min Stock</th>
                <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)] whitespace-nowrap">Deficit</th>
                <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)] whitespace-nowrap">Category</th>
                <th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)] whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr className="hover:bg-[var(--bg-glass)] transition-colors cursor-pointer" key={item._id} onClick={() => setShowDetail(item)}>
                  <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)] align-middle text-[var(--text-primary)] px-4 py-[0.8rem] border-b border-[var(--border-color)] text-[var(--text-primary)] align-middle"><span className="font-semibold text-accent">{item.itemCode}</span></td>
                  <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)] align-middle text-[var(--text-primary)] px-4 py-[0.8rem] border-b border-[var(--border-color)] text-[var(--text-primary)] align-middle">{item.itemName}</td>
                  <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)] align-middle text-[var(--text-primary)] px-4 py-[0.8rem] border-b border-[var(--border-color)] text-[var(--text-primary)] align-middle"><span className="font-bold" style={{ color: item.stock <= 0 ? 'var(--danger)' : 'var(--warning)' }}>{item.stock}</span></td>
                  <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)] align-middle text-[var(--text-primary)] px-4 py-[0.8rem] border-b border-[var(--border-color)] text-[var(--text-primary)] align-middle">{item.minStock}</td>
                  <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)] align-middle text-[var(--text-primary)] px-4 py-[0.8rem] border-b border-[var(--border-color)] text-[var(--text-primary)] align-middle"><span className="text-danger font-semibold">{item.minStock - item.stock}</span></td>
                  <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)] align-middle text-[var(--text-primary)] px-4 py-[0.8rem] border-b border-[var(--border-color)] text-[var(--text-primary)] align-middle"><span className="badge inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.72rem] font-semibold uppercase tracking-[0.03em] whitespace-nowrap bg-[rgba(148,163,184,0.1)] text-[var(--text-secondary)] border border-[rgba(148,163,184,0.15)]">{item.category}</span></td>
                  <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)] align-middle text-[var(--text-primary)] px-4 py-[0.8rem] border-b border-[var(--border-color)] text-[var(--text-primary)] align-middle">
                    {item.stock <= 0
                      ? <span className="badge inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.72rem] font-semibold uppercase tracking-[0.03em] whitespace-nowrap bg-[rgba(239,68,68,0.1)] text-[#ef4444] border border-[rgba(239,68,68,0.2)]">Out of Stock</span>
                      : <span className="badge inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.72rem] font-semibold uppercase tracking-[0.03em] whitespace-nowrap bg-[rgba(245,158,11,0.1)] text-[#f59e0b] border border-[rgba(245,158,11,0.2)]">Low Stock</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DetailModal
        isOpen={!!showDetail}
        onClose={() => setShowDetail(null)}
        title={`Low Stock Details — ${showDetail?.itemCode || ''}`}
        data={showDetail}
        fields={[
          { label: 'Item Code', key: 'itemCode' },
          { label: 'Item Name', key: 'itemName' },
          { label: 'Current Stock', key: 'stock', render: (v, d) => <span style={{ fontWeight: 700, color: v <= 0 ? 'var(--danger)' : 'var(--warning)' }}>{v} {d.uom}</span> },
          { label: 'Min Stock', key: 'minStock', render: (v, d) => `${v} ${d.uom}` },
          { label: 'Deficit', key: 'stock', render: (v, d) => <span style={{ fontWeight: 700, color: 'var(--danger)' }}>{d.minStock - v}</span> },
          { label: 'UOM', key: 'uom' },
          { label: 'Category', key: 'category' },
          { label: 'Description', key: 'description', render: (v) => v || '—' },
        ]}
      />
    </div>
  );
};

export default LowStock;
