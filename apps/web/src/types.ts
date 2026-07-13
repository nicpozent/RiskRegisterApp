// Shapes returned by the API (mirrors apps/api domain/risk.ts RiskView).
export type Band = 'Low' | 'Medium' | 'High' | 'Critical';
export type Treatment = 'Mitigate' | 'Transfer' | 'Avoid' | 'Accept';
export type RiskStatus = 'open' | 'assessed' | 'treating' | 'monitored' | 'accepted' | 'closed';

export interface RiskView {
  id: string; ref: string; title: string; description?: string; category?: string;
  ownerId?: string; stakeholderIds: string[]; controlIds: string[];
  inherentL: number; inherentI: number; residualL: number; residualI: number;
  treatment: Treatment; status: RiskStatus;
  sle?: number; aro?: number; residualAro?: number; nextReview?: string;
  version: number;
  inherentScore: number; inherentBand: Band;
  residualScore: number; residualBand: Band;
  inherentAle?: number; residualAle?: number; reduction: number;
}

// Fields a user can edit (subset of RiskView), used by the create/edit form.
export interface RiskInput {
  title: string; description?: string; category?: string;
  inherentL: number; inherentI: number; residualL: number; residualI: number;
  treatment: Treatment; status?: Exclude<RiskStatus, 'accepted'>;
  sle?: number; aro?: number; residualAro?: number; nextReview?: string;
}

// Register-wide aggregates for the dashboard (mirrors API RiskSummary).
export interface RiskSummary {
  total: number;
  inherentAle: number;
  residualAle: number;
  byInherentBand: Record<Band, number>;
  byResidualBand: Record<Band, number>;
  byStatus: Record<string, number>;
  byTreatment: Record<string, number>;
}

export const BANDS: Band[] = ['Low', 'Medium', 'High', 'Critical'];
export const TREATMENTS: Treatment[] = ['Mitigate', 'Transfer', 'Avoid', 'Accept'];
export const PATCH_STATUSES: Exclude<RiskStatus, 'accepted'>[] =
  ['open', 'assessed', 'treating', 'monitored', 'closed'];
