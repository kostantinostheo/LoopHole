import { useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { ConfirmModal } from '../components/Modal';
import AccountMenu from '../components/subscriptions/AccountMenu';
import SubscriptionCard from '../components/subscriptions/SubscriptionCard';
import SubscriptionForm from '../components/subscriptions/SubscriptionForm';
import { useAuth } from '../context/AuthContext';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { formatMoney, totalMonthlyCost } from '../utils/money';

const SANDBOX_USER = { id: 'sandbox', email: 'sandbox@example.com', currency: 'USD' };

export default function DashboardPage({ sandbox = false }) {
  const { subscriptions, loading, error, saveSubscription, removeSubscription } = useSubscriptions({ sandbox });
  const auth = useAuth();
  const user = sandbox ? SANDBOX_USER : auth.user;

  // null = closed, 'new' = add form, otherwise the subscription being edited
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const sorted = [...subscriptions].sort((a, b) => a.nextDate.localeCompare(b.nextDate));

  if (loading) {
    return (
      <div className="subs-dashboard">
        <p className="subs-dashboard__empty">Loading subscriptions…</p>
      </div>
    );
  }

  return (
    <div className="subs-dashboard">
      {sandbox && (
        <div className="subs-dashboard__sandbox-banner">
          Sandbox mode &middot; nothing is saved &middot; refresh to reset
        </div>
      )}

      <header className="subs-dashboard__header">
        <div>
          <h1>Subscriptions</h1>
          <p className="subs-dashboard__total">
            {formatMoney(totalMonthlyCost(subscriptions), user?.currency)}
            <span> / month</span>
          </p>
        </div>
        <div className="subs-dashboard__header-actions">
          <button
            className="btn btn--primary subs-dashboard__add-btn"
            onClick={() => setEditing(editing ? null : 'new')}
          >
            {editing ? 'Cancel' : 'Add'}
          </button>
          <AccountMenu user={user} sandbox={sandbox} onLogout={auth.logout} />
        </div>
      </header>

      {!editing && (
        <button
          type="button"
          className="subs-fab"
          aria-label="Add subscription"
          onClick={() => setEditing('new')}
        >
          <FiPlus />
        </button>
      )}

      {editing && (
        <SubscriptionForm
          subscription={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(payload) => {
            saveSubscription(editing.id, payload);
            setEditing(null);
          }}
        />
      )}

      {error ? (
        <p className="subs-dashboard__empty">Couldn't load subscriptions: {error}</p>
      ) : sorted.length === 0 ? (
        <p className="subs-dashboard__empty">No subscriptions yet. Add your first one.</p>
      ) : (
        <ul className="subs-list">
          {sorted.map((sub) => (
            <SubscriptionCard
              key={sub.id}
              sub={sub}
              currency={user?.currency}
              onEdit={() => setEditing(sub)}
              onDelete={() => setPendingDelete(sub)}
            />
          ))}
        </ul>
      )}

      {pendingDelete && (
        <ConfirmModal
          title="Delete subscription?"
          confirmLabel="Delete"
          danger
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            removeSubscription(pendingDelete.id);
            setPendingDelete(null);
          }}
        >
          This will permanently delete <b>{pendingDelete.name}</b> and its reminders. This can't be undone.
        </ConfirmModal>
      )}
    </div>
  );
}
