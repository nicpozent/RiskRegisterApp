import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { HAS_DB, pool } from './helpers.js';
import { startHealthServer } from '../../src/server.js';

describe.skipIf(!HAS_DB)('worker health/metrics server', () => {
  let server: Server;
  const base = () => `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  beforeAll(() => { server = startHealthServer(pool, 0); }); // ephemeral port
  afterAll(async () => {
    await new Promise<void>((r) => server.close(() => r()));
    await pool.end();
  });

  it('serves /healthz (liveness)', async () => {
    const res = await fetch(`${base()}/healthz`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('serves /readyz with a reachable database', async () => {
    const res = await fetch(`${base()}/readyz`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ready: true });
  });

  it('serves Prometheus metrics at /metrics', async () => {
    const res = await fetch(`${base()}/metrics`);
    expect(res.status).toBe(200);
    expect(await res.text()).toMatch(/worker_poll_total|process_cpu_seconds_total/);
  });

  it('404s an unknown path', async () => {
    expect((await fetch(`${base()}/nope`)).status).toBe(404);
  });
});
