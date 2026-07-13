import { useEffect, useState } from 'react';
import { Risks } from '../api.js';
import { navigate } from '../router.js';
import type { Band, RiskSummary } from '../types.js';
import { BANDS } from '../types.js';
import { HBarChart, type BarDatum } from './Charts.js';

const money = (n: number) => `£${Math.round(n).toLocaleString()}`;
const BAND_COLOR: Record<Band, string> = {
  Low: '--low', Medium: '--medium', High: '--high', Critical: '--critical',
};

function BandChart({ title, data }: { title: string; data: Record<Band, number> }) {
  const rows: BarDatum[] = BANDS.map((b) => ({ label: b, value: data[b], colorVar: BAND_COLOR[b] }));
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <HBarChart data={rows} ariaLabel={title} />
    </div>
  );
}

function CountChart({ title, data }: { title: string; data: Record<string, number> }) {
  const rows: BarDatum[] = Object.entries(data)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {rows.length === 0 ? <p className="muted">No data.</p> : <HBarChart data={rows} ariaLabel={title} />}
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
        <BandChart title="Inherent risk by band" data={s.byInherentBand} />
        <BandChart title="Residual risk by band" data={s.byResidualBand} />
      </div>
      <div className="grid2">
        <CountChart title="By status" data={s.byStatus} />
        <CountChart title="By treatment" data={s.byTreatment} />
      </div>
    </div>
  );
}
