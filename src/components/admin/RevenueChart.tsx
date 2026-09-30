import BarDotChart from "./BarDotChart";
import { fmtMoney, fmtMoneyShort } from "./ui";

type Point = { bucket: string; revenue: number; paid: number; orders: number };
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** bucket arrives as "YYYY-MM-DD HH" in the market time zone */
function label(bucket: string, unit: string, long = false) {
  const [date, hour] = bucket.split(" ");
  const [y, m, d] = date.split("-");
  if (unit === "hour") return long ? `${Number(d)} ${MONTHS[Number(m) - 1]}, ${hour}:00` : `${hour}:00`;
  if (unit === "day") return `${Number(d)} ${MONTHS[Number(m) - 1]}`;
  return long ? `${MONTHS[Number(m) - 1]} ${y}` : `${MONTHS[Number(m) - 1]} ${y.slice(2)}`;
}

/** Bars = revenue (paid), dots = orders received. */
export default function RevenueChart({ data, unit }: { data: Point[]; unit: string }) {
  return (
    <BarDotChart
      ariaLabel="Revenue in the selected period"
      barName="Revenue (paid)"
      dotName="Orders received"
      formatBar={(v) => (Number.isInteger(v) ? fmtMoneyShort(v) : fmtMoney(v))}
      data={data.map((d) => ({
        key: d.bucket,
        label: label(d.bucket, unit),
        longLabel: `${label(d.bucket, unit, true)} (${d.paid} paid)`,
        bar: d.revenue,
        dot: d.orders,
      }))}
    />
  );
}
