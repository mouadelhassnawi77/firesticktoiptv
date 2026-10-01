import type { Metadata } from "next";
import Link from "next/link";
import { effectiveSeo, seoPageList } from "@/lib/seo-pages";
import { getSeoSummary } from "@/lib/seo-store";
import { scoreTone, TITLE_RANGE } from "@/lib/seo-analysis";
import { isIndexable, site } from "@/lib/site";
import { analyzeAllAction } from "../../seo-actions";
import { SeoSignal, SeoTabs } from "@/components/admin/seo-ui";
import { SubmitButton } from "@/components/admin/SeoForms";
import { fmtDateTime } from "@/components/admin/ui";

export const metadata: Metadata = { title: "SEO" };

export default async function SeoPage({ searchParams }: { searchParams: Promise<{ analyzed?: string }> }) {
  const { analyzed } = await searchParams;
  const sum = await getSeoSummary();

  const rows = seoPageList.map((page) => {
    const o = sum.overrides.get(page.path) ?? null;
    return { page, seo: effectiveSeo(page, o), score: o?.score ?? null, analyzedAt: o?.analyzed_at ?? null };
  });
  const indexed = rows.filter((r) => r.seo.index);
  const scored = indexed.filter((r) => r.score != null);
  const avg = scored.length ? Math.round(scored.reduce((s, r) => s + (r.score ?? 0), 0) / scored.length) : null;
  const toImprove = scored.filter((r) => scoreTone(r.score) !== "good").length;
  const neverAnalyzed = indexed.length - scored.length;

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>SEO</h1>
          <p className="page-sub">Title, description and focus keyword of every page, scored like Rank Math.</p>
        </div>
        <form action={analyzeAllAction}>
          <SubmitButton className="btn btn-primary" pending="Analyzing pages…">
            Analyze all pages
          </SubmitButton>
        </form>
      </div>

      {analyzed && (
        <p className="notice is-ok" role="status">
          All pages analyzed. Scores below are fresh.
        </p>
      )}
      {!isIndexable && (
        <p className="notice">
          This is a preview deployment, so every page is set to noindex here. Google only sees the production site.
        </p>
      )}

      <dl className="kpis">
        <div className="kpi is-main">
          <dt>Average SEO score</dt>
          <dd className="kpi-signal">
            <SeoSignal score={avg} size="lg" />
          </dd>
          <p className="kpi-note">
            {scored.length} of {indexed.length} indexed pages analyzed
          </p>
        </div>
        <div className="kpi">
          <dt>Pages to improve</dt>
          <dd>{toImprove}</dd>
          <p className="kpi-note">{neverAnalyzed ? `${neverAnalyzed} not analyzed yet` : "Score 80 or lower"}</p>
        </div>
        <div className="kpi">
          <dt>404 errors</dt>
          <dd>{sum.notFound7d}</dd>
          <p className="kpi-note">
            <Link href="/admin/seo/404">Broken URLs in the last 7 days</Link>
          </p>
        </div>
        <div className="kpi">
          <dt>Redirects</dt>
          <dd>{sum.redirects}</dd>
          <p className="kpi-note">{sum.redirectHits.toLocaleString("en-US")} visitors redirected</p>
        </div>
      </dl>

      <SeoTabs active="pages" notFound={sum.notFound7d} />

      <div className="table-scroll">
        <table className="orders seo-table">
          <thead>
            <tr>
              <th scope="col">Page</th>
              <th scope="col">SEO title</th>
              <th scope="col">Focus keyword</th>
              <th scope="col">Score</th>
              <th scope="col">Google</th>
              <th scope="col">
                <span className="visually-hidden">Edit</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ page, seo, score, analyzedAt }) => {
              const long = seo.fullTitle.length > TITLE_RANGE.max;
              return (
                <tr key={page.key} className={seo.index ? undefined : "is-muted"}>
                  <td>
                    <Link href={`/admin/seo/${page.key}`}>{page.label}</Link>
                    <span className="sub">{page.path}</span>
                  </td>
                  <td className="seo-title-cell">
                    {seo.fullTitle}
                    <span className={`sub${long ? " is-warn" : ""}`}>
                      {seo.fullTitle.length} characters{long ? ", gets cut off" : ""}
                      {seo.customized ? ", edited here" : ""}
                    </span>
                  </td>
                  <td>{seo.keyword ? <span className="chip">{seo.keyword}</span> : <span className="sub">Not set</span>}</td>
                  <td>
                    {seo.index ? (
                      <>
                        <SeoSignal score={score} />
                        <span className="sub">{analyzedAt ? fmtDateTime(analyzedAt) : "Not analyzed"}</span>
                      </>
                    ) : (
                      <span className="sub">Not needed</span>
                    )}
                  </td>
                  <td>
                    {seo.index ? (
                      <span className="badge badge-aktiviert">Indexed</span>
                    ) : (
                      <span className="badge badge-abgelaufen">Noindex</span>
                    )}
                  </td>
                  <td className="num">
                    <Link href={`/admin/seo/${page.key}`} className="btn btn-ghost btn-sm">
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <section className="panel seo-engines" aria-labelledby="engines-title">
        <div className="panel-head">
          <h2 id="engines-title">Search engines</h2>
        </div>
        <ul className="simple-list">
          <li>
            <span>
              Sitemap
              <span className="sub">{indexed.length} indexed pages. Noindex pages are left out automatically.</span>
            </span>
            <a href="/sitemap.xml" target="_blank" rel="noopener">
              /sitemap.xml ↗
            </a>
          </li>
          <li>
            <span>
              robots.txt
              <span className="sub">Blocks /admin, /api and /checkout. Points crawlers to the sitemap.</span>
            </span>
            <a href="/robots.txt" target="_blank" rel="noopener">
              /robots.txt ↗
            </a>
          </li>
          <li>
            <span>
              Google Search Console
              <span className="sub">Submit {site.url.replace(/^https?:\/\//, "")}/sitemap.xml once, Google rechecks it on its own.</span>
            </span>
            <a href="https://search.google.com/search-console/sitemaps" target="_blank" rel="noopener noreferrer">
              Open ↗
            </a>
          </li>
        </ul>
      </section>
    </>
  );
}
