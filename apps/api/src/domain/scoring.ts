// Pure risk-scoring domain logic — qualitative 5×5 and quantitative (FAIR ALE).
export type Band = 'Low' | 'Medium' | 'High' | 'Critical';

export function score(likelihood: number, impact: number): number {
  return likelihood * impact;          // 1..25
}
export function band(s: number): Band {
  if (s >= 15) return 'Critical';
  if (s >= 8)  return 'High';
  if (s >= 4)  return 'Medium';
  return 'Low';
}
/** Annualized Loss Expectancy = SLE × ARO. */
export function ale(sle: number, aro: number): number {
  return Math.round(sle * aro);
}
export function reductionPct(inherent: number, residual: number): number {
  if (!inherent) return 0;
  return Math.round((1 - residual / inherent) * 100);
}
