import s from "./BarChart.module.css";

export type Bar = { label: string; value: number; today?: boolean };

/** Biểu đồ cột SVG — cùng cấu trúc và kích thước (viewBox 640×220) với mockup quản trị. Trục 0 → max. */
export default function BarChart({ bars, max, label }: { bars: Bar[]; max: number; label: string }) {
  const W = 640, H = 220, L = 28, B = 24, T = 18;
  const n = Math.max(1, bars.length), bw = (W - L - 8) / n;
  const top = Math.max(1, max);
  const y = (v: number) => H - B - (v / top) * (H - B - T);
  const ticks = [0, Math.round(top / 2), top];
  return (
    <svg className={s.chart} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <g className={s.grid}>
        {ticks.map(v => (
          <g key={v}>
            <line x1={L} x2={W - 4} y1={y(v)} y2={y(v)} />
            <text x={L - 6} y={y(v) + 4} textAnchor="end">{v}</text>
          </g>
        ))}
      </g>
      {bars.map((b, i) => {
        const x = L + i * bw + 4, w = bw - 8;
        return (
          <g key={i}>
            <rect className={`${s.bar} ${b.today ? s.today : ""}`} x={x} y={y(b.value)} width={w} height={Math.max(0, y(0) - y(b.value))} rx={2} />
            <text className={s.val} x={x + w / 2} y={y(b.value) - 5} textAnchor="middle">{b.value}</text>
            <text x={x + w / 2} y={H - 6} textAnchor="middle">{b.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
