import { useEffect, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { Risks } from '../api.js';
import type { ChangeRequest, RiskInput, RiskView } from '../types.js';
import { ELEVATED_ROLES } from '../types.js';
import { RiskForm } from './RiskForm.js';

// Which fields actually changed vs the current risk (for a compact summary).
function changedFields(proposed: Record<string, unknown>, risk: RiskView): string[] {
  return Object.keys(proposed).filter((k) => {
    const cur = (risk as unknown as Record<string, unknown>)[k];
    return JSON.stringify(cur) !== JSON.stringify(proposed[k]) && !['controlIds', 'stakeholderIds'].includes(k);
  });
}

/** Maker-checker panel: propose a change, and (for elevated checkers) approve/reject. */
export function RiskChangeRequests({ risk, onApplied }: { risk: RiskView; onApplied: () => void }) {
  const { accounts } = useMsal();
  const roles = (accounts[0]?.idTokenClaims as { roles?: string[] } | undefined)?.roles ?? [];
  const elevated = roles.some((r) => ELEVATED_ROLES.includes(r));

  const [items, setItems] = useState<ChangeRequest[]>([]);
  const [proposing, setProposing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() { Risks.changeRequests(risk.id).then(setItems).catch((e) => setError(String(e.message ?? e))); }
  useEffect(load, [risk.id]);

  async function propose(body: RiskInput) {
    setBusy(true); setError(null);
    try { await Risks.submitChange(risk.id, body); setProposing(false); load(); }
    catch (e) { setError(String((e as Error).message ?? e)); }
    finally { setBusy(false); }
  }

  async function decide(cr: ChangeRequest, action: 'approve' | 'reject') {
    setError(null);
    try {
      if (action === 'approve') { await Risks.approveChange(risk.id, cr.id); onApplied(); }
      else { await Risks.rejectChange(risk.id, cr.id, window.prompt('Reason for rejection (optional):') ?? undefined); }
      load();
    } catch (e) { setError(String((e as Error).message ?? e)); }
  }

  const pending = items.filter((c) => c.status === 'pending').length;

  return (
    <div className="card">
      <div className="row spread">
        <h3 style={{ margin: 0 }}>Change approvals ({pending} pending)</h3>
        <button onClick={() => setProposing((p) => !p)}>{proposing ? 'Cancel' : 'Propose change'}</button>
      </div>

      {error && <div className="error">{error}</div>}

      {proposing && (
        <div style={{ marginTop: 12 }}>
          <p className="muted">Your proposed edit is submitted for approval — it takes effect only when a different Admin/CISO approves it.</p>
          <RiskForm initial={risk} showStatus submitLabel="Submit for approval" busy={busy}
                    onSubmit={propose} onCancel={() => setProposing(false)} />
        </div>
      )}

      <table style={{ marginTop: 12 }}>
        <thead><tr><th>Proposed</th><th>Status</th><th>Submitted</th><th /></tr></thead>
        <tbody>
          {items.map((cr) => (
            <tr key={cr.id} style={{ cursor: 'default' }}>
              <td>{changedFields(cr.proposed, risk).join(', ') || '—'}</td>
              <td><span className={`crstatus ${cr.status}`}>{cr.status}</span></td>
              <td className="muted">{cr.createdAt.slice(0, 10)}</td>
              <td>
                {cr.status === 'pending' && elevated && (
                  <span className="row">
                    <button className="primary" onClick={() => decide(cr, 'approve')}>Approve</button>
                    <button className="danger" onClick={() => decide(cr, 'reject')}>Reject</button>
                  </span>
                )}
              </td>
            </tr>
          ))}
          {items.length === 0 && <tr><td colSpan={4} className="muted">No change requests.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
