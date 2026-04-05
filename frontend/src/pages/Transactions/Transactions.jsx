import { useState, useEffect } from 'react';
import { transactionsAPI } from '../../services/api';
import { HiOutlineSearch, HiOutlineSwitchHorizontal } from 'react-icons/hi';
import toast from 'react-hot-toast';

const Transactions = () => {
  const [txns, setTxns] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [type, setType] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTxns();
  }, [page, type, itemCode]);

  const loadTxns = async () => {
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (type) params.set('type', type);
      if (itemCode) params.set('itemCode', itemCode);
      const res = await transactionsAPI.list(params.toString());
      setTxns(res.data);
      setTotal(res.total);
      setPages(res.pages);
    } catch (err) {
      toast.error('Failed to load transactions');
    }
    setLoading(false);
  };

  const formatDate = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Transactions</h1>
      </div>

      <div className="filter-bar">
        <div className="search-input" style={{ maxWidth: 240 }}>
          <HiOutlineSearch className="search-icon" />
          <input type="text" className="form-control" placeholder="Filter by item code" value={itemCode}
            onChange={(e) => { setItemCode(e.target.value); setPage(1); }} />
        </div>
        <select className="form-control" style={{ width: 150 }} value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
          <option value="">All Types</option>
          <option value="IN">IN</option>
          <option value="OUT">OUT</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-page"><div className="spinner" /></div>
      ) : txns.length === 0 ? (
        <div className="empty-state">
          <HiOutlineSwitchHorizontal className="empty-state-icon" />
          <h3>No transactions found</h3>
          <p>Inventory movements will appear here</p>
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
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Performed By</th>
                  <th>Department</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {txns.map((t) => (
                  <tr key={t._id}>
                    <td className="text-sm text-muted">{formatDate(t.createdAt)}</td>
                    <td><span className="font-semibold text-accent">{t.itemCode}</span></td>
                    <td>{t.itemName || '—'}</td>
                    <td>
                      <span className={`badge ${t.type === 'IN' ? 'badge-success' : 'badge-warning'}`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="font-bold">{t.quantity}</td>
                    <td>{t.performedBy?.name || '—'}</td>
                    <td>{t.department || '—'}</td>
                    <td className="text-sm text-muted truncate" style={{ maxWidth: 200 }}>{t.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
              {[...Array(Math.min(pages, 5))].map((_, i) => {
                const p = i + 1;
                return <button key={p} className={page === p ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>;
              })}
              <span className="pagination-info">{total} total</span>
              <button disabled={page >= pages} onClick={() => setPage(page + 1)}>›</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Transactions;
