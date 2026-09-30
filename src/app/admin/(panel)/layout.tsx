import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "../actions";
import { isAdmin } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { LogoMark } from "@/components/Logo";

// Every admin page is rendered fresh per request and never cached
export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) redirect("/admin/login");

  return (
    <>
      <header className="admin-bar">
        <div className="admin-wrap">
          <Link href="/admin" className="admin-brand">
            <LogoMark size={22} />
            IPTV Germany <small>Admin</small>
          </Link>
          <nav className="admin-nav" aria-label="Admin navigation">
            <Link href="/admin">Dashboard</Link>
            <Link href="/admin/orders">Orders</Link>
            <Link href="/admin/analytics">Analytics</Link>
            <a href="/admin/export">Export CSV</a>
            <Link href="/">View site</Link>
            <form action={logout}>
              <button type="submit">Sign out</button>
            </form>
          </nav>
        </div>
      </header>
      <main className="admin-wrap admin-main">
        {!dbConfigured ? (
          <div className="notice">
            <strong>Database missing.</strong> In Vercel, open Storage (Marketplace) and connect a Neon database to this
            project. Vercel then sets <code>DATABASE_URL</code> automatically. Redeploy once afterwards.
          </div>
        ) : (
          children
        )}
      </main>
    </>
  );
}
