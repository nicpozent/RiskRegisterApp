// Dependency-light inline-SVG charts. Colors come from the app's CSS custom
// properties (via `fill: var(--…)`) so they track the light/dark theme, and
// every bar carries a direct value + category label (the accessible secondary
// encoding for the ordered severity ramp).

export interface BarDatum { label: string; value: number; colorVar?: string; }

const ROW_H = 30;
const BAR_H = 16;
const LABEL_W = 104;
const VALUE_W = 40;
const VIEW_W = 480;

/** Horizontal bar chart with a baseline, a max gridline and end-of-bar values. */
export function HBarChart({ data, ariaLabel }: { data: BarDatum[]; ariaLabel: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const plotW = VIEW_W - LABEL_W - VALUE_W;
  const axisY = data.length * ROW_H + 4;
  const height = axisY + 16;

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${height}`} width="100%" role="img" aria-label={ariaLabel}
         style={{ display: 'block', fontFamily: 'inherit' }}>
      {/* baseline + max gridline */}
      <line x1={LABEL_W} y1={0} x2={LABEL_W} y2={axisY} stroke="var(--border)" strokeWidth="1" />
      <line x1={LABEL_W + plotW} y1={0} x2={LABEL_W + plotW} y2={axisY} stroke="var(--border)" strokeWidth="1" opacity="0.5" />
      {data.map((d, i) => {
        const y = i * ROW_H + (ROW_H - BAR_H) / 2;
        const w = Math.max(d.value > 0 ? 3 : 0, (d.value / max) * plotW);
        return (
          <g key={d.label}>
            <text x={LABEL_W - 10} y={y + BAR_H / 2} textAnchor="end" dominantBaseline="central"
                  fontSize="12.5" fill="var(--muted)">{d.label}</text>
            <rect x={LABEL_W} y={y} width={w} height={BAR_H} rx="4"
                  fill={`var(${d.colorVar ?? '--accent'})`} />
            <text x={LABEL_W + w + 6} y={y + BAR_H / 2} dominantBaseline="central"
                  fontSize="12.5" fontWeight="600" fill="var(--text)"
                  style={{ fontVariantNumeric: 'tabular-nums' }}>{d.value}</text>
          </g>
        );
      })}
      {/* axis ticks: 0 and max */}
      <text x={LABEL_W} y={axisY + 12} textAnchor="middle" fontSize="11" fill="var(--muted)">0</text>
      <text x={LABEL_W + plotW} y={axisY + 12} textAnchor="middle" fontSize="11" fill="var(--muted)">{max}</text>
    </svg>
  );
}
