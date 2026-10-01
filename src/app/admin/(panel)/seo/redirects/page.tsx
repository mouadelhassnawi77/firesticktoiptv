import type { Metadata } from "next";
import { getSeoSummary, listRedirects, normalizePath } from "@/lib/seo-store";
import { deleteRedirectAction } from "../../../seo-actions";
import { SeoTabs } from "@/components/admin/seo-ui";
import { RedirectForm, SubmitButton } from "@/components/admin/SeoForms";
import { fmtDateTime } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Redirects" };

export default async function RedirectsPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  const [rows, sum] = await Promise.all([listRedirects(), getSeoSummary()]);
  const sources = new Set(rows.map((r) => r.source));

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Redirects</h1>
          <p className="page-sub">Send visitors and Google from an old or mistyped URL to a page that exists.</p>
        </div>
      </div>

      <SeoTabs active="redirects" notFound={sum.notFound7d} />

      <RedirectForm from={from ? normalizePath(from) : undefined} />

      {rows.length === 0 ? (
        <div className="panel">
          <p className="empty">
            No redirects yet. When the 404 monitor shows a URL people still visit, redirect it to the closest page.
          </p>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="orders">
            <thead>
              <tr>
                <th scope="col">Old URL</th>
                <th scope="col">Goes to</th>
                <th scope="col">Type</th>
                <th scope="col" className="num">
                  Visitors
                </th>
                <th scope="col">Last used</th>
                <th scope="col">
                  <span className="visually-hidden">Delete</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const chain = !/^https?:/i.test(r.destination) && sources.has(normalizePath(r.destination));
                return (
                  <tr key={r.id}>
                    <td>
                      <code className="path">{r.source}</code>
                      <span className="sub">Added {fmtDateTime(r.created_at)}</span>
                    </td>
                    <td>
                      <a href={r.destination} target="_blank" rel="noopener" className="path-link">
                        {r.destination}
                      </a>
                      {chain && <span className="sub is-warn">Redirects again. Point it straight to the final page.</span>}
                    </td>
                    <td>{r.permanent ? "Permanent" : "Temporary"}</td>
                    <td className="num">{r.hits.toLocaleString("en-US")}</td>
                    <td>{r.last_hit ? fmtDateTime(r.last_hit) : "Never"}</td>
                    <td className="num">
                      <form action={deleteRedirectAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <SubmitButton
                          className="btn btn-ghost btn-sm btn-danger"
                          pending="Deleting…"
                          confirm={`Delete the redirect from ${r.source}?`}
                        >
                          Delete
                        </SubmitButton>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="seo-help seo-foot">
        Redirects only work for URLs that don’t exist on the site. A live page always wins, so remove the page first if you
        want to redirect it.
      </p>
    </>
  );
}
