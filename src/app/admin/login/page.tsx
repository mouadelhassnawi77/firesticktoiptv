import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { adminConfigured, getTotpSecret, isAdmin, usernameMissing } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { site } from "@/lib/site";
import { LogoMark } from "@/components/Logo";
import LoginForm from "@/components/admin/LoginForm";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  const twoFa = Boolean(await getTotpSecret());

  return (
    <main className="login">
      <div className="login-card">
        <div className="login-brand">
          <LogoMark size={30} />
          <div>
            <strong>{site.name}</strong>
            <span>Admin</span>
          </div>
        </div>
        <h1>Sign in</h1>

        {!dbConfigured ? (
          <p className="notice">The database is not connected. Connect Neon to this project in Vercel, then redeploy.</p>
        ) : !adminConfigured ? (
          <div className="notice">
            <strong>{usernameMissing ? "Username missing." : "Admin not set up."}</strong> In Vercel open Settings,
            Environment Variables and add <code>ADMIN_USERNAME</code>
            {usernameMissing ? "" : <> and <code>ADMIN_PASSWORD</code></>} for Production, then redeploy.
          </div>
        ) : (
          <LoginForm twoFa={twoFa} />
        )}

        <p className="login-foot">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          Private area. Every attempt is logged with its IP address.
        </p>
      </div>
    </main>
  );
}
