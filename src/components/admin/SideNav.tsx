"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const icons = {
  dashboard: <path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z" />,
  orders: (
    <>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
    </>
  ),
  customers: (
    <>
      <circle cx="9" cy="7" r="4" />
      <path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2M16 3.1a4 4 0 0 1 0 7.8M22 21v-2a4 4 0 0 0-3-3.9" />
    </>
  ),
  analytics: <path d="M3 3v18h18M7 15l4-4 3 3 6-6" />,
  seo: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m21 21-5.5-5.5M7.5 12l2-2 1.5 1.5 2.5-3" />
    </>
  ),
  security: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
};

type IconName = keyof typeof icons;

function Icon({ name }: { name: IconName }) {
  return (
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
      {icons[name]}
    </svg>
  );
}

const items: { href: string; label: string; icon: IconName; badge?: "pending" | "security" }[] = [
  { href: "/admin", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/orders", label: "Orders", icon: "orders", badge: "pending" },
  { href: "/admin/customers", label: "Customers", icon: "customers" },
  { href: "/admin/analytics", label: "Analytics", icon: "analytics" },
  { href: "/admin/seo", label: "SEO", icon: "seo" },
  { href: "/admin/security", label: "Security", icon: "security", badge: "security" },
];

export default function SideNav({ pending, securityWarn }: { pending: number; securityWarn: boolean }) {
  const path = usePathname();
  const active = (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));
  return (
    <nav className="side-nav" aria-label="Admin">
      {items.map((it) => (
        <Link key={it.href} href={it.href} aria-current={active(it.href) ? "page" : undefined}>
          <Icon name={it.icon} />
          <span>{it.label}</span>
          {it.badge === "pending" && pending > 0 && (
            <em className="nav-badge" aria-label={`${pending} awaiting payment`}>
              {pending}
            </em>
          )}
          {it.badge === "security" && securityWarn && (
            <em className="nav-badge is-warn" aria-label="2FA is off" title="2FA is off">
              !
            </em>
          )}
        </Link>
      ))}
    </nav>
  );
}
