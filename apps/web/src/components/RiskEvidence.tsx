import { useEffect, useRef, useState } from 'react';
import { Risks } from '../api.js';
import { downloadBlob } from '../download.js';
import type { EvidenceMeta } from '../types.js';
import { EVIDENCE_CONTENT_TYPES, MAX_EVIDENCE_BYTES } from '../types.js';

const kb = (n: number) => `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;

// Read a File as base64 (strip the "data:<type>;base64," prefix).
function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

/** Evidence-attachment panel for a risk: list, upload and download files. */
export function RiskEvidence({ riskId }: { riskId: string }) {
  const [items, setItems] = useState<EvidenceMeta[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function load() { Risks.evidence(riskId).then(setItems).catch((e) => setError(String(e.message ?? e))); }
  useEffect(load, [riskId]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = ''; // allow re-selecting the same file
    if (!file) return;
    setError(null);
    if (!EVIDENCE_CONTENT_TYPES.includes(file.type)) {
      setError(`Unsupported file type: ${file.type || 'unknown'}. Allowed: PDF, image, CSV, text, Office documents.`);
      return;
    }
    if (file.size > MAX_EVIDENCE_BYTES) { setError('File exceeds the 10 MB limit.'); return; }
    setBusy(true);
    try {
      await Risks.uploadEvidence(riskId, { filename: file.name, contentType: file.type, dataBase64: await toBase64(file) });
      load();
    } catch (err) { setError(String((err as Error).message ?? err)); }
    finally { setBusy(false); }
  }

  async function download(ev: EvidenceMeta) {
    setError(null);
    try { downloadBlob(await Risks.evidenceBlob(riskId, ev.id), ev.filename); }
    catch (err) { setError(String((err as Error).message ?? err)); }
  }

  async function remove(ev: EvidenceMeta) {
    setError(null);
    try { await Risks.deleteEvidence(riskId, ev.id); load(); }
    catch (err) { setError(String((err as Error).message ?? err)); }
  }

  return (
    <div className="card">
      <div className="row spread">
        <h3 style={{ margin: 0 }}>Evidence ({items.length})</h3>
        <button onClick={() => fileRef.current?.click()} disabled={busy}>{busy ? 'Uploading…' : 'Upload file'}</button>
        <input ref={fileRef} type="file" hidden onChange={onFile} />
      </div>

      {error && <div className="error">{error}</div>}

      <ul style={{ marginTop: 12 }}>
        {items.map((ev) => (
          <li key={ev.id} className="row spread" style={{ padding: '4px 0' }}>
            <span><button className="linklike" onClick={() => download(ev)}>{ev.filename}</button>
              <span className="muted"> · {kb(ev.sizeBytes)} · {ev.createdAt.slice(0, 10)}</span></span>
            <button className="danger" onClick={() => remove(ev)}>Remove</button>
          </li>
        ))}
        {items.length === 0 && <li className="muted">No evidence attached yet.</li>}
      </ul>
    </div>
  );
}
