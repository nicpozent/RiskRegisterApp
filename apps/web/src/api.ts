import { pca, loginRequest } from './authConfig.js';
import type { RiskView, RiskInput } from './types.js';

const BASE = import.meta.env.VITE_API_BASE ?? '/api';

/** Raised on a 409 optimistic-concurrency conflict so the UI can react to it. */
export class ConflictError extends Error {}

// Attach a fresh Entra access token to every API call.
async function token(): Promise<string> {
  const account = pca.getAllAccounts()[0];
  const res = await pca.acquireTokenSilent({ ...loginRequest, account });
  return res.accessToken;
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}`, ...(init.headers ?? {}) },
  });
  if (res.status === 409) throw new ConflictError('This risk was changed by someone else. Reload and retry.');
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res;
}

export interface Page<T> { items: T[]; total: number; }

export const Risks = {
  async list(limit = 20, offset = 0): Promise<Page<RiskView>> {
    const res = await request(`/risks?limit=${limit}&offset=${offset}`);
    const total = Number(res.headers.get('X-Total-Count') ?? '0');
    return { items: await res.json(), total };
  },
  async get(id: string): Promise<RiskView> {
    return (await request(`/risks/${id}`)).json();
  },
  async create(body: RiskInput): Promise<RiskView> {
    return (await request('/risks', { method: 'POST', body: JSON.stringify(body) })).json();
  },
  // Optimistic concurrency: echo the last-seen version as If-Match.
  async update(id: string, patch: Partial<RiskInput>, version: number): Promise<RiskView> {
    return (await request(`/risks/${id}`, {
      method: 'PATCH', headers: { 'If-Match': String(version) }, body: JSON.stringify(patch),
    })).json();
  },
  async accept(id: string): Promise<RiskView> {
    return (await request(`/risks/${id}/accept`, { method: 'POST' })).json();
  },
};
