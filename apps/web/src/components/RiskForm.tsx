import { useState } from 'react';
import type { RiskInput, RiskStatus } from '../types.js';
import { TREATMENTS, PATCH_STATUSES } from '../types.js';

type EditableStatus = Exclude<RiskStatus, 'accepted'>;

export interface RiskFormProps {
  // Accepts a RiskView too: its status may be 'accepted', which the form maps to a safe editable default.
  initial?: Partial<Omit<RiskInput, 'status'>> & { status?: RiskStatus };
  /** When true, the status selector is shown (edit); create defaults to 'open'. */
  showStatus?: boolean;
  submitLabel: string;
  busy?: boolean;
  onSubmit: (body: RiskInput) => void;
  onCancel: () => void;
}

const num = (v: string): number | undefined => (v === '' ? undefined : Number(v));

/** Shared create/edit form. Mirrors the API Zod schema's editable fields. */
export function RiskForm({ initial = {}, showStatus, submitLabel, busy, onSubmit, onCancel }: RiskFormProps) {
  const [title, setTitle] = useState(initial.title ?? '');
  const [description, setDescription] = useState(initial.description ?? '');
  const [category, setCategory] = useState(initial.category ?? '');
  const [inherentL, setInherentL] = useState(String(initial.inherentL ?? 3));
  const [inherentI, setInherentI] = useState(String(initial.inherentI ?? 3));
  const [residualL, setResidualL] = useState(String(initial.residualL ?? 2));
  const [residualI, setResidualI] = useState(String(initial.residualI ?? 2));
  const [treatment, setTreatment] = useState(initial.treatment ?? 'Mitigate');
  // 'accepted' isn't a user-selectable status; fall back to 'monitored' when editing an accepted risk.
  const [status, setStatus] = useState<EditableStatus>(
    initial.status && initial.status !== 'accepted' ? initial.status : 'open');
  const [sle, setSle] = useState(initial.sle != null ? String(initial.sle) : '');
  const [aro, setAro] = useState(initial.aro != null ? String(initial.aro) : '');
  const [residualAro, setResidualAro] = useState(initial.residualAro != null ? String(initial.residualAro) : '');
  const [nextReview, setNextReview] = useState(initial.nextReview?.slice(0, 10) ?? '');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body: RiskInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      inherentL: Number(inherentL), inherentI: Number(inherentI),
      residualL: Number(residualL), residualI: Number(residualI),
      treatment,
      ...(showStatus ? { status } : {}),
      sle: num(sle), aro: num(aro), residualAro: num(residualAro),
      nextReview: nextReview || undefined,
    };
    onSubmit(body);
  }

  const scale = [1, 2, 3, 4, 5];

  return (
    <form className="card" onSubmit={submit}>
      <div className="field">
        <label>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={200} />
      </div>
      <div className="field">
        <label>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={4000} />
      </div>
      <div className="grid2">
        <div className="field">
          <label>Category</label>
          <input value={category} onChange={(e) => setCategory(e.target.value)} maxLength={80} />
        </div>
        <div className="field">
          <label>Treatment</label>
          <select value={treatment} onChange={(e) => setTreatment(e.target.value as RiskInput['treatment'])}>
            {TREATMENTS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="grid4">
        <div className="field">
          <label>Inherent likelihood</label>
          <select value={inherentL} onChange={(e) => setInherentL(e.target.value)}>{scale.map((n) => <option key={n}>{n}</option>)}</select>
        </div>
        <div className="field">
          <label>Inherent impact</label>
          <select value={inherentI} onChange={(e) => setInherentI(e.target.value)}>{scale.map((n) => <option key={n}>{n}</option>)}</select>
        </div>
        <div className="field">
          <label>Residual likelihood</label>
          <select value={residualL} onChange={(e) => setResidualL(e.target.value)}>{scale.map((n) => <option key={n}>{n}</option>)}</select>
        </div>
        <div className="field">
          <label>Residual impact</label>
          <select value={residualI} onChange={(e) => setResidualI(e.target.value)}>{scale.map((n) => <option key={n}>{n}</option>)}</select>
        </div>
      </div>

      <div className="grid4">
        <div className="field">
          <label>SLE (single loss, £)</label>
          <input type="number" min={0} value={sle} onChange={(e) => setSle(e.target.value)} />
        </div>
        <div className="field">
          <label>ARO (inherent /yr)</label>
          <input type="number" min={0} step="0.01" value={aro} onChange={(e) => setAro(e.target.value)} />
        </div>
        <div className="field">
          <label>ARO (residual /yr)</label>
          <input type="number" min={0} step="0.01" value={residualAro} onChange={(e) => setResidualAro(e.target.value)} />
        </div>
        <div className="field">
          <label>Next review</label>
          <input type="date" value={nextReview} onChange={(e) => setNextReview(e.target.value)} />
        </div>
      </div>

      {showStatus && (
        <div className="field">
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as EditableStatus)}>
            {PATCH_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      <div className="row">
        <button type="submit" className="primary" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button>
        <button type="button" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </form>
  );
}
