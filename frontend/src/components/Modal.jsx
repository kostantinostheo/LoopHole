// Dialog over a backdrop; clicking the backdrop closes it. `as` lets a <form> be the dialog itself.
export default function Modal({ title, onClose, as: Dialog = 'div', className = '', children, ...props }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <Dialog className={`modal ${className}`} onClick={(e) => e.stopPropagation()} {...props}>
        {title && <h2 className="modal__title">{title}</h2>}
        {children}
      </Dialog>
    </div>
  );
}

export function ConfirmModal({
  title,
  confirmLabel = 'Confirm',
  danger = false,
  onConfirm,
  onCancel,
  children,
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="modal__text">{children}</p>
      <div className="modal__actions">
        <button type="button" className="btn btn--secondary" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
