async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.details?.join('; ') || data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  health: () => request('/health'),
  meta: () => request('/meta'),
  forecast: (inputs, signal) => request('/forecast', { method: 'POST', body: JSON.stringify(inputs), signal }),
  save: (inputs) => request('/simulations', { method: 'POST', body: JSON.stringify(inputs) }),
  list: () => request('/simulations?limit=30'),
  remove: (id) => request(`/simulations/${id}`, { method: 'DELETE' }),
  clear: () => request('/simulations', { method: 'DELETE' }),
};
