// A treatment action is a tracked task that reduces a risk toward its residual
// target (the "treatment plan"). Actions carry an owner, due date and status.
export type ActionStatus = 'open' | 'in_progress' | 'done' | 'cancelled';
export const ACTION_STATUSES: ActionStatus[] = ['open', 'in_progress', 'done', 'cancelled'];

export interface TreatmentAction {
  id: string;
  riskId: string;
  description: string;
  ownerId?: string;
  dueDate?: string;      // ISO date
  status: ActionStatus;
  createdAt: string;
  updatedAt: string;
}
