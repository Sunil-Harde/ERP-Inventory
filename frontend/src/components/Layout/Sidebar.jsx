import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  HiOutlineViewGrid, HiOutlineCube, HiOutlineShoppingCart,
  HiOutlineShieldCheck, HiOutlineBeaker, HiOutlineUsers,
  HiOutlineClipboardList, HiOutlineChartBar, HiOutlineLogout,
  HiOutlineX, HiOutlineExclamationCircle, HiOutlineQrcode, HiOutlineBan,
  HiOutlineClipboardCheck, HiOutlineCog // ✨ NEW ICONS ADDED
} from 'react-icons/hi';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout, hasRole } = useAuth();
  const location = useLocation();

  const navItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: <HiOutlineViewGrid />,
      roles: null, // all
    },
    {
      label: 'Inventory',
      path: '/inventory',
      icon: <HiOutlineCube />,
      roles: null,
    },
    {
      label: 'Low Stock',
      path: '/low-stock',
      icon: <HiOutlineExclamationCircle />,
      roles: null,
    },
    {
      label: 'Transactions',
      path: '/transactions',
      icon: <HiOutlineClipboardList />,
      roles: null,
    },
    {
      label: 'Scan QR',
      path: '/scan',
      icon: <HiOutlineQrcode />,
      roles: null,
    },
    {
      label: 'Purchase Orders',
      path: '/purchase',
      icon: <HiOutlineShoppingCart />,
      roles: ['ADMIN', 'STAFF_PURCHASE'],
    },
    {
      label: 'Quality Check',
      path: '/quality',
      icon: <HiOutlineShieldCheck />,
      roles: ['ADMIN', 'STAFF_QUALITY'],
    },
    {
      label: 'Rejected Items',
      path: '/rejected-items',
      icon: <HiOutlineBan />,
      roles: ['ADMIN', 'STAFF_QUALITY'],
    },
    
    // ── ✨ UPDATED ERP WORKFLOW MENU ──

    {
      label: 'R&D Recipes',
      path: '/rnd',
      icon: <HiOutlineBeaker />,
      // Only Admin and R&D can see this now
      roles: ['ADMIN', 'STAFF_RND'], 
    },
    {
      label: 'Shop 1 Approvals',
      path: '/shop1',
      icon: <HiOutlineClipboardCheck />,
      // Only Admin and Store can see this
      roles: ['ADMIN', 'STAFF_STORE'], 
    },
    {
      label: 'Shop 2 Production',
      path: '/shop2',
      icon: <HiOutlineCog />,
      // Only Admin and Store can see this
      roles: ['ADMIN', 'STAFF_STORE'], 
    },

    // ──────────────────────────────────

    {
      label: 'Analytics',
      path: '/analytics',
      icon: <HiOutlineChartBar />,
      roles: ['ADMIN'],
    },
    {
      label: 'User Management',
      path: '/users',
      icon: <HiOutlineUsers />,
      roles: ['ADMIN'],
    },
    {
      label: 'Audit Logs',
      path: '/audit',
      icon: <HiOutlineClipboardList />,
      roles: ['ADMIN'],
    },
  ];

  const filteredNav = navItems.filter(
    (item) => !item.roles || hasRole(...item.roles)
  );

  const getRoleBadge = (role) => {
    const map = {
      ADMIN: { label: 'Admin', className: 'role-admin' },
      STAFF_PURCHASE: { label: 'Purchase', className: 'role-purchase' },
      STAFF_QUALITY: { label: 'Quality', className: 'role-quality' },
      STAFF_RND: { label: 'R&D', className: 'role-rnd' },
      STAFF_STORE: { label: 'Store', className: 'role-store' },
    };
    return map[role] || { label: role, className: '' };
  };

  const roleBadge = getRoleBadge(user?.role);

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-icon">
            <HiOutlineCube />
          </div>
          <div className="logo-text">
            <span className="logo-title">ERP</span>
            <span className="logo-subtitle">Inventory</span>
          </div>
          <button className="sidebar-close-btn" onClick={onClose}>
            <HiOutlineX />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {filteredNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
              onClick={onClose}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Section */}
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="user-details">
              <span className="user-name">{user?.name}</span>
              <span className={`user-role ${roleBadge.className}`}>
                {roleBadge.label}
              </span>
            </div>
          </div>
          <button className="logout-btn" onClick={logout} title="Logout">
            <HiOutlineLogout />
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;