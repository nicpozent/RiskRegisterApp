import { useState } from 'react';
import { Reports as ReportsApi } from '../api.js';
import { downloadBlob } from '../download.js';

/** Reporting & evidence export. */
export function Reports() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportCsv() {
    setBusy(true); setError(null);
    try {
      downloadBlob(await ReportsApi.registerCsv(), 'risk-register.csv');
    } catch (e) { setError(String((e as Error).message ?? e)); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <div className="row spread"><h2>Reports</h2></div>
      {error && <div className="error">{error}</div>}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Risk register export</h3>
        <p className="muted">
          Download the full register as CSV — ref, title, category, status, treatment,
          inherent/residual scores &amp; bands, ALE figures and risk reduction.
        </p>
        <button className="primary" onClick={exportCsv} disabled={busy}>
          {busy ? 'Preparing…' : 'Download register (CSV)'}
        </button>
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Evidence packs</h3>
        <p className="muted">
          A per-risk evidence pack (risk detail + mapped controls + treatment actions) can be
          exported as JSON from each risk's detail page.
        </p>
      </div>
    </div>
  );
}
