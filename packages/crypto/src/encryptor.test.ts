import { describe, it, expect, beforeEach } from 'vitest';
import { randomBytes } from 'node:crypto';
import { getEncryptor, _resetEncryptor, aesEncrypt, aesDecrypt } from './encryptor.js';

const KEY = randomBytes(32).toString('base64');
const IDX = randomBytes(32).toString('base64');

describe('local encryptor', () => {
  beforeEach(() => {
    process.env.DATA_ENCRYPTION_KEY = KEY;
    process.env.DATA_INDEX_KEY = IDX;
    delete process.env.BAO_ADDR;
    _resetEncryptor();
  });

  it('round-trips a string and stores prefixed ciphertext (not plaintext)', async () => {
    const enc = getEncryptor();
    expect(enc.enabled).toBe(true);
    const ct = await enc.encrypt('unencrypted backups are bad');
    expect(ct.startsWith('l1:')).toBe(true);
    expect(ct).not.toContain('backups');
    expect(await enc.decrypt(ct)).toBe('unencrypted backups are bad');
  });

  it('passes through values without a known scheme prefix (legacy plaintext)', async () => {
    expect(await getEncryptor().decrypt('legacy plaintext')).toBe('legacy plaintext');
  });

  it('wraps and unwraps a data key (envelope)', async () => {
    const enc = getEncryptor();
    const dek = randomBytes(32);
    const wrapped = await enc.wrapKey(dek);
    expect(wrapped.startsWith('l1:')).toBe(true);
    expect((await enc.unwrapKey(wrapped)).equals(dek)).toBe(true);
  });

  it('produces a deterministic, case/space-insensitive blind index', async () => {
    const enc = getEncryptor();
    expect(enc.blindIndex('User@B.com ')).toBe(enc.blindIndex('user@b.com'));
    expect(enc.blindIndex('a@b.com')).not.toBe(enc.blindIndex('c@d.com'));
  });

  it('envelope AES-GCM round-trips binary data', () => {
    const key = randomBytes(32);
    const data = randomBytes(4096);
    expect(aesDecrypt(key, aesEncrypt(key, data)).equals(data)).toBe(true);
  });
});

describe('noop encryptor (no key configured)', () => {
  beforeEach(() => {
    delete process.env.DATA_ENCRYPTION_KEY;
    delete process.env.DATA_INDEX_KEY;
    delete process.env.BAO_ADDR;
    _resetEncryptor();
  });

  it('is disabled and passes values through unchanged', async () => {
    const enc = getEncryptor();
    expect(enc.enabled).toBe(false);
    expect(await enc.encrypt('x')).toBe('x');
    expect(await enc.decrypt('x')).toBe('x');
    expect(enc.blindIndex('x')).toBeNull();
  });
});
