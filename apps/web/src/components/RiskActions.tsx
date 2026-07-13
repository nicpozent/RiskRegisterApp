import { useEffect, useState } from 'react';
import { Risks } from '../api.js';
import type { ActionStatus, TreatmentAction } from '../types.js';
import { ACTION_STATUSES } from '../types.js';

/** Treatment-plan panel: list, add and progress the actions that reduce a risk. */
export function RiskActions({ riskId }: { riskId: string }) {
  const [actions, setActions] = useState<TreatmentAction[]>([]);
  const [desc, setDesc] = useState('');
  const [due, setDue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() { Risks.actions(riskId).then(setActions).catch((e) => setError(String(e.message ?? e))); }
  useEffect(load, [riskId]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (desc.trim().length < 3) return;
    setBusy(true); setError(null);
    try {
      await Risks.addAction(riskId, { description: desc.trim(), dueDate: due || undefined });
      setDesc(''); setDue(''); load();
    } catch (err) { setError(String((err as Error).message ?? err)); }
    finally { setBusy(false); }
  }

  async function setStatus(actionId: string, status: ActionStatus) {
    setError(null);
    try {
      const updated = await Risks.updateAction(riskId, actionId, { status });
      setActions((prev) => prev.map((a) => (a.id === actionId ? updated : a)));
    } catch (err) { setError(String((err as Error).message ?? err)); }
  }

  const open = actions.filter((a) => a.status !== 'done' && a.status !== 'cancelled').length;

  return (
    <div className="card">
      <div className="row spread">
        <h3 style={{ margin: 0 }}>Treatment plan ({open} open)</h3>
      </div>

      {error && <div className="error">{error}</div>}

      <table>
        <thead><tr><th>Action</th><th>Due</th><th>Status</th></tr></thead>
        <tbody>
          {actions.map((a) => (
            <tr key={a.id} style={{ cursor: 'default' }}>
              <td>{a.description}</td>
              <td className="muted">{a.dueDate?.slice(0, 10) ?? '—'}</td>
              <td>
                <select value={a.status} onChange={(e) => setStatus(a.id, e.target.value as ActionStatus)}>
                  {ACTION_STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </td>
            </tr>
          ))}
          {actions.length === 0 && <tr><td colSpan={3} className="muted">No treatment actions yet.</td></tr>}
        </tbody>
      </table>

      <form className="row" style={{ marginTop: 12 }} onSubmit={add}>
        <input placeholder="New action…" value={desc} onChange={(e) => setDesc(e.target.value)} minLength={3} />
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} style={{ maxWidth: 170 }} />
        <button type="submit" className="primary" disabled={busy}>Add</button>
      </form>
    </div>
  );
}
