"use client";

import { useOrder } from "./OrderProvider";

/** Öffnet das Bestell-Popup für ein Paket, optional mit vorausgewähltem Gerät. */
export default function OrderButton({
  productId,
  device,
  className = "btn btn-primary",
  children,
}: {
  productId: string;
  device?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const open = useOrder();
  return (
    <button type="button" className={className} aria-haspopup="dialog" onClick={() => open({ productId, device })}>
      {children}
    </button>
  );
}
