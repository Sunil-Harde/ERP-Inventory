import { useState, useEffect } from 'react';
import { inventoryAPI } from '../../services/api';
import { HiOutlineExclamationCircle } from 'react-icons/hi';
import toast from 'react-hot-toast';

const LowStock = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Low Stock Alerts</h1>
        <span className="badge badge-danger" style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}>
          {items.length} items
        </span>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <HiOutlineExclamationCircle className="empty-state-icon" />
          <h3>All stock levels are healthy</h3>
          <p>No items are below their minimum stock threshold</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Item Name</th>
                <th>Current Stock</th>
                <th>Min Stock</th>
                <th>Deficit</th>
                <th>Category</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id}>
                  <td><span className="font-semibold text-accent">{item.itemCode}</span></td>
                  <td>{item.itemName}</td>
                  <td><span className="font-bold" style={{ color: item.stock <= 0 ? 'var(--danger)' : 'var(--warning)' }}>{item.stock}</span></td>
                  <td>{item.minStock}</td>
                  <td><span className="text-danger font-semibold">{item.minStock - item.stock}</span></td>
                  <td><span className="badge badge-neutral">{item.category}</span></td>
                  <td>
                    {item.stock <= 0
                      ? <span className="badge badge-danger">Out of Stock</span>
                      : <span className="badge badge-warning">Low Stock</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LowStock;
