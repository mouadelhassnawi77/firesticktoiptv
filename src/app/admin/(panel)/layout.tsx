import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "../actions";
import { adminUsername, getSession, getTotpSecret } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { getStatusCounts } from "@/lib/orders";
import { site } from "@/lib/site";
import { LogoMark } from "@/components/Logo";
import SideNav from "@/components/admin/SideNav";

// Every admin page is rendered fresh per request and never cached
export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const [counts, twoFa] = await Promise.all([dbConfigured ? getStatusCounts() : null, getTotpSecret()]);
  const pending = counts?.counts.neu ?? 0;
  const user = adminUsername || "admin";

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/admin" className="side-brand">
          <LogoMark size={26} />
          <span>
            {site.name}
            <small>Admin</small>
          </span>
        </Link>

        <SideNav pending={pending} securityWarn={!twoFa} />

        <div className="side-foot">
          <a href="/admin/export" className="side-link">
            Export orders (CSV)
          </a>
          <a href="/" target="_blank" rel="noopener" className="side-link">
            View site ↗
          </a>
          <div className="side-user">
            <span className="avatar" aria-hidden="true">
              {user.slice(0, 1).toUpperCase()}
            </span>
            <span className="side-user-name">
              {user}
              <small>{twoFa ? "2FA on" : "2FA off"}</small>
            </span>
            <form action={logout}>
              <button type="submit" className="signout" title="Sign out" aria-label="Sign out">
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <form action="/admin/orders" role="search" className="top-search">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input type="search" name="q" placeholder="Search orders" aria-label="Search orders" />
          </form>
          {!twoFa && (
            <Link href="/admin/security" className="top-warn">
              Turn on 2FA
            </Link>
          )}
          {pending > 0 && (
            <Link href="/admin/orders?status=neu" className="top-pill">
              {pending} awaiting payment
            </Link>
          )}
        </header>

        <main className="admin-main">
          {!dbConfigured ? (
            <div className="notice">
              <strong>Database missing.</strong> In Vercel, open Storage and connect a Neon database to this project, then
              redeploy.
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
