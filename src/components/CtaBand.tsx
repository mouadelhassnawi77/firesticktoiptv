import Link from "next/link";
import OrderButton from "./order/OrderButton";
import { trial } from "@/lib/shop";
import { routes } from "@/lib/site";

export default function CtaBand({
  title = `Try it free for ${trial.hours} hours, then decide`,
  text = "Get a full test login on WhatsApp in minutes. Watch your channels on your own device. If you like it, pick a plan.",
  device,
}: {
  title?: string;
  text?: string;
  device?: string;
}) {
  return (
    <section className="cta-band">
      <div className="wrap">
        <h2>{title}</h2>
        <p>{text}</p>
        <div className="hero-actions">
          <OrderButton productId={trial.id} device={device} className="btn btn-primary">
            Start {trial.hours}-hour free trial
          </OrderButton>
          <Link href={routes.pricing.live ? routes.pricing.href : "/#pricing"} className="btn btn-ghost">
            See plans
          </Link>
        </div>
      </div>
    </section>
  );
}
