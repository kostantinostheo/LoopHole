import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { createId } from '../utils/ids';

// Subscriptions from the API. In sandbox mode they live in memory only, so a refresh wipes them.
export function useSubscriptions({ sandbox = false } = {}) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(!sandbox);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (sandbox) return;
    api('/api/subscriptions')
      .then(setSubscriptions)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [sandbox]);

  // Creates when `id` is empty, otherwise updates.
  async function saveSubscription(id, payload) {
    let saved = { ...payload, id: id || createId() };
    if (!sandbox) {
      saved = await api(id ? `/api/subscriptions/${id}` : '/api/subscriptions', id ? 'PUT' : 'POST', payload);
    }

    setSubscriptions((prev) => (id ? prev.map((sub) => (sub.id === id ? saved : sub)) : [...prev, saved]));
  }

  async function removeSubscription(id) {
    if (!sandbox) await api(`/api/subscriptions/${id}`, 'DELETE');
    setSubscriptions((prev) => prev.filter((sub) => sub.id !== id));
  }

  return { subscriptions, loading, error, saveSubscription, removeSubscription };
}
