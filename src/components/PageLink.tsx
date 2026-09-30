import Link from "next/link";
import { routes, type RouteKey } from "@/lib/site";

/**
 * Internal link by page key from the registry in lib/site.ts.
 * Page not live yet → plain text (no 404 for visitors or Google). Goes live → becomes a link automatically.
 */
export default function PageLink({
  to,
  children,
  className,
}: {
  to: RouteKey;
  children?: React.ReactNode;
  className?: string;
}) {
  const r = routes[to];
  const text = children ?? r.label;
  return r.live ? (
    <Link href={r.href} className={className}>
      {text}
    </Link>
  ) : (
    <>{text}</>
  );
}
