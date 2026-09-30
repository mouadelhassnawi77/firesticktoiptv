import OrderButton from "./order/OrderButton";
import PageLink from "./PageLink";
import { formatPrice, site } from "@/lib/site";
import { plans, trial, planFeatures, popularPlan, monthly, savingsPercent } from "@/lib/shop";

/**
 * Pricing block: the most popular plan as the featured card, the others as rows,
 * then the free trial. Buying opens the order popup.
 */
export default function Pricing({ headingLevel = 2 }: { headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? "h2" : "h3";
  const others = plans.filter((p) => p.id !== popularPlan.id).sort((a, b) => b.months - a.months);
  const save = savingsPercent(popularPlan);

  return (
    <div className="pricing">
      <article className="plan-featured" id={popularPlan.id} aria-labelledby={`${popularPlan.id}-title`}>
        <p className="plan-badge">Best value</p>
        <H id={`${popularPlan.id}-title`} className="plan-featured-name">
          IPTV {popularPlan.name}
        </H>
        <p className="plan-featured-price">
          <span className="tabular">{formatPrice(popularPlan.price)}</span>
          <small>one payment for {popularPlan.months} months</small>
        </p>
        <p className="plan-featured-per">
          Just <strong className="tabular">{formatPrice(monthly(popularPlan))}</strong> per month.
          {save > 0 && <> You save {save}% compared with paying month to month.</>}
        </p>
        <ul className="plan-featured-list">
          {planFeatures.map((f) => (
            <li key={f}>{f}</li>
          ))}
          <li>No automatic renewal</li>
        </ul>
        <OrderButton productId={popularPlan.id} className="btn btn-primary btn-large">
          Get {popularPlan.name}
        </OrderButton>
      </article>

      <div className="plan-side">
        <ul className="plans">
          {others.map((p) => {
            const s = savingsPercent(p);
            return (
              <li key={p.id} id={p.id} className="plan">
                <div className="plan-name">
                  IPTV {p.name}
                  <small>{s > 0 ? `${s}% cheaper per month` : "Try it for a month"}</small>
                </div>
                <div className="plan-price">{formatPrice(p.price)}</div>
                <p className="plan-per">{formatPrice(monthly(p))} per month</p>
                <div className="plan-cta">
                  <OrderButton productId={p.id} className="btn btn-ghost">
                    Get {p.name}
                  </OrderButton>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="trial-row" id={trial.id}>
          <div>
            <p className="trial-title">Want to test first?</p>
            <p className="muted">
              {trial.hours} hours of full access, <strong>free</strong>. No card, ends on its own.
            </p>
          </div>
          <OrderButton productId={trial.id} className="btn btn-ghost">
            Start free trial
          </OrderButton>
        </div>

        <p className="plan-footnote muted">
          One-time payment, no hidden fees. Pay with crypto, card or PayPal. {site.refundDays}-day refund, see
          our <PageLink to="refund">refund policy</PageLink>.
        </p>
      </div>
    </div>
  );
}
