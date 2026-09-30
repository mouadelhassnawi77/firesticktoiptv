import { fmtMoney, fmtNum } from "./ui";

/** Horizontal bar list for breakdowns (package, device, payment method) */
export default function BarList({
  items,
  label,
  showRevenue = true,
  unit = ["order", "orders"],
  showShare = false,
  empty,
}: {
  items: { key: string; count: number; revenue?: number }[];
  label: (key: string) => string;
  showRevenue?: boolean;
  unit?: [string, string];
  /** also show the share of the total in % (e.g. devices) */
  showShare?: boolean;
  empty: string;
}) {
  if (items.length === 0) return <p className="empty">{empty}</p>;
  const max = Math.max(...items.map((i) => (showRevenue ? (i.revenue ?? 0) : i.count)), 1);
  const total = items.reduce((s, i) => s + i.count, 0) || 1;
  return (
    <ul className="bar-list">
      {items.map((i) => {
        const v = showRevenue ? (i.revenue ?? 0) : i.count;
        return (
          <li key={i.key}>
            <div className="bar-row">
              <span>{label(i.key)}</span>
              <span className="tabular">
                {showRevenue
                  ? `${fmtMoney(i.revenue ?? 0)} (${i.count})`
                  : `${fmtNum(i.count)} ${i.count === 1 ? unit[0] : unit[1]}${showShare ? `, ${fmtNum((i.count / total) * 100)}%` : ""}`}
              </span>
            </div>
            <span className="bar-track">
              <span className="bar-fill" style={{ width: `${Math.max(3, (v / max) * 100)}%` }} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
