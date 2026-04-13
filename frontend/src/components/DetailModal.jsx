import Modal from './Modal';

/**
 * Reusable detail-view modal for any table row.
 * 
 * Props:
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - title: string (modal header)
 *  - data: object (the row data to display)
 *  - fields: array of { label, key, render? }
 *      label: display label
 *      key: dot-notation key into data (e.g. 'performedBy.name')
 *      render: optional (value, data) => ReactNode for custom rendering
 */
const DetailModal = ({ isOpen, onClose, title = 'Details', data, fields = [] }) => {
  if (!data) return null;

  const resolve = (obj, path) => {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}
      footer={
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onClose}
        >
          Close
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {fields.map((field, i) => {
          const rawValue = resolve(data, field.key);
          const displayValue = field.render ? field.render(rawValue, data) : (rawValue ?? '—');

          return (
            <div
              key={field.key + i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                padding: '0.7rem 0',
                borderBottom: i < fields.length - 1 ? '1px solid var(--border-color)' : 'none',
                gap: '1rem',
              }}
            >
              <span style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                flexShrink: 0,
                minWidth: 120,
              }}>
                {field.label}
              </span>
              <span style={{
                fontSize: '0.88rem',
                color: 'var(--text-primary)',
                fontWeight: 500,
                textAlign: 'right',
                wordBreak: 'break-word',
              }}>
                {displayValue}
              </span>
            </div>
          );
        })}
      </div>
    </Modal>
  );
};

export default DetailModal;
