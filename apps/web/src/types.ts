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

// Control catalogue (mirrors API control routes).
export interface FrameworkView {
  id: string; short: string; name: string; authority: string;
  kind: string; region: string; description: string; count: number; mapped: number;
}
export interface ControlView {
  id: string; framework: string; ref: string; title: string;
  group?: string; help?: string; isCustom: boolean; mappedCount?: number;
}

// Treatment actions (mirrors API domain/treatment.ts).
export type ActionStatus = 'open' | 'in_progress' | 'done' | 'cancelled';
export const ACTION_STATUSES: ActionStatus[] = ['open', 'in_progress', 'done', 'cancelled'];
export interface TreatmentAction {
  id: string; riskId: string; description: string; ownerId?: string;
  dueDate?: string; status: ActionStatus; createdAt: string; updatedAt: string;
}

// Admin / governance views.
export interface AuditEvent {
  id: number; actorOid: string; action: string; entity: string;
  entityId?: string; before?: unknown; after?: unknown; at: string;
}
export interface DirectoryUser {
  id: string; entraOid: string; displayName: string; email: string; createdAt: string;
}
export const ADMIN_ROLES = ['Administrator', 'CISO.RiskManager', 'Auditor'];

// Evidence attachments (mirrors API evidence routes).
export interface EvidenceMeta {
  id: string; filename: string; contentType: string; sizeBytes: number;
  uploadedBy?: string; createdAt: string;
}
export const EVIDENCE_CONTENT_TYPES = [
  'application/pdf', 'image/png', 'image/jpeg', 'text/csv', 'text/plain',
  'application/msword', 'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
export const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;

// Maker-checker change requests (mirrors API change-request routes).
export type ChangeRequestStatus = 'pending' | 'approved' | 'rejected';
export interface ChangeRequest {
  id: string; riskId: string; proposed: Partial<RiskInput> & Record<string, unknown>;
  status: ChangeRequestStatus; submitterOid: string; reviewerOid?: string;
  reviewNote?: string; createdAt: string; decidedAt?: string;
}
export const ELEVATED_ROLES = ['Administrator', 'CISO.RiskManager'];

// In-app notification feed (mirrors API /notifications).
export interface UserNotification {
  id: string; type: string; riskId?: string; riskRef?: string;
  summary?: string; readAt?: string; createdAt: string;
}

// Personnel module (mirrors API /personnel). SWOT + development plans are
// sensitive PII, encrypted at rest server-side; the SPA only ever sees plaintext.
export interface Team { id: string; name: string; managerId: string | null; createdAt: string; }
export interface TeamMember { userId: string; displayName: string; }
export interface Swot { strengths: string; weaknesses: string; opportunities: string; threats: string; }
export interface DevelopmentPlan { userId: string; content: string; updatedAt: string | null; }
// Whether the (DPIA-gated) personnel module is surfaced in the SPA.
export const PERSONNEL_ENABLED =
  (import.meta.env.VITE_PERSONNEL_MODULE_ENABLED ?? 'false') === 'true';

export const BANDS: Band[] = ['Low', 'Medium', 'High', 'Critical'];
export const TREATMENTS: Treatment[] = ['Mitigate', 'Transfer', 'Avoid', 'Accept'];
export const PATCH_STATUSES: Exclude<RiskStatus, 'accepted'>[] =
  ['open', 'assessed', 'treating', 'monitored', 'closed'];
