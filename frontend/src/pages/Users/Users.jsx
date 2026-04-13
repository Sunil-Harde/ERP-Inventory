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
      ADMIN: 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.72rem] font-semibold uppercase tracking-[0.03em] whitespace-nowrap bg-[rgba(59,130,246,0.1)] text-[#3b82f6] border border-[rgba(59,130,246,0.2)]',
      STAFF_PURCHASE: 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.72rem] font-semibold uppercase tracking-[0.03em] whitespace-nowrap bg-[rgba(34,197,94,0.1)] text-[#22c55e] border border-[rgba(34,197,94,0.2)]',
      STAFF_QUALITY: 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.72rem] font-semibold uppercase tracking-[0.03em] whitespace-nowrap bg-[rgba(245,158,11,0.1)] text-[#f59e0b] border border-[rgba(245,158,11,0.2)]',
      STAFF_RND: 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.72rem] font-semibold uppercase tracking-[0.03em] whitespace-nowrap bg-[rgba(148,163,184,0.1)] text-[var(--text-secondary)] border border-[rgba(148,163,184,0.15)]',
      STAFF_STORE: 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.72rem] font-semibold uppercase tracking-[0.03em] whitespace-nowrap bg-[rgba(59,130,246,0.1)] text-[#3b82f6] border border-[rgba(59,130,246,0.2)]',
    };
    return <span className={`map[role] || 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.72rem] font-semibold uppercase tracking-[0.03em] whitespace-nowrap bg-[rgba(148,163,184,0.1)] text-[var(--text-secondary)] border border-[rgba(148,163,184,0.15)]'}`}>{role.replace('STAFF_', '')}</span>;
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-[fadeUp_0.35s_ease] relative z-0">
      <div className="flex justify-between items-center mb-7 flex-wrap gap-4">
        <h1 className="text-[1.6rem] font-bold bg-clip-text text-transparent bg-gradient-to-br from-[var(--text-primary)] to-[var(--primary-300)] tracking-[-0.02em]">User Management</h1>
        <button className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed px-[1.25rem] py-[0.6rem] text-[0.875rem] bg-gradient-to-br from-[var(--primary-600)] to-[var(--primary-500)] text-white border border-[var(--primary-500)] hover:-translate-y-[1px] hover:shadow-[0_4px_15px_rgba(99,102,241,0.3)]" onClick={() => { setForm({ name: '', email: '', password: '', role: '', department: '' }); setShowCreate(true); }}>
          <HiOutlinePlus /> Add User
        </button>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <div className="relative flex-1 min-w-[220px]">
          <HiOutlineSearch className="absolute left-[0.85rem] top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-[1rem]" />
          <input type="text" className="w-full px-[0.9rem] py-[0.65rem] bg-[var(--bg-input)] border border-[var(--border-color)] rounded-[var(--radius-sm)] text-[0.9rem] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary-500)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] focus:bg-[rgba(255,255,255,0.08)] outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed" placeholder="Search users..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4"><div className="w-[44px] h-[44px] border-[3px] border-[var(--border-color)] border-t-[var(--primary-500)] rounded-full animate-[spin_0.8s_linear_infinite]" /></div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-8 text-[var(--text-muted)] text-center"><HiOutlineUsers className="text-[3.5rem] mb-4 opacity-40" /><h3 className="text-[1.15rem] font-semibold text-[var(--text-secondary)] mb-1.5">No users found</h3></div>
      ) : (
        <div className="overflow-x-auto border border-[var(--border-color)] rounded-[var(--radius-lg)] bg-[var(--bg-card)]">
          <table className="w-full text-left border-collapse text-[0.875rem]">
            <thead className="bg-[var(--bg-tertiary)] sticky top-0 z-10">
              <tr><th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)] whitespace-nowrap">Name</th><th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)] whitespace-nowrap">Email</th><th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)] whitespace-nowrap">Role</th><th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)] whitespace-nowrap">Department</th><th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)] whitespace-nowrap">Status</th><th className="font-semibold uppercase tracking-[0.05em] text-[0.72rem] text-[var(--text-secondary)] px-4 py-[0.85rem] border-b border-[var(--border-color)] whitespace-nowrap">Actions</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr className="hover:bg-[var(--bg-glass)] transition-colors" key={u._id}>
                  <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)] align-middle text-[var(--text-primary)] font-semibold">{u.name}</td>
                  <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)] align-middle text-[var(--text-primary)] text-[var(--text-muted)]">{u.email}</td>
                  <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)] align-middle text-[var(--text-primary)] px-4 py-[0.8rem] border-b border-[var(--border-color)] text-[var(--text-primary)] align-middle">{roleBadge(u.role)}</td>
                  <td style={{ textTransform: 'capitalize' }}>{u.department}</td>
                  <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)] align-middle text-[var(--text-primary)] px-4 py-[0.8rem] border-b border-[var(--border-color)] text-[var(--text-primary)] align-middle"><span className={`u.isActive ? 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.72rem] font-semibold uppercase tracking-[0.03em] whitespace-nowrap bg-[rgba(34,197,94,0.1)] text-[#22c55e] border border-[rgba(34,197,94,0.2)]' : 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.72rem] font-semibold uppercase tracking-[0.03em] whitespace-nowrap bg-[rgba(239,68,68,0.1)] text-[#ef4444] border border-[rgba(239,68,68,0.2)]'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-4 py-[0.8rem] border-b border-[var(--border-color)] align-middle text-[var(--text-primary)] px-4 py-[0.8rem] border-b border-[var(--border-color)] text-[var(--text-primary)] align-middle">
                    <div className="flex gap-1">
                      <button className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed px-[0.75rem] py-[0.35rem] text-[0.8rem] bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)]" onClick={() => openEdit(u)}><HiOutlinePencil /></button>
                      {u.isActive && <button className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed px-[0.75rem] py-[0.35rem] text-[0.8rem] bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)] !text-[var(--danger)]" onClick={() => handleDeactivate(u)}><HiOutlineBan /></button>}
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
        footer={<><button className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed px-[1.25rem] py-[0.6rem] text-[0.875rem] bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-hover)]" onClick={() => setShowCreate(false)}>Cancel</button><button className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed px-[1.25rem] py-[0.6rem] text-[0.875rem] bg-gradient-to-br from-[var(--primary-600)] to-[var(--primary-500)] text-white border border-[var(--primary-500)] hover:-translate-y-[1px] hover:shadow-[0_4px_15px_rgba(99,102,241,0.3)]" onClick={handleCreate} disabled={submitting}>{submitting ? 'Creating...' : 'Create User'}</button></>}>
        <form onSubmit={handleCreate}>
          <div className="mb-5"><label className="block text-[0.8rem] font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-[0.05em]">Name *</label><input className="w-full px-[0.9rem] py-[0.65rem] bg-[var(--bg-input)] border border-[var(--border-color)] rounded-[var(--radius-sm)] text-[0.9rem] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary-500)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] focus:bg-[rgba(255,255,255,0.08)] outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="mb-5"><label className="block text-[0.8rem] font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-[0.05em]">Email *</label><input type="email" className="w-full px-[0.9rem] py-[0.65rem] bg-[var(--bg-input)] border border-[var(--border-color)] rounded-[var(--radius-sm)] text-[0.9rem] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary-500)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] focus:bg-[rgba(255,255,255,0.08)] outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
          <div className="mb-5"><label className="block text-[0.8rem] font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-[0.05em]">Password *</label><input type="password" className="w-full px-[0.9rem] py-[0.65rem] bg-[var(--bg-input)] border border-[var(--border-color)] rounded-[var(--radius-sm)] text-[0.9rem] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary-500)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] focus:bg-[rgba(255,255,255,0.08)] outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} /></div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
            <div className="mb-5">
              <label className="block text-[0.8rem] font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-[0.05em]">Role *</label>
              <select className="w-full px-[0.9rem] py-[0.65rem] bg-[var(--bg-input)] border border-[var(--border-color)] rounded-[var(--radius-sm)] text-[0.9rem] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary-500)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] focus:bg-[rgba(255,255,255,0.08)] outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value, department: roleDeptMap[e.target.value] || '' })} required>
                <option value="">Select Role</option>
                <option value="ADMIN">Admin</option>
                <option value="STAFF_PURCHASE">Staff - Purchase</option>
                <option value="STAFF_QUALITY">Staff - Quality</option>
                <option value="STAFF_RND">Staff - R&D</option>
                <option value="STAFF_STORE">Staff - Store</option>
              </select>
            </div>
            <div className="mb-5">
              <label className="block text-[0.8rem] font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-[0.05em]">Department</label>
              <input className="w-full px-[0.9rem] py-[0.65rem] bg-[var(--bg-input)] border border-[var(--border-color)] rounded-[var(--radius-sm)] text-[0.9rem] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary-500)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] focus:bg-[rgba(255,255,255,0.08)] outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Auto-filled from role" />
            </div>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={!!showEdit} onClose={() => setShowEdit(null)} title="Edit User"
        footer={<><button className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed px-[1.25rem] py-[0.6rem] text-[0.875rem] bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-hover)]" onClick={() => setShowEdit(null)}>Cancel</button><button className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed px-[1.25rem] py-[0.6rem] text-[0.875rem] bg-gradient-to-br from-[var(--primary-600)] to-[var(--primary-500)] text-white border border-[var(--primary-500)] hover:-translate-y-[1px] hover:shadow-[0_4px_15px_rgba(99,102,241,0.3)]" onClick={handleUpdate} disabled={submitting}>{submitting ? 'Saving...' : 'Update User'}</button></>}>
        <form onSubmit={handleUpdate}>
          <div className="mb-5"><label className="block text-[0.8rem] font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-[0.05em]">Name</label><input className="w-full px-[0.9rem] py-[0.65rem] bg-[var(--bg-input)] border border-[var(--border-color)] rounded-[var(--radius-sm)] text-[0.9rem] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary-500)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] focus:bg-[rgba(255,255,255,0.08)] outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="mb-5"><label className="block text-[0.8rem] font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-[0.05em]">Email</label><input type="email" className="w-full px-[0.9rem] py-[0.65rem] bg-[var(--bg-input)] border border-[var(--border-color)] rounded-[var(--radius-sm)] text-[0.9rem] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary-500)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] focus:bg-[rgba(255,255,255,0.08)] outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
            <div className="mb-5">
              <label className="block text-[0.8rem] font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-[0.05em]">Role</label>
              <select className="w-full px-[0.9rem] py-[0.65rem] bg-[var(--bg-input)] border border-[var(--border-color)] rounded-[var(--radius-sm)] text-[0.9rem] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary-500)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] focus:bg-[rgba(255,255,255,0.08)] outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="ADMIN">Admin</option><option value="STAFF_PURCHASE">Staff - Purchase</option><option value="STAFF_QUALITY">Staff - Quality</option><option value="STAFF_RND">Staff - R&D</option><option value="STAFF_STORE">Staff - Store</option>
              </select>
            </div>
            <div className="mb-5">
              <label className="block text-[0.8rem] font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-[0.05em]">Department</label>
              <input className="w-full px-[0.9rem] py-[0.65rem] bg-[var(--bg-input)] border border-[var(--border-color)] rounded-[var(--radius-sm)] text-[0.9rem] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary-500)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] focus:bg-[rgba(255,255,255,0.08)] outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Users;
