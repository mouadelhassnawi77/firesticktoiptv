import type { NextConfig } from "next";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  // One URL per page: /pricing, never /pricing/ (avoids duplicate content)
  trailingSlash: false,
  images: { formats: ["image/avif", "image/webp"] },
  // Old German admin URLs keep working
  async redirects() {
    return [
      { source: "/admin/bestellungen", destination: "/admin/orders", permanent: true },
      { source: "/admin/bestellungen/:id", destination: "/admin/orders/:id", permanent: true },
    ];
  },
  // URLs that match no page or file go to the redirect / 404 monitor (Admin → SEO).
  // "fallback" runs only after every page, file and dynamic route has been checked.
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [{ source: "/:path*", destination: "/missing-url?__p=:path*" }],
    };
  },
  async headers() {
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    // Admin: never cached by browsers or proxies, never framed (clickjacking), no referrer leaks
    const adminHeaders = [
      ...noindex,
      { key: "Cache-Control", value: "no-store, max-age=0" },
      { key: "X-Frame-Options", value: "DENY" },
      {
        key: "Content-Security-Policy",
        value: "frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none'",
      },
      { key: "Referrer-Policy", value: "no-referrer" },
    ];
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin/:path*", headers: adminHeaders },
      { source: "/admin", headers: adminHeaders },
      { source: "/api/:path*", headers: noindex },
    ];
  },
};

export default nextConfig;
