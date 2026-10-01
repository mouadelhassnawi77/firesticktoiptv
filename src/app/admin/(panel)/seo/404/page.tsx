import type { Metadata } from "next";
import Link from "next/link";
import { getSeoSummary, list404, PROBE } from "@/lib/seo-store";
import { site } from "@/lib/site";
import { clear404Action, delete404Action } from "../../../seo-actions";
import { SeoTabs } from "@/components/admin/seo-ui";
import { SubmitButton } from "@/components/admin/SeoForms";
import { fmtDateTime } from "@/components/admin/ui";

export const metadata: Metadata = { title: "404 monitor" };

const siteHost = new URL(site.url).hostname.replace(/^www\./, "");

function referrerInfo(ref: string | null) {
  if (!ref) return null;
  try {
    const u = new URL(ref);
    const host = u.hostname.replace(/^www\./, "");
    return { own: host === siteHost, label: host === siteHost ? u.pathname : host };
  } catch {
    return null;
  }
}

export default async function NotFoundPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show } = await searchParams;
  const showProbes = show === "all";
  const [all, sum] = await Promise.all([list404(), getSeoSummary()]);
  const probes = all.filter((r) => PROBE.test(r.path));
  const rows = showProbes ? all : all.filter((r) => !PROBE.test(r.path));
  const broken = rows.filter((r) => referrerInfo(r.referrer)?.own).length;

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>404 monitor</h1>
          <p className="page-sub">URLs people or Google asked for that don’t exist. Redirect the ones that matter.</p>
        </div>
        {all.length > 0 && (
          <div className="head-actions">
            {probes.length > 0 && (
              <form action={clear404Action}>
                <input type="hidden" name="scope" value="probes" />
                <SubmitButton className="btn btn-ghost btn-sm" pending="Clearing…">
                  Clear scanner hits
                </SubmitButton>
              </form>
            )}
            <form action={clear404Action}>
              <input type="hidden" name="scope" value="all" />
              <SubmitButton className="btn btn-ghost btn-sm btn-danger" pending="Clearing…" confirm="Clear the whole 404 list?">
                Clear all
              </SubmitButton>
            </form>
          </div>
        )}
      </div>

      <SeoTabs active="404" notFound={sum.notFound7d} />

      {broken > 0 && (
        <p className="notice">
          <strong>
            {broken} broken link{broken === 1 ? "" : "s"} on your own site.
          </strong>{" "}
          Rows marked “From your site” were clicked on one of your pages. Fix the link there, or add a redirect.
        </p>
      )}

      <nav className="tabs is-period" aria-label="Filter">
        <Link href="/admin/seo/404" aria-current={!showProbes ? "page" : undefined}>
          Real visitors <span className="count">{all.length - probes.length}</span>
        </Link>
        <Link href="/admin/seo/404?show=all" aria-current={showProbes ? "page" : undefined}>
          Including scanners <span className="count">{all.length}</span>
        </Link>
      </nav>

      {rows.length === 0 ? (
        <div className="panel">
          <p className="empty">
            {all.length
              ? `Only scanner hits (${probes.length} bots looking for WordPress or PHP files). Nothing to fix.`
              : "No broken URLs yet. Every URL that doesn’t exist gets logged here automatically."}
          </p>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="orders">
            <thead>
              <tr>
                <th scope="col">URL</th>
                <th scope="col" className="num">
                  Hits
                </th>
                <th scope="col">Last seen</th>
                <th scope="col">Came from</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const ref = referrerInfo(r.referrer);
                const probe = PROBE.test(r.path);
                return (
                  <tr key={r.path} className={probe ? "is-muted" : undefined}>
                    <td>
                      <code className="path">{r.path}</code>
                      <span className="sub">
                        {probe ? "Scanner (bot)" : `First seen ${fmtDateTime(r.first_seen)}`}
                      </span>
                    </td>
                    <td className="num">{r.hits.toLocaleString("en-US")}</td>
                    <td>{fmtDateTime(r.last_seen)}</td>
                    <td>
                      {ref ? (
                        ref.own ? (
                          <span className="badge badge-neu" title={r.referrer ?? undefined}>
                            From your site: {ref.label}
                          </span>
                        ) : (
                          <span title={r.referrer ?? undefined}>{ref.label}</span>
                        )
                      ) : (
                        <span className="sub">Direct or unknown</span>
                      )}
                    </td>
                    <td className="num">
                      <div className="row-actions">
                        {!probe && (
                          <Link href={`/admin/seo/redirects?from=${encodeURIComponent(r.path)}`} className="btn btn-primary btn-sm">
                            Redirect
                          </Link>
                        )}
                        <form action={delete404Action}>
                          <input type="hidden" name="path" value={r.path} />
                          <SubmitButton className="btn btn-ghost btn-sm" pending="…">
                            Dismiss
                          </SubmitButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
