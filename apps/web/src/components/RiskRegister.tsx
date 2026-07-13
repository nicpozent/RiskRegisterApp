import { useEffect, useState } from 'react';
import { Risks } from '../api.js';
import { navigate } from '../router.js';
import type { RiskView } from '../types.js';

const PAGE = 20;

/** Paginated risk register table — the app's landing view. */
export function RiskRegister() {
  const [items, setItems] = useState<RiskView[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setLoading(true);
    Risks.list(PAGE, offset)
      .then((page) => { if (live) { setItems(page.items); setTotal(page.total); setError(null); } })
      .catch((e) => { if (live) setError(String(e.message ?? e)); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [offset]);

  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE, total);

  return (
    <div>
      <div className="row spread">
        <h2>Risk register</h2>
        <button className="primary" onClick={() => navigate('/new')}>New risk</button>
      </div>

      {error && <div className="error">{error}</div>}
      {loading && <p className="muted">Loading…</p>}

      {!loading && !error && (
        <>
          <table>
            <thead>
              <tr>
                <th>Ref</th><th>Title</th><th>Category</th>
                <th>Inherent</th><th>Residual</th><th>Treatment</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} onClick={() => navigate(`/risk/${r.id}`)}>
                  <td>{r.ref}</td>
                  <td>{r.title}</td>
                  <td className="muted">{r.category ?? '—'}</td>
                  <td><span className={`badge ${r.inherentBand}`}>{r.inherentBand}</span></td>
                  <td><span className={`badge ${r.residualBand}`}>{r.residualBand}</span></td>
                  <td>{r.treatment}</td>
                  <td className="muted">{r.status}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={7} className="muted">No risks yet. Create the first one.</td></tr>
              )}
            </tbody>
          </table>

          <div className="pager">
            <span className="muted">{from}–{to} of {total}</span>
            <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>Previous</button>
            <button disabled={to >= total} onClick={() => setOffset(offset + PAGE)}>Next</button>
          </div>
        </>
      )}
    </div>
  );
}
