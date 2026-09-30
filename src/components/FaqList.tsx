import type { Faq } from "@/lib/faqs";

/** Native <details>: ohne JavaScript, barrierefrei, Antworten stehen im HTML (crawlbar). */
export default function FaqList({ items }: { items: Faq[] }) {
  return (
    <div className="faq">
      {items.map((f) => (
        <details key={f.q}>
          <summary>{f.q}</summary>
          <p>{f.a}</p>
        </details>
      ))}
    </div>
  );
}
