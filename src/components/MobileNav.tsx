"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { trial } from "@/lib/shop";
import { useOrder } from "./order/OrderProvider";

type Item = { href: string; label: string };

/** Only client nav component: closes itself on route change. */
export default function MobileNav({ items }: { items: Item[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const order = useOrder();

  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <button
        type="button"
        className="menu-toggle"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Close" : "Menu"}
      </button>
      <nav
        id="mobile-menu"
        className="nav-mobile"
        aria-label="Main navigation (mobile)"
        hidden={!open}
        style={{ position: "absolute", left: 0, right: 0, top: "100%" }}
      >
        <ul>
          {items.map((item) => (
            <li key={item.href}>
              <Link href={item.href} aria-current={pathname === item.href ? "page" : undefined}>
                {item.label}
              </Link>
            </li>
          ))}
          <li style={{ border: 0 }}>
            <button
              type="button"
              className="btn btn-primary"
              aria-haspopup="dialog"
              onClick={() => {
                setOpen(false);
                order({ productId: trial.id });
              }}
            >
              Start {trial.hours}-hour free trial
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
