import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

export function useSubscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setSubscriptions(await apiFetch('/api/subscriptions'));
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  async function addSubscription(sub) {
    const created = await apiFetch('/api/subscriptions', {
      method: 'POST',
      body: JSON.stringify(sub),
    });
    setSubscriptions((prev) => [...prev, created]);
  }

  async function updateSubscription(id, payload) {
    const updated = await apiFetch(`/api/subscriptions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    setSubscriptions((prev) => prev.map((sub) => (sub.id === id ? updated : sub)));
  }

  async function removeSubscription(id) {
    await apiFetch(`/api/subscriptions/${id}`, { method: 'DELETE' });
    setSubscriptions((prev) => prev.filter((sub) => sub.id !== id));
  }

  return { subscriptions, loading, addSubscription, updateSubscription, removeSubscription };
}
