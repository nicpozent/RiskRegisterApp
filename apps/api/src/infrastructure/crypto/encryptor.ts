// Application-level encryption at rest — pluggable, envelope-friendly.
//
// Providers (selected by env, opt-in):
//   - openbao-transit : keys live in OpenBao/Vault (BAO_ADDR set); the app never
//                       holds the key material. Small strings are encrypted via
//                       the Transit engine; large blobs use envelope encryption
//                       (a local AES data key, wrapped by Transit).
//   - local           : AES-256-GCM with a key from DATA_ENCRYPTION_KEY.
//   - noop            : passthrough (no key configured) — logs a warning in prod.
//
// Stored ciphertext is scheme-prefixed (l1: / b1:); anything without a known
// prefix is returned unchanged, so pre-existing plaintext rows still read.
import { createCipheriv, createDecipheriv, randomBytes, createHmac, timingSafeEqual } from 'node:crypto';

export interface Encryptor {
  readonly enabled: boolean;
  encrypt(plaintext: string): Promise<string>;
  decrypt(value: string): Promise<string>;
  /** Wrap/unwrap a 32-byte data-encryption key for envelope encryption of blobs. */
  wrapKey(dek: Buffer): Promise<string>;
  unwrapKey(wrapped: string): Promise<Buffer>;
  /** Keyed HMAC for exact-match lookups on an encrypted column (null if no index key). */
  blindIndex(value: string): string | null;
}

// ---- Local symmetric primitives (also used for blob envelopes) ----
export function aesEncrypt(key: Buffer, plain: Buffer): Buffer {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([c.update(plain), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), ct]); // iv(12) | tag(16) | ct
}
export function aesDecrypt(key: Buffer, blob: Buffer): Buffer {
  const iv = blob.subarray(0, 12);
  const tag = blob.subarray(12, 28);
  const ct = blob.subarray(28);
  const d = createDecipheriv('aes-256-gcm', key, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]);
}

function indexKey(): Buffer | null {
  const b64 = process.env.DATA_INDEX_KEY;
  return b64 ? Buffer.from(b64, 'base64') : null;
}
function hmac(value: string): string | null {
  const k = indexKey();
  if (!k) return null;
  return createHmac('sha256', k).update(value.trim().toLowerCase()).digest('hex');
}
export function blindIndexEquals(a: string, b: string): boolean {
  const ab = Buffer.from(a); const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

// ---- local (AES-256-GCM with DATA_ENCRYPTION_KEY) ----
class LocalEncryptor implements Encryptor {
  readonly enabled = true;
  constructor(private key: Buffer) {}
  async encrypt(p: string) { return 'l1:' + aesEncrypt(this.key, Buffer.from(p, 'utf8')).toString('base64'); }
  async decrypt(v: string) {
    if (!v?.startsWith('l1:')) return v;
    return aesDecrypt(this.key, Buffer.from(v.slice(3), 'base64')).toString('utf8');
  }
  async wrapKey(dek: Buffer) { return this.encrypt(dek.toString('base64')); }
  async unwrapKey(w: string) { return Buffer.from(await this.decrypt(w), 'base64'); }
  blindIndex(v: string) { return hmac(v); }
}

// ---- openbao-transit (key stays in OpenBao/Vault) ----
class OpenBaoEncryptor implements Encryptor {
  readonly enabled = true;
  constructor(private addr: string, private token: string, private keyName: string) {}
  private async call(op: 'encrypt' | 'decrypt', body: object): Promise<Record<string, unknown>> {
    const res = await fetch(`${this.addr}/v1/transit/${op}/${this.keyName}`, {
      method: 'POST',
      headers: { 'X-Vault-Token': this.token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`OpenBao transit ${op} failed: ${res.status}`);
    return (await res.json() as { data: Record<string, unknown> }).data;
  }
  async encrypt(p: string) {
    const d = await this.call('encrypt', { plaintext: Buffer.from(p, 'utf8').toString('base64') });
    return 'b1:' + String(d.ciphertext);
  }
  async decrypt(v: string) {
    if (!v?.startsWith('b1:')) return v;
    const d = await this.call('decrypt', { ciphertext: v.slice(3) });
    return Buffer.from(String(d.plaintext), 'base64').toString('utf8');
  }
  async wrapKey(dek: Buffer) {
    const d = await this.call('encrypt', { plaintext: dek.toString('base64') });
    return 'b1:' + String(d.ciphertext);
  }
  async unwrapKey(w: string) {
    const d = await this.call('decrypt', { ciphertext: w.slice(3) });
    return Buffer.from(String(d.plaintext), 'base64');
  }
  blindIndex(v: string) { return hmac(v); } // local HMAC — avoids a network round-trip per lookup
}

// ---- noop (no key configured) ----
class NoopEncryptor implements Encryptor {
  readonly enabled = false;
  async encrypt(p: string) { return p; }
  async decrypt(v: string) { return v; }
  async wrapKey(dek: Buffer) { return dek.toString('base64'); }
  async unwrapKey(w: string) { return Buffer.from(w, 'base64'); }
  blindIndex() { return null; }
}

let singleton: Encryptor | undefined;
export function getEncryptor(): Encryptor {
  if (singleton) return singleton;
  if (process.env.BAO_ADDR && process.env.BAO_TOKEN) {
    singleton = new OpenBaoEncryptor(process.env.BAO_ADDR, process.env.BAO_TOKEN, process.env.BAO_TRANSIT_KEY ?? 'risk-register');
  } else if (process.env.DATA_ENCRYPTION_KEY) {
    singleton = new LocalEncryptor(Buffer.from(process.env.DATA_ENCRYPTION_KEY, 'base64'));
  } else {
    if (process.env.NODE_ENV === 'production') {
      // eslint-disable-next-line no-console
      console.warn('WARNING: no data-encryption key configured (BAO_ADDR or DATA_ENCRYPTION_KEY) — sensitive fields are stored in clear.');
    }
    singleton = new NoopEncryptor();
  }
  return singleton;
}

/** Test helper: reset the memoized provider. */
export function _resetEncryptor() { singleton = undefined; }
