import { HiOutlineX } from 'react-icons/hi';

const Modal = ({ isOpen, onClose, title, children, footer, wide }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={wide ? { maxWidth: '720px' } : {}}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="btn-ghost" onClick={onClose}>
            <HiOutlineX size={20} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;
