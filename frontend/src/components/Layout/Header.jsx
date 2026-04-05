import { useAuth } from '../../context/AuthContext';
import { HiOutlineMenuAlt2, HiOutlineBell } from 'react-icons/hi';
import './Header.css';

const Header = ({ onMenuClick }) => {
  const { user } = useAuth();

  return (
    <header className="app-header">
      <button className="menu-toggle" onClick={onMenuClick}>
        <HiOutlineMenuAlt2 />
      </button>
      <div className="header-right">
        <span className="header-greeting">
          Welcome, <strong>{user?.name?.split(' ')[0]}</strong>
        </span>
      </div>
    </header>
  );
};

export default Header;
