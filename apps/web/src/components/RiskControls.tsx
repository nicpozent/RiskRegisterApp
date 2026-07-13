import { useEffect, useState } from 'react';
import { Risks, Controls } from '../api.js';
import type { ControlView } from '../types.js';

/** Mapped-controls panel for a risk, with a search-and-map picker. */
export function RiskControls({ riskId }: { riskId: string }) {
  const [mapped, setMapped] = useState<ControlView[]>([]);
  const [picking, setPicking] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<ControlView[]>([]);
  const [error, setError] = useState<string | null>(null);

  function loadMapped() { Risks.controls(riskId).then(setMapped).catch((e) => setError(String(e.message ?? e))); }
  useEffect(loadMapped, [riskId]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const page = await Controls.list({ q: q.trim() || undefined, limit: 10 });
      setResults(page.items);
    } catch (err) { setError(String((err as Error).message ?? err)); }
  }

  async function map(controlId: string) {
    setError(null);
    try {
      await Risks.mapControl(riskId, controlId);
      loadMapped();
    } catch (err) { setError(String((err as Error).message ?? err)); }
  }

  const mappedIds = new Set(mapped.map((c) => c.id));

  return (
    <div className="card">
      <div className="row spread">
        <h3 style={{ margin: 0 }}>Controls ({mapped.length})</h3>
        <button onClick={() => setPicking((p) => !p)}>{picking ? 'Done' : 'Map control'}</button>
      </div>

      {error && <div className="error">{error}</div>}

      <ul style={{ marginTop: 12 }}>
        {mapped.map((c) => (
          <li key={c.id}><strong>{c.ref}</strong> — {c.title} <span className="muted">({c.framework})</span></li>
        ))}
        {mapped.length === 0 && <li className="muted">No controls mapped yet.</li>}
      </ul>

      {picking && (
        <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <form className="row" onSubmit={search}>
            <input placeholder="Search controls to map…" value={q} onChange={(e) => setQ(e.target.value)} />
            <button type="submit">Search</button>
          </form>
          <ul style={{ marginTop: 10 }}>
            {results.map((c) => (
              <li key={c.id} className="row spread" style={{ padding: '4px 0' }}>
                <span><strong>{c.ref}</strong> — {c.title} <span className="muted">({c.framework})</span></span>
                {mappedIds.has(c.id)
                  ? <span className="muted">mapped</span>
                  : <button onClick={() => map(c.id)}>Add</button>}
              </li>
            ))}
            {results.length === 0 && <li className="muted">Search the catalogue to map a control.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
