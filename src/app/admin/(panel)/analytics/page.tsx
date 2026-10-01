import type { Metadata } from "next";
import Link from "next/link";
import {
  GA_PERIODS,
  gaConfigured,
  gaErrorHint,
  gaSetup,
  gaTrackingId,
  getGaDashboard,
  getGaPeriod,
  type GaDashboard,
} from "@/lib/ga";
import { getLiveSnapshot } from "@/lib/live";
import { getSalesWindow } from "@/lib/orders";
import BarDotChart from "@/components/admin/BarDotChart";
import BarList from "@/components/admin/BarList";
import LivePanel from "@/components/admin/LivePanel";
import { MONTHS } from "@/components/admin/RevenueChart";
import { fmtMoney, fmtNum } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Analytics" };

type Search = { period?: string };

function duration(seconds: number) {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}
const percent = (r: number, digits = 1) => `${fmtNum(r * 100, digits)}%`;
const rate = (part: number, whole: number) => (whole > 0 ? part / whole : 0);
const change = (v: number, old: number) => (old > 0 ? ((v - old) / old) * 100 : null);

/** "+12% vs previous 30 days", green when it is good news, red when it is bad news */
function Delta({ value, inverse = false, label }: { value: number | null; inverse?: boolean; label: string }) {
  if (value === null) return <p className="kpi-note">No data for the previous {label}</p>;
  const rounded = Math.round(value);
  const tone = rounded === 0 ? "" : (rounded > 0) !== inverse ? "is-up" : "is-down";
  return (
    <p className={`kpi-note delta ${tone}`}>
      {rounded > 0 ? "+" : ""}
      {fmtNum(value)}% vs previous {label}
    </p>
  );
}

/** GA bucket keys: dateHour "YYYYMMDDHH", date "YYYYMMDD", yearMonth "YYYYMM" */
function bucketLabel(key: string, dim: string, long = false) {
  const y = key.slice(0, 4);
  const m = MONTHS[Number(key.slice(4, 6)) - 1];
  if (dim === "dateHour") return long ? `${Number(key.slice(6, 8))} ${m}, ${key.slice(8, 10)}:00` : `${key.slice(8, 10)}:00`;
  if (dim === "date") return long ? `${Number(key.slice(6, 8))} ${m} ${y}` : `${Number(key.slice(6, 8))} ${m}`;
  return long ? `${m} ${y}` : `${m} ${y.slice(2)}`;
}

function Setup() {
  const reporting = gaSetup.property && Boolean(gaSetup.email) && gaSetup.key;
  const items = [
    { ok: gaSetup.tracking, name: "NEXT_PUBLIC_GA_ID", text: gaSetup.tracking ? `Tracking on (${gaTrackingId})` : "Measurement ID, starts with G-" },
    { ok: gaSetup.property, name: "GA_PROPERTY_ID", text: gaSetup.property ? "Property ID set" : "Numeric Property ID, 9 digits or more" },
    {
      ok: Boolean(gaSetup.email) && gaSetup.key,
      name: "GA_SERVICE_ACCOUNT_JSON",
      text: gaSetup.jsonInvalid
        ? "Set, but it is not valid JSON. Paste the whole file again."
        : gaSetup.email
          ? `Service account ${gaSetup.email}`
          : "The whole JSON key file of the service account",
    },
  ];
  return (
    <div className="panel setup">
      <h2>Connect Google Analytics</h2>
      <p className="muted">
        Tracking counts visitors on the website. Reporting brings the numbers here, next to your orders. Add these three
        values in Vercel, Settings, Environment Variables (Production), then redeploy.
      </p>
      <ul className="checklist setup-check">
        {items.map((i) => (
          <li key={i.name} className={i.ok ? "is-ok" : "is-warn"}>
            <span className="check-ico" aria-hidden="true">
              {i.ok ? "✓" : "!"}
            </span>
            <span>
              <code>{i.name}</code>
              <span className="sub">{i.text}</span>
            </span>
          </li>
        ))}
      </ul>
      <ol>
        <li>
          <strong>Google Analytics:</strong> Admin, Create, Property, then a <em>Web</em> data stream for{" "}
          <code>www.firesticktoiptv.com</code>. Copy the <em>Measurement ID</em> (G-…) and, from Property details, the
          numeric <em>Property ID</em>.
        </li>
        <li>
          <strong>Google Cloud:</strong> create a project, enable the <em>Google Analytics Data API</em>, create a{" "}
          <em>service account</em>, open it, Keys, Add key, JSON. A file downloads.
        </li>
        <li>
          <strong>Google Analytics:</strong> Admin, Property access management, add the service account email as{" "}
          <em>Viewer</em>.
        </li>
        <li>
          <strong>Vercel:</strong> add the three values above (the JSON file goes in whole, from <code>{"{"}</code> to{" "}
          <code>{"}"}</code>), then redeploy.
        </li>
      </ol>
      <p className="muted" style={{ marginBottom: 0 }}>
        Tracking: {gaSetup.tracking ? <strong>on</strong> : "off"}. Reporting: {reporting ? <strong>on</strong> : "off"}.
      </p>
    </div>
  );
}

