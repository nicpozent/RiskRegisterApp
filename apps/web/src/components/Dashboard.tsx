import { useEffect, useState } from 'react';
import { Risks } from '../api.js';
import { navigate } from '../router.js';
import type { Band, RiskSummary } from '../types.js';
import { BANDS } from '../types.js';

const money = (n: number) => `£${Math.round(n).toLocaleString()}`;

function BandBars({ title, data }: { title: string; data: Record<Band, number> }) {
  const max = Math.max(1, ...BANDS.map((b) => data[b]));
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {BANDS.map((b) => (
        <div key={b} className="barrow">
          <span className="barlabel">{b}</span>
          <div className="bartrack">
            <div className={`barfill ${b}`} style={{ width: `${(data[b] / max) * 100}%` }} />
          </div>
          <span className="barval">{data[b]}</span>
        </div>
      ))}
    </div>
  );
}

function CountBars({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, n]) => n));
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {entries.length === 0 && <p className="muted">No data.</p>}
      {entries.map(([k, n]) => (
        <div key={k} className="barrow">
          <span className="barlabel">{k}</span>
          <div className="bartrack"><div className="barfill accent" style={{ width: `${(n / max) * 100}%` }} /></div>
          <span className="barval">{n}</span>
        </div>
      ))}
    </div>
  );
}

/** Register overview: KPIs + band/status/treatment distributions. */
export function Dashboard() {
  const [s, setS] = useState<RiskSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Risks.summary().then(setS).catch((e) => setError(String(e.message ?? e)));
  }, []);

  if (error) return <div className="error">{error}</div>;
  if (!s) return <p className="muted">Loading…</p>;

  const reduction = s.inherentAle > 0 ? 1 - s.residualAle / s.inherentAle : 0;

  return (
    <div>
      <div className="row spread">
        <h2>Dashboard</h2>
        <button className="primary" onClick={() => navigate('/')}>Open register</button>
      </div>

      <div className="grid4">
        <div className="card kpi"><div className="kpi-n">{s.total}</div><div className="muted">Risks</div></div>
        <div className="card kpi"><div className="kpi-n">{money(s.inherentAle)}</div><div className="muted">Inherent ALE / yr</div></div>
        <div className="card kpi"><div className="kpi-n">{money(s.residualAle)}</div><div className="muted">Residual ALE / yr</div></div>
        <div className="card kpi"><div className="kpi-n">{(reduction * 100).toFixed(0)}%</div><div className="muted">ALE reduction</div></div>
      </div>

      <div className="grid2">
        <BandBars title="Inherent risk by band" data={s.byInherentBand} />
        <BandBars title="Residual risk by band" data={s.byResidualBand} />
      </div>
      <div className="grid2">
        <CountBars title="By status" data={s.byStatus} />
        <CountBars title="By treatment" data={s.byTreatment} />
      </div>
    </div>
  );
}
