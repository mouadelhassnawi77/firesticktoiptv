import Link from "next/link";
import { LogoMark } from "./Logo";
import MobileNav from "./MobileNav";
import OrderButton from "./order/OrderButton";
import { mainNav, site } from "@/lib/site";
import { trial } from "@/lib/shop";

export default function Header() {
  return (
    <header className="site-header">
      <div className="wrap" style={{ position: "relative" }}>
        <Link href="/" className="brand" aria-label={`${site.name} home`}>
          <LogoMark />
          {site.name}
        </Link>
        <nav className="nav-desktop" aria-label="Main navigation">
          <ul>
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <OrderButton productId={trial.id} className="btn btn-primary btn-small header-cta">
          Free Trial
        </OrderButton>
        <MobileNav items={mainNav} />
      </div>
    </header>
  );
}
