import { useEffect, useState } from 'react';
import { Risks, ConflictError } from '../api.js';
import { navigate } from '../router.js';
import type { RiskInput, RiskView } from '../types.js';
import { RiskForm } from './RiskForm.js';
import { RiskControls } from './RiskControls.js';

const money = (n?: number) => (n == null ? '—' : `£${n.toLocaleString()}`);

/** View a single risk; edit it with optimistic concurrency (If-Match on version). */
export function RiskDetail({ id }: { id: string }) {
  const [risk, setRisk] = useState<RiskView | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function load() {
    setError(null);
    Risks.get(id).then(setRisk).catch((e) => setError(String(e.message ?? e)));
  }
  useEffect(load, [id]);

  async function save(body: RiskInput) {
    if (!risk) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      const updated = await Risks.update(id, body, risk.version);
      setRisk(updated);
      setEditing(false);
      setNotice('Saved.');
    } catch (e) {
      if (e instanceof ConflictError) {
        setError(e.message);
        load(); // pull the winning version so the next save can succeed
      } else {
        setError(String((e as Error).message ?? e));
      }
    } finally {
      setBusy(false);
    }
  }

  async function accept() {
    setBusy(true); setError(null); setNotice(null);
    try {
      setRisk(await Risks.accept(id));
      setNotice('Residual risk accepted.');
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  }

  if (error && !risk) return <div className="error">{error}</div>;
  if (!risk) return <p className="muted">Loading…</p>;

  if (editing) {
    return (
      <div>
        <div className="row spread"><h2>Edit {risk.ref}</h2></div>
        {error && <div className="error">{error}</div>}
        <RiskForm
          initial={risk}
          showStatus
          submitLabel="Save changes"
          busy={busy}
          onSubmit={save}
          onCancel={() => { setEditing(false); setError(null); }}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="row spread">
        <h2>{risk.ref} — {risk.title}</h2>
        <div className="row">
          <button onClick={() => setEditing(true)}>Edit</button>
          {risk.status !== 'accepted' && <button onClick={accept} disabled={busy}>Accept residual</button>}
          <button onClick={() => navigate('/')}>Back</button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {notice && <div className="notice">{notice}</div>}

      <div className="card">
        <dl className="dl">
          <dt>Description</dt><dd>{risk.description ?? '—'}</dd>
          <dt>Category</dt><dd>{risk.category ?? '—'}</dd>
          <dt>Status</dt><dd>{risk.status}</dd>
          <dt>Treatment</dt><dd>{risk.treatment}</dd>
          <dt>Inherent</dt><dd><span className={`badge ${risk.inherentBand}`}>{risk.inherentBand}</span> (score {risk.inherentScore})</dd>
          <dt>Residual</dt><dd><span className={`badge ${risk.residualBand}`}>{risk.residualBand}</span> (score {risk.residualScore})</dd>
          <dt>Inherent ALE</dt><dd>{money(risk.inherentAle)}</dd>
          <dt>Residual ALE</dt><dd>{money(risk.residualAle)}</dd>
          <dt>Risk reduction</dt><dd>{(risk.reduction * 100).toFixed(0)}%</dd>
          <dt>Next review</dt><dd>{risk.nextReview?.slice(0, 10) ?? '—'}</dd>
          <dt>Version</dt><dd className="muted">{risk.version}</dd>
        </dl>
      </div>

      <RiskControls riskId={risk.id} />
    </div>
  );
}
