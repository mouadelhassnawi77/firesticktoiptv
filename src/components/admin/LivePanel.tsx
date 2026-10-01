"use client";

import { useEffect, useRef, useState } from "react";
import { market } from "@/lib/site";
import type { LiveSnapshot } from "@/lib/live";

const REFRESH_MS = 30_000;
const num = (v: number) => v.toLocaleString("en-US");
const money = new Intl.NumberFormat(market.numberLocale, { style: "currency", currency: market.currency });

function ago(fromIso: string, now: number) {
  const s = Math.max(0, Math.round((now - Date.parse(fromIso)) / 1000));
  if (s < 60) return `${s} s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}

function MinuteBars({ minutes }: { minutes: number[] }) {
  const W = 300;
  const H = 72;
  const max = Math.max(1, ...minutes);
  const slot = W / minutes.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="live-bars" role="img" aria-label="Active users per minute, last 30 minutes">
      {minutes.map((v, i) => {
        const h = v ? Math.max(4, (v / max) * (H - 4)) : 2;
        return (
          <rect key={i} x={i * slot + 1.5} y={H - h} width={slot - 3} height={h} rx="1.5" className={v ? "on" : "off"}>
            <title>{`${29 - i === 0 ? "This minute" : `${29 - i} min ago`}: ${num(v)} ${v === 1 ? "user" : "users"}`}</title>
          </rect>
        );
      })}
    </svg>
  );
}

export default function LivePanel({ initial }: { initial: LiveSnapshot }) {
  const [snap, setSnap] = useState(initial);
  const [failed, setFailed] = useState(false);
  // Starts at the snapshot time so the server and browser render the same text, then ticks every second
  const [now, setNow] = useState(() => Date.parse(initial.at));
  const busy = useRef(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (busy.current) return;
      busy.current = true;
      try {
        const res = await fetch("/admin/realtime", { cache: "no-store" });
        if (res.status === 401) {
          location.href = "/admin/login";
          return;
        }
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as LiveSnapshot;
        if (alive) {
          setSnap(data);
          setFailed(false);
        }
      } catch {
        if (alive) setFailed(true);
      } finally {
        busy.current = false;
      }
    }
    const poll = setInterval(() => document.visibilityState === "visible" && load(), REFRESH_MS);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      clearInterval(poll);
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const { ga, sales } = snap;
  const deviceTotal = ga ? ga.devices.reduce((s, d) => s + d.users, 0) || 1 : 1;

  return (
    <section className="live" aria-labelledby="live-title">
      <div className="live-top">
        <div className="live-now">
          <h2 id="live-title" className="live-title">
            <span className="live-dot" aria-hidden="true" />
            Live on your site
          </h2>
          {ga ? (
            <>
              <p className="live-num tabular" key={ga.active} aria-live="polite">
                {num(ga.active)}
              </p>
              <p className="live-cap">
                {ga.active === 1 ? "visitor" : "visitors"} in the last 30 minutes, {num(ga.views)} pageviews
              </p>
            </>
          ) : (
            <p className="live-cap live-off">
              {snap.gaError ??
                (snap.gaConfigured ? "Loading visitors…" : "Connect Google Analytics below to see visitors live.")}
            </p>
          )}
        </div>
        {ga && (
          <figure className="live-chart">
            <MinuteBars minutes={ga.minutes} />
            <figcaption>
              <span>30 min ago</span>
              <span>Visitors per minute</span>
              <span>Now</span>
            </figcaption>
          </figure>
        )}
      </div>

      <div className="live-cols">
        {ga && (
          <>
            <div>
              <h3>Viewing now</h3>
              {ga.pages.length ? (
                <ol className="live-list">
                  {ga.pages.map((p) => (
                    <li key={p.title}>
                      <span>{p.title}</span>
                      <strong className="tabular">{num(p.users)}</strong>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="live-empty">Nobody right now.</p>
              )}
            </div>
            <div>
              <h3>Where they are</h3>
              {ga.countries.length ? (
                <ol className="live-list">
                  {ga.countries.map((c) => (
                    <li key={c.key}>
                      <span>{c.key}</span>
                      <strong className="tabular">{num(c.users)}</strong>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="live-empty">No visitors in the last 30 minutes.</p>
              )}
              {ga.devices.length > 0 && (
                <p className="live-devices">
                  {ga.devices
                    .map((d) => `${d.key.charAt(0).toUpperCase()}${d.key.slice(1)} ${Math.round((d.users / deviceTotal) * 100)}%`)
                    .join(", ")}
                </p>
              )}
            </div>
            <div>
              <h3>Buying signals, 30 min</h3>
              <ul className="live-list">
                <li>
                  <span>Opened the order form</span>
                  <strong className="tabular">{num(ga.checkouts)}</strong>
                </li>
                <li>
                  <span>Sent an order</span>
                  <strong className="tabular">{num(ga.leads)}</strong>
                </li>
              </ul>
            </div>
          </>
        )}
        <div className="live-sales">
          <h3>Orders, from your database</h3>
          <dl className="live-today">
            <div>
              <dt>Last 30 min</dt>
              <dd className="tabular">{num(sales.last30)}</dd>
            </div>
            <div>
              <dt>Today</dt>
              <dd className="tabular">{num(sales.todayOrders)}</dd>
            </div>
            <div>
              <dt>Paid today</dt>
              <dd className="tabular">{money.format(sales.todayRevenue)}</dd>
            </div>
          </dl>
          {sales.latest.length ? (
            <ol className="live-list live-orders">
              {sales.latest.slice(0, 3).map((o) => (
                <li key={o.id}>
                  <span>
                    <a href={`/admin/orders/${o.id}`}>{o.plan}</a>, {o.device}
                    <small>
                      {ago(o.at, now)}, {o.statusLabel}
                    </small>
                  </span>
                  <strong className="tabular">{money.format(o.price)}</strong>
                </li>
              ))}
            </ol>
          ) : (
            <p className="live-empty">No orders yet.</p>
          )}
        </div>
      </div>

      <p className="live-foot" role="status">
        {failed ? "Connection lost, retrying in 30 seconds. " : ""}
        Updated {ago(snap.at, now)}. Refreshes every 30 seconds while this page is open.
      </p>
    </section>
  );
}
