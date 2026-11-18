import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiBarChart2, FiCalendar, FiChevronDown, FiLogOut, FiSettings } from 'react-icons/fi';

const PAGES = [
  { to: '/settings', icon: FiSettings, label: 'Settings' },
  { to: '/calendar', icon: FiCalendar, label: 'Calendar' },
  { to: '/statistics', icon: FiBarChart2, label: 'Statistics' },
];

export default function AccountMenu({ user, sandbox, onLogout }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const close = () => setOpen(false);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;

    const onMouseDown = (e) => !menuRef.current?.contains(e.target) && close();
    const onKeyDown = (e) => e.key === 'Escape' && close();

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="account-menu" ref={menuRef}>
      <button
        type="button"
        className="account-menu__trigger"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="account-menu__avatar">{(user?.email?.[0] || '?').toUpperCase()}</span>
        <FiChevronDown className={`account-menu__chevron${open ? ' account-menu__chevron--open' : ''}`} />
      </button>

      {open && (
        <div className="account-menu__dropdown" role="menu">
          {user && <p className="account-menu__email">{user.email}</p>}

          {!sandbox && (
            <>
              {PAGES.map(({ to, icon: Icon, label }) => (
                <Link key={to} to={to} className="account-menu__item" role="menuitem" onClick={close}>
                  <Icon className="account-menu__icon" />
                  {label}
                </Link>
              ))}
              <div className="account-menu__divider" />
            </>
          )}

          {sandbox ? (
            <Link
              to="/"
              className="account-menu__item account-menu__item--danger"
              role="menuitem"
              onClick={close}
            >
              <FiLogOut className="account-menu__icon" />
              Exit sandbox
            </Link>
          ) : (
            <button
              type="button"
              className="account-menu__item account-menu__item--danger"
              role="menuitem"
              onClick={() => {
                close();
                onLogout();
              }}
            >
              <FiLogOut className="account-menu__icon" />
              Log out
            </button>
          )}
        </div>
      )}
    </div>
  );
}
