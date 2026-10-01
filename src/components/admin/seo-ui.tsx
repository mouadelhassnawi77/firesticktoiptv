import Link from "next/link";
import { scoreTone } from "@/lib/seo-analysis";

const TONE_LABEL = { good: "Good", ok: "Needs work", bad: "Poor", none: "Not analyzed" } as const;

/**
 * The SEO score as a TV signal meter: five bars, like reception strength on a set-top box.
 * 0–20 one bar … 81–100 five bars. Color follows Rank Math: green 81+, orange 51–80, red 50 and below.
 */
export function SeoSignal({ score, size = "sm", label = true }: { score: number | null; size?: "sm" | "lg"; label?: boolean }) {
  const tone = scoreTone(score);
  const bars = score == null ? 0 : Math.max(1, Math.ceil(score / 20));
  const text = score == null ? TONE_LABEL.none : `${score}/100, ${TONE_LABEL[tone].toLowerCase()}`;
  return (
    <span className={`signal is-${tone} is-${size}`} role="img" aria-label={`SEO score ${text}`} title={`SEO score ${text}`}>
      <span className="signal-bars" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((b) => (
          <i key={b} className={b <= bars ? "on" : undefined} />
        ))}
      </span>
      {label && (
        <span className="signal-num tabular" aria-hidden="true">
          {score ?? "–"}
        </span>
      )}
    </span>
  );
}

export const scoreToneLabel = (score: number | null) => TONE_LABEL[scoreTone(score)];

export function SeoTabs({ active, notFound }: { active: "pages" | "redirects" | "404"; notFound?: number }) {
  const tabs = [
    { id: "pages", href: "/admin/seo", label: "Pages" },
    { id: "redirects", href: "/admin/seo/redirects", label: "Redirects" },
    { id: "404", href: "/admin/seo/404", label: "404 monitor" },
  ] as const;
  return (
    <nav className="tabs" aria-label="SEO sections">
      {tabs.map((t) => (
        <Link key={t.id} href={t.href} aria-current={t.id === active ? "page" : undefined}>
          {t.label}
          {t.id === "404" && notFound ? <span className="count">{notFound}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
