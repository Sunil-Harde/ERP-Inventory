import { useState, useEffect } from 'react';
import { usersAPI, authAPI } from '../../services/api';
import Modal from '../../components/Modal';
import { HiOutlinePlus, HiOutlineSearch, HiOutlineUsers, HiOutlinePencil, HiOutlineBan } from 'react-icons/hi';
import toast from 'react-hot-toast';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({ name: '', email: '', password: '', role: '', department: '' });

  const roleDeptMap = {
    ADMIN: 'admin',
    STAFF_PURCHASE: 'purchase',
    STAFF_QUALITY: 'quality',
    STAFF_RND: 'rnd',
    STAFF_STORE: 'store',
  };

  useEffect(() => { loadUsers(); }, [page, search]);

  const loadUsers = async () => {
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (search) params.set('search', search);
      const res = await usersAPI.list(params.toString());
      setUsers(res.data);
      setTotal(res.total);
      setPages(res.pages);
    } catch (err) {
      toast.error('Failed to load users');
    }
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await authAPI.register({
        ...form,
        department: form.department || roleDeptMap[form.role] || 'store',
      });
      toast.success('User created');
      setShowCreate(false);
      setForm({ name: '', email: '', password: '', role: '', department: '' });
      loadUsers();
    } catch (err) {
      toast.error(err.message);
    }
    setSubmitting(false);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await usersAPI.update(showEdit._id, {
        name: form.name,
        email: form.email,
        role: form.role,
        department: form.department,
      });
      toast.success('User updated');
      setShowEdit(null);
      loadUsers();
    } catch (err) {
      toast.error(err.message);
    }
    setSubmitting(false);
  };

  const handleDeactivate = async (user) => {
    if (!confirm(`Deactivate ${user.name}?`)) return;
    try {
      await usersAPI.remove(user._id);
      toast.success('User deactivated');
      loadUsers();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const openEdit = (user) => {
    setForm({ name: user.name, email: user.email, password: '', role: user.role, department: user.department });
    setShowEdit(user);
  };

  const roleBadge = (role) => {
    const map = {
      ADMIN: 'badge-info',
      STAFF_PURCHASE: 'badge-success',
      STAFF_QUALITY: 'badge-warning',
      STAFF_RND: 'badge-neutral',
      STAFF_STORE: 'badge-info',
    };
    return <span className={`badge ${map[role] || 'badge-neutral'}`}>{role.replace('STAFF_', '')}</span>;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>User Management</h1>
        <button className="btn btn-primary" onClick={() => { setForm({ name: '', email: '', password: '', role: '', department: '' }); setShowCreate(true); }}>
          <HiOutlinePlus /> Add User
        </button>
      </div>

      <div className="filter-bar">
        <div className="search-input">
          <HiOutlineSearch className="search-icon" />
          <input type="text" className="form-control" placeholder="Search users..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      {loading ? (
        <div className="loading-page"><div className="spinner" /></div>
      ) : users.length === 0 ? (
        <div className="empty-state"><HiOutlineUsers className="empty-state-icon" /><h3>No users found</h3></div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td className="font-semibold">{u.name}</td>
                  <td className="text-muted">{u.email}</td>
                  <td>{roleBadge(u.role)}</td>
                  <td style={{ textTransform: 'capitalize' }}>{u.department}</td>
                  <td><span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)}><HiOutlinePencil /></button>
                      {u.isActive && <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDeactivate(u)}><HiOutlineBan /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create User Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add New User"
        footer={<><button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button><button className="btn btn-primary" onClick={handleCreate} disabled={submitting}>{submitting ? 'Creating...' : 'Create User'}</button></>}>
        <form onSubmit={handleCreate}>
          <div className="form-group"><label className="form-label">Name *</label><input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="form-group"><label className="form-label">Email *</label><input type="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
          <div className="form-group"><label className="form-label">Password *</label><input type="password" className="form-control" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} /></div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Role *</label>
              <select className="form-control" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value, department: roleDeptMap[e.target.value] || '' })} required>
                <option value="">Select Role</option>
                <option value="ADMIN">Admin</option>
                <option value="STAFF_PURCHASE">Staff - Purchase</option>
                <option value="STAFF_QUALITY">Staff - Quality</option>
                <option value="STAFF_RND">Staff - R&D</option>
                <option value="STAFF_STORE">Staff - Store</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Department</label>
              <input className="form-control" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Auto-filled from role" />
            </div>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={!!showEdit} onClose={() => setShowEdit(null)} title="Edit User"
        footer={<><button className="btn btn-secondary" onClick={() => setShowEdit(null)}>Cancel</button><button className="btn btn-primary" onClick={handleUpdate} disabled={submitting}>{submitting ? 'Saving...' : 'Update User'}</button></>}>
        <form onSubmit={handleUpdate}>
          <div className="form-group"><label className="form-label">Name</label><input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-control" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="ADMIN">Admin</option><option value="STAFF_PURCHASE">Staff - Purchase</option><option value="STAFF_QUALITY">Staff - Quality</option><option value="STAFF_RND">Staff - R&D</option><option value="STAFF_STORE">Staff - Store</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Department</label>
              <input className="form-control" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Users;