function ConvTable({
  caption,
  first,
  rows,
  best,
}: {
  caption: string;
  first: string;
  rows: { key: string; label: React.ReactNode; sub?: string; sessions: number; engagement: number; leads: number }[];
  best?: string;
}) {
  if (rows.length === 0) return <p className="empty">No visits in this period yet.</p>;
  return (
    <div className="table-scroll flat">
      <table className="orders mini conv">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{first}</th>
            <th scope="col" className="num">
              Sessions
            </th>
            <th scope="col" className="num">
              Engaged
            </th>
            <th scope="col" className="num">
              Orders sent
            </th>
            <th scope="col" className="num">
              Conversion
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className={r.key === best ? "is-best" : undefined}>
              <td>
                {r.label}
                {r.key === best && <span className="best-tag">Best converting</span>}
                {r.sub && <span className="sub">{r.sub}</span>}
              </td>
              <td className="num">{fmtNum(r.sessions)}</td>
              <td className="num">{percent(r.engagement, 0)}</td>
              <td className="num">{fmtNum(r.leads)}</td>
              <td className="num">
                <strong>{r.leads ? percent(rate(r.leads, r.sessions), 2) : "–"}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Highest conversion among rows with enough traffic to mean something */
function bestKey(rows: { key: string; sessions: number; leads: number }[]) {
  const ok = rows.filter((r) => r.sessions >= 20 && r.leads > 0);
  if (ok.length < 2) return undefined;
  return ok.reduce((a, b) => (rate(b.leads, b.sessions) > rate(a.leads, a.sessions) ? b : a)).key;
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { period } = await searchParams;
  const p = getGaPeriod(period);
  const span = p.id === "today" ? "day" : p.label.toLowerCase();

  const [live, sales] = await Promise.all([getLiveSnapshot(), getSalesWindow(p.days)]);

  const head = (
    <div className="admin-head">
      <div>
        <h1>Analytics</h1>
        <p className="page-sub">Visitors from Google Analytics next to the orders in your database.</p>
      </div>
      {gaConfigured && (
        <nav className="tabs is-period" aria-label="Period">
          {GA_PERIODS.map((x) => (
            <Link
              key={x.id}
              href={x.id === "30d" ? "/admin/analytics" : `/admin/analytics?period=${x.id}`}
              aria-current={x.id === p.id ? "page" : undefined}
            >
              {x.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );

  if (!gaConfigured) {
    return (
      <>
        {head}
        <LivePanel initial={live} />
        <Setup />
      </>
    );
  }

  let data: GaDashboard;
  try {
    data = await getGaDashboard(p.id);
  } catch (e) {
    const message = (e as Error).message;
    return (
      <>
        {head}
        <LivePanel initial={live} />
        <div className="notice">
          <strong>Google Analytics could not be loaded.</strong> {gaErrorHint(message)}
          <span className="sub muted">Google said: {message}</span>
        </div>
        <Setup />
      </>
    );
  }

  const t = data.totals;
  const c = data.change;
  const visitors = t.activeUsers;
  const nvr = Object.fromEntries(data.newVsReturning.map((x) => [x.key, x.count]));
  const nvrTotal = (nvr.new ?? 0) + (nvr.returning ?? 0) || 1;
  const rpv = rate(sales.revenue, visitors);

  const flow = [
    {
      label: "Visitors",
      value: fmtNum(visitors),
      note: <Delta value={c.activeUsers} label={span} />,
      source: "Google Analytics",
    },
    {
      label: "Opened the order form",
      value: fmtNum(data.checkouts),
      note: <p className="kpi-note">{percent(rate(data.checkouts, visitors))} of visitors</p>,
      source: "Google Analytics",
    },
    {
      label: "Sent an order",
      value: fmtNum(sales.orders),
      note: (
        <p className="kpi-note">
          {percent(rate(sales.orders, visitors), 2)} of visitors
          {sales.trials ? `, ${fmtNum(sales.trials)} free ${sales.trials === 1 ? "trial" : "trials"}` : ""}
        </p>
      ),
      source: "Your orders",
    },
    {
      label: "Paid",
      value: fmtNum(sales.paid),
      note: <Delta value={change(sales.paid, sales.prevPaid)} label={span} />,
      source: "Your orders",
    },
    {
      label: "Revenue",
      value: fmtMoney(sales.revenue),
      note: <p className="kpi-note">{fmtMoney(rpv)} per visitor</p>,
      source: "Your orders",
    },
  ];

  const channelRows = data.channels.map((x) => ({ ...x, label: x.key }));
  const sourceRows = data.sources.map((x) => ({
    key: `${x.source} / ${x.medium}`,
    label: x.source,
    sub: x.medium,
    sessions: x.sessions,
    engagement: x.engagement,
    leads: x.leads,
  }));
  const landingRows = data.landing.map((x) => ({
    key: x.path,
    label: (
      <a href={x.path === "(not set)" ? "/" : x.path} target="_blank" rel="noopener">
        {x.path}
      </a>
    ),
    sessions: x.sessions,
    engagement: x.engagement,
    leads: x.leads,
  }));

  return (
    <>
      {head}

      <LivePanel initial={live} />

      <section className="panel flow-panel" aria-labelledby="flow">
        <div className="panel-head">
          <h2 id="flow">From visitor to revenue, {p.label.toLowerCase()}</h2>
          <span className="muted small">Each step shows how many people made it that far</span>
        </div>
        <ol className="flow">
          {flow.map((f, i) => (
            <li key={f.label} className={i === flow.length - 1 ? "is-end" : undefined}>
              <span className="flow-label">{f.label}</span>
              <strong className="flow-value tabular">{f.value}</strong>
              {f.note}
              <span className="flow-source">{f.source}</span>
            </li>
          ))}
        </ol>
      </section>

      <dl className="kpis">
        <div className="kpi">
          <dt>Visitors</dt>
          <dd>{fmtNum(visitors)}</dd>
          <Delta value={c.activeUsers} label={span} />
        </div>
        <div className="kpi">
          <dt>New visitors</dt>
          <dd>{fmtNum(t.newUsers)}</dd>
          <Delta value={c.newUsers} label={span} />
        </div>
        <div className="kpi">
          <dt>Sessions</dt>
          <dd>{fmtNum(t.sessions)}</dd>
          <Delta value={c.sessions} label={span} />
        </div>
        <div className="kpi">
          <dt>Pageviews</dt>
          <dd>{fmtNum(t.screenPageViews)}</dd>
          <p className="kpi-note">{fmtNum(t.screenPageViewsPerSession, 2)} per session</p>
        </div>
        <div className="kpi">
          <dt>Avg. engagement time</dt>
          <dd>{duration(t.engagementTime)}</dd>
          <Delta value={c.engagementTime} label={span} />
        </div>
        <div className="kpi">
          <dt>Engagement rate</dt>
          <dd>{percent(t.engagementRate)}</dd>
          <p className="kpi-note">Bounce rate {percent(t.bounceRate)}</p>
        </div>
      </dl>

      <section className="panel" aria-labelledby="traffic" style={{ marginBottom: "1rem" }}>
        <div className="panel-head">
          <h2 id="traffic">Sessions and pageviews, {p.label.toLowerCase()}</h2>
          <span className="muted">{p.dim === "dateHour" ? "per hour" : p.dim === "date" ? "per day" : "per month"}</span>
        </div>
        <BarDotChart
          ariaLabel="Sessions and pageviews in the selected period"
          barName="Sessions"
          dotName="Pageviews"
          formatBar={(v) => fmtNum(v)}
          data={data.series.map((s) => ({
            key: s.bucket,
            label: bucketLabel(s.bucket, p.dim),
            longLabel: `${bucketLabel(s.bucket, p.dim, true)} (${fmtNum(s.users)} visitors)`,
            bar: s.sessions,
            dot: s.views,
          }))}
        />
      </section>

      <div className="admin-grid is-detail">
        <section className="panel" aria-labelledby="channels">
          <h2 id="channels">Where visitors come from</h2>
          <ConvTable caption="Traffic channels with conversion" first="Channel" rows={channelRows} best={bestKey(channelRows)} />
        </section>
        <section className="panel" aria-labelledby="sources">
          <h2 id="sources">Source and medium</h2>
          <ConvTable caption="Sources with conversion" first="Source" rows={sourceRows} best={bestKey(sourceRows)} />
        </section>
      </div>

      <section className="panel" aria-labelledby="landing" style={{ marginBottom: "1rem" }}>
        <div className="panel-head">
          <h2 id="landing">Landing pages that bring orders</h2>
          <span className="muted small">The first page of each visit, and how often that visit ended in an order</span>
        </div>
        <ConvTable caption="Landing pages with conversion" first="Landing page" rows={landingRows} best={bestKey(landingRows)} />
      </section>

      <section className="panel" aria-labelledby="pages" style={{ marginBottom: "1rem" }}>
        <h2 id="pages">Most viewed pages</h2>
        {data.pages.length === 0 ? (
          <p className="empty">No pageviews in this period yet.</p>
        ) : (
          <div className="table-scroll flat">
            <table className="orders mini">
              <thead>
                <tr>
                  <th scope="col">Page</th>
                  <th scope="col" className="num">
                    Views
                  </th>
                  <th scope="col" className="num">
                    Visitors
                  </th>
                  <th scope="col" className="num">
                    Avg. time
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.pages.map((x) => (
                  <tr key={x.path + x.title}>
                    <td>
                      <a href={x.path} target="_blank" rel="noopener">
                        {x.title || x.path}
                      </a>
                      <span className="sub">{x.path}</span>
                    </td>
                    <td className="num">{fmtNum(x.views)}</td>
                    <td className="num">{fmtNum(x.users)}</td>
                    <td className="num">{duration(x.engagementTime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="admin-grid is-four">
        <section className="panel" aria-labelledby="states">
          <h2 id="states">US states</h2>
          <BarList items={data.regions} label={(k) => k} showRevenue={false} unit={["visitor", "visitors"]} empty="No US visitors yet." />
        </section>
        <section className="panel" aria-labelledby="countries">
          <h2 id="countries">Countries</h2>
          <BarList items={data.countries} label={(k) => k} showRevenue={false} showShare unit={["visitor", "visitors"]} empty="No data yet." />
        </section>
        <section className="panel" aria-labelledby="devices-ga">
          <h2 id="devices-ga">Devices</h2>
          <BarList
            items={data.devices}
            label={(k) => k.charAt(0).toUpperCase() + k.slice(1)}
            showRevenue={false}
            showShare
            unit={["visitor", "visitors"]}
            empty="No data yet."
          />
          <h2 className="sub-h">Operating systems</h2>
          <BarList items={data.os} label={(k) => k} showRevenue={false} showShare unit={["visitor", "visitors"]} empty="No data yet." />
        </section>
        <section className="panel" aria-labelledby="nvr">
          <h2 id="nvr">New and returning</h2>
          <div className="split-bar" role="img" aria-label={`New ${fmtNum(((nvr.new ?? 0) / nvrTotal) * 100)}%`}>
            <span style={{ width: `${((nvr.new ?? 0) / nvrTotal) * 100}%` }} />
          </div>
          <ul className="simple-list" style={{ marginTop: "0.6rem" }}>
            <li>
              <span>New</span>
              <strong className="tabular">
                {fmtNum(nvr.new ?? 0)} ({fmtNum(((nvr.new ?? 0) / nvrTotal) * 100)}%)
              </strong>
            </li>
            <li>
              <span>Returning</span>
              <strong className="tabular">
                {fmtNum(nvr.returning ?? 0)} ({fmtNum(((nvr.returning ?? 0) / nvrTotal) * 100)}%)
              </strong>
            </li>
          </ul>
          <p className="muted small" style={{ margin: "0.6rem 0 0" }}>
            Returning visitors often come back to buy after a free trial.
          </p>
        </section>
      </div>

      <p className="muted small">
        Visitors and order forms come from Google Analytics 4 ({gaTrackingId || "tracking ID not set"}), refreshed every
        10 minutes (today: every 2 minutes). Orders, paid orders and revenue come from your database and are exact.
        Google does not count visitors who block tracking or decline cookies, so &quot;Orders sent&quot; in the source tables
        can be lower than your real orders.
      </p>
    </>
  );
}
