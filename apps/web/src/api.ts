import { pca, loginRequest } from './authConfig.js';

const BASE = import.meta.env.VITE_API_BASE ?? '/api';

// Attach a fresh Entra access token to every API call.
async function token(): Promise<string> {
  const account = pca.getAllAccounts()[0];
  const res = await pca.acquireTokenSilent({ ...loginRequest, account });
  return res.accessToken;
}
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}`, ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.status === 204 ? (undefined as T) : res.json();
}
export const Risks = {
  list: () => api<any[]>('/risks'),
  create: (r: any) => api('/risks', { method: 'POST', body: JSON.stringify(r) }),
  mapControl: (riskId: string, controlId: string) =>
    api(`/risks/${riskId}/controls/${controlId}`, { method: 'POST' }),
};
export const Controls = {
  list: (q: Record<string,string> = {}) => api<any[]>('/controls?' + new URLSearchParams(q)),
};
