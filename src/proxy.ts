import { NextResponse, type NextRequest } from "next/server";

/**
 * First gate in front of the admin: no session cookie, no admin page (and no database work).
 * The full check (token, expiry, idle timeout, changed credentials) runs in the admin layout,
 * every server action and the CSV export.
 */
const COOKIES = ["__Host-admin_session", "admin_session"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();
  if (!COOKIES.some((c) => req.cookies.has(c))) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
