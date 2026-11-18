// crypto.randomUUID only exists in secure contexts; LAN dev over plain http has none.
export function createId() {
  return crypto.randomUUID?.() ?? `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
