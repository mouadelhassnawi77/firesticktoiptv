/**
 * Generic chart: bars = main metric (with value axis), dots = second metric (own scale).
 * Plain SVG rendered on the server; hover a column for the exact numbers.
 */
export type ChartPoint = { key: string; label: string; longLabel: string; bar: number; dot: number };

function niceMax(v: number) {
  if (v <= 0) return 10;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

export default function BarDotChart({
  data,
  barName,
  dotName,
  formatBar,
  formatDot = (v) => v.toLocaleString("en-GB"),
  ariaLabel,
}: {
  data: ChartPoint[];
  barName: string;
  dotName: string;
  formatBar: (v: number) => string;
  formatDot?: (v: number) => string;
  ariaLabel: string;
}) {
  const W = 960;
  const H = 280;
  const pad = { l: 64, r: 16, t: 16, b: 36 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const max = niceMax(Math.max(...data.map((d) => d.bar)));
  const maxDot = Math.max(1, ...data.map((d) => d.dot));
  const slot = innerW / Math.max(1, data.length);
  const barW = Math.max(2, Math.min(34, slot * 0.64));
  const every = Math.ceil(data.length / 12); // at most ~12 axis labels
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="chart-scroll">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label={ariaLabel}>
        {ticks.map((t) => {
          const y = pad.t + innerH - t * innerH;
          return (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} className="chart-grid" />
              <text x={pad.l - 8} y={y + 4} textAnchor="end" className="chart-axis">
                {formatBar(max * t)}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const x = pad.l + i * slot + (slot - barW) / 2;
          const h = (d.bar / max) * innerH;
          const oy = pad.t + innerH - (d.dot / maxDot) * innerH * 0.9;
          return (
            <g key={d.key}>
              <title>{`${d.longLabel}: ${formatBar(d.bar)} ${barName.toLowerCase()}, ${formatDot(d.dot)} ${dotName.toLowerCase()}`}</title>
              <rect x={pad.l + i * slot} y={pad.t} width={slot} height={innerH} className="chart-hit" />
              <rect x={x} y={pad.t + innerH - h} width={barW} height={Math.max(h, d.bar > 0 ? 2 : 0)} rx="2" className="chart-bar" />
              {d.dot > 0 && <circle cx={x + barW / 2} cy={oy} r="3.5" className="chart-dot" />}
              {i % every === 0 && (
                <text x={pad.l + i * slot + slot / 2} y={H - 12} textAnchor="middle" className="chart-axis">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p className="chart-legend">
        <span className="lg-bar" /> {barName} <span className="lg-dot" /> {dotName}
      </p>
    </div>
  );
}
