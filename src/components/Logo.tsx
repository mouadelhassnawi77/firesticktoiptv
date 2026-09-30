/** Wortmarke mit Testbild-Farbbalken als Bildmarke. */
const bars = ["#e9eef4", "#ffcc00", "#18b6c9", "#2e9e4f", "#c2398f", "#d7263d", "#1f4fb8"];

export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size * 1.25} height={size} viewBox="0 0 35 28" aria-hidden="true" focusable="false">
      <rect x="0.75" y="0.75" width="33.5" height="26.5" rx="3" fill="#13233a" />
      {bars.map((c, i) => (
        <rect key={c} x={4 + i * 3.9} y="4" width="3.9" height="20" fill={c} />
      ))}
    </svg>
  );
}
