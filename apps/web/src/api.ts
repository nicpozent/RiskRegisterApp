import { pca, loginRequest } from './authConfig.js';
import type { RiskView, RiskInput, RiskSummary, FrameworkView, ControlView, TreatmentAction } from './types.js';

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
  async summary(): Promise<RiskSummary> {
    return (await request('/risks/summary')).json();
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
  async controls(id: string): Promise<ControlView[]> {
    return (await request(`/risks/${id}/controls`)).json();
  },
  async mapControl(id: string, controlId: string): Promise<void> {
    await request(`/risks/${id}/controls/${controlId}`, { method: 'POST' });
  },
  async actions(id: string): Promise<TreatmentAction[]> {
    return (await request(`/risks/${id}/actions`)).json();
  },
  async addAction(id: string, body: { description: string; dueDate?: string; status?: string }): Promise<TreatmentAction> {
    return (await request(`/risks/${id}/actions`, { method: 'POST', body: JSON.stringify(body) })).json();
  },
  async updateAction(id: string, actionId: string, patch: { description?: string; dueDate?: string; status?: string }): Promise<TreatmentAction> {
    return (await request(`/risks/${id}/actions/${actionId}`, { method: 'PATCH', body: JSON.stringify(patch) })).json();
  },
};

export const Controls = {
  async frameworks(): Promise<FrameworkView[]> {
    return (await request('/frameworks')).json();
  },
  async list(opts: { framework?: string; q?: string; limit?: number; offset?: number } = {}): Promise<Page<ControlView>> {
    const p = new URLSearchParams();
    if (opts.framework) p.set('framework', opts.framework);
    if (opts.q) p.set('q', opts.q);
    p.set('limit', String(opts.limit ?? 20));
    p.set('offset', String(opts.offset ?? 0));
    const res = await request(`/controls?${p.toString()}`);
    return { items: await res.json(), total: Number(res.headers.get('X-Total-Count') ?? '0') };
  },
};
