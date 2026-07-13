// A change request is the maker-checker unit: a proposed patch to a risk that
// only takes effect when a DIFFERENT elevated user approves it.
export type ChangeRequestStatus = 'pending' | 'approved' | 'rejected';

export interface ChangeRequest {
  id: string;
  riskId: string;
  proposed: Record<string, unknown>;
  status: ChangeRequestStatus;
  submitterOid: string;
  reviewerOid?: string;
  reviewNote?: string;
  createdAt: string;
  decidedAt?: string;
}
