import { describe, it, expect, vi, beforeEach } from 'vitest';

// Stub MSAL so api.ts can acquire a token without a real Entra session.
vi.mock('../src/authConfig.js', () => ({
  pca: {
    getAllAccounts: () => [{ username: 'u@b.com' }],
    acquireTokenSilent: vi.fn(async () => ({ accessToken: 'test-token' })),
  },
  loginRequest: { scopes: ['api://test/.default'] },
}));

import { Risks, ConflictError } from '../src/api.js';

function mockFetch(status: number, body: unknown, headers: Record<string, string> = {}) {
  const res = {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? headers[k] ?? null },
    json: async () => body,
  };
  const fn = vi.fn(async () => res);
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('api client', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('attaches a bearer token to every request', async () => {
    const fetchFn = mockFetch(200, [], { 'X-Total-Count': '0' });
    await Risks.list();
    const init = fetchFn.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-token');
  });

  it('reads the total from X-Total-Count on list()', async () => {
    mockFetch(200, [{ id: '1', ref: 'RR-001' }], { 'X-Total-Count': '42' });
    const page = await Risks.list(20, 0);
    expect(page.total).toBe(42);
    expect(page.items).toHaveLength(1);
  });

  it('sends If-Match with the version on update()', async () => {
    const fetchFn = mockFetch(200, { id: '1', version: 2 });
    await Risks.update('1', { title: 'x' }, 1);
    const init = fetchFn.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['If-Match']).toBe('1');
    expect(init.method).toBe('PATCH');
  });

  it('throws ConflictError on a 409', async () => {
    mockFetch(409, {});
    await expect(Risks.update('1', { title: 'x' }, 0)).rejects.toBeInstanceOf(ConflictError);
  });

  it('throws a generic error on other non-2xx responses', async () => {
    mockFetch(500, {});
    await expect(Risks.list()).rejects.toThrow(/API 500/);
  });
});
