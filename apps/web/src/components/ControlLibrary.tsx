import { useEffect, useState } from 'react';
import { Controls } from '../api.js';
import type { ControlView, FrameworkView } from '../types.js';

const PAGE = 20;

/** Browse the control catalogue: filter by framework, search, paginate. */
export function ControlLibrary() {
  const [frameworks, setFrameworks] = useState<FrameworkView[]>([]);
  const [framework, setFramework] = useState('');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState(''); // debounced/submitted search term
  const [items, setItems] = useState<ControlView[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { Controls.frameworks().then(setFrameworks).catch(() => {}); }, []);

  // Reset to first page whenever a filter changes.
  useEffect(() => { setOffset(0); }, [framework, query]);

  useEffect(() => {
    let live = true;
    setLoading(true);
    Controls.list({ framework: framework || undefined, q: query || undefined, limit: PAGE, offset })
      .then((page) => { if (live) { setItems(page.items); setTotal(page.total); setError(null); } })
      .catch((e) => { if (live) setError(String(e.message ?? e)); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [framework, query, offset]);

  const to = Math.min(offset + PAGE, total);

  return (
    <div>
      <div className="row spread"><h2>Control library</h2></div>

      <div className="card">
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <select value={framework} onChange={(e) => setFramework(e.target.value)} style={{ maxWidth: 320 }}>
            <option value="">All frameworks</option>
            {frameworks.map((f) => (
              <option key={f.id} value={f.id}>{f.short} — {f.region} ({f.count})</option>
            ))}
          </select>
          <form className="row" style={{ flex: 1 }} onSubmit={(e) => { e.preventDefault(); setQuery(q.trim()); }}>
            <input placeholder="Search ref or title…" value={q} onChange={(e) => setQ(e.target.value)} />
            <button type="submit">Search</button>
            {query && <button type="button" onClick={() => { setQ(''); setQuery(''); }}>Clear</button>}
          </form>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {loading && <p className="muted">Loading…</p>}

      {!loading && !error && (
        <>
          <table>
            <thead>
              <tr><th>Framework</th><th>Ref</th><th>Title</th><th>Group</th><th>Mapped</th></tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} style={{ cursor: 'default' }}>
                  <td className="muted">{c.framework}{c.isCustom && ' ·custom'}</td>
                  <td>{c.ref}</td>
                  <td>{c.title}</td>
                  <td className="muted">{c.group ?? '—'}</td>
                  <td>{c.mappedCount ?? 0}</td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={5} className="muted">No controls match.</td></tr>}
            </tbody>
          </table>
          <div className="pager">
            <span className="muted">{total === 0 ? 0 : offset + 1}–{to} of {total}</span>
            <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>Previous</button>
            <button disabled={to >= total} onClick={() => setOffset(offset + PAGE)}>Next</button>
          </div>
        </>
      )}
    </div>
  );
}
