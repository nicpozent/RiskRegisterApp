import { score, band, ale, reductionPct, Band } from './scoring.js';

export type RiskStatus = 'open'|'assessed'|'treating'|'monitored'|'accepted'|'closed';
export type Treatment  = 'Mitigate'|'Transfer'|'Avoid'|'Accept';

export interface Risk {
  id: string; ref: string; title: string; description?: string; category?: string;
  ownerId?: string; stakeholderIds: string[]; controlIds: string[];
  inherentL: number; inherentI: number; residualL: number; residualI: number;
  treatment: Treatment; status: RiskStatus;
  sle?: number; aro?: number; residualAro?: number; nextReview?: string;
  version: number;   // optimistic-concurrency token, bumped on each update
}

export interface RiskView extends Risk {
  inherentScore: number; inherentBand: Band;
  residualScore: number; residualBand: Band;
  inherentAle?: number; residualAle?: number; reduction: number;
}

export function toView(r: Risk): RiskView {
  const inherentScore = score(r.inherentL, r.inherentI);
  const residualScore = score(r.residualL, r.residualI);
  return {
    ...r,
    inherentScore, inherentBand: band(inherentScore),
    residualScore, residualBand: band(residualScore),
    // Treat 0 as a valid figure (e.g. ARO 0 ⇒ ALE 0); only missing data is undefined.
    inherentAle: r.sle != null && r.aro != null ? ale(r.sle, r.aro) : undefined,
    residualAle: r.sle != null && r.residualAro != null ? ale(r.sle, r.residualAro) : undefined,
    reduction: reductionPct(inherentScore, residualScore),
  };
}
