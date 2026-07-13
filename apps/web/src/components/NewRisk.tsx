import { useState } from 'react';
import { Risks } from '../api.js';
import { navigate } from '../router.js';
import type { RiskInput } from '../types.js';
import { RiskForm } from './RiskForm.js';

/** Create a new risk, then route to its detail page. */
export function NewRisk() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(body: RiskInput) {
    setBusy(true); setError(null);
    try {
      const created = await Risks.create(body);
      navigate(`/risk/${created.id}`);
    } catch (e) {
      setError(String((e as Error).message ?? e));
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="row spread"><h2>New risk</h2></div>
      {error && <div className="error">{error}</div>}
      <RiskForm submitLabel="Create risk" busy={busy} onSubmit={create} onCancel={() => navigate('/')} />
    </div>
  );
}
