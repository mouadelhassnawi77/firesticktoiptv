import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { login } from "../actions";
import { adminConfigured, isAdmin } from "@/lib/auth";
import { LogoMark } from "@/components/Logo";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await isAdmin()) redirect("/admin");
  const { error } = await searchParams;

  return (
    <main className="login">
      <div className="login-card">
        <p style={{ margin: "0 0 0.75rem" }}>
          <LogoMark />
        </p>
        <h1>Admin</h1>
        {!adminConfigured ? (
          <p className="notice" style={{ margin: 0 }}>
            No password set yet. In Vercel, go to Settings, Environment Variables, add <code>ADMIN_PASSWORD</code> and
            redeploy.
          </p>
        ) : (
          <form action={login}>
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required autoFocus />
            {error && <p className="form-error">Wrong password.</p>}
            <button type="submit" className="btn btn-primary">
              Sign in
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
