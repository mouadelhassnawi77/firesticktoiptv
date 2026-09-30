import type { Metadata } from "next";
import Link from "next/link";
import { GA_PERIODS, gaConfigured, gaTrackingId, getGaDashboard, getGaPeriod, getGaRealtime } from "@/lib/ga";
import BarDotChart from "@/components/admin/BarDotChart";
import BarList from "@/components/admin/BarList";
import { MONTHS } from "@/components/admin/RevenueChart";
import { fmtMoney, fmtNum } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Analytics" };

type Search = { period?: string };

const pct = (v: number | null) => (v === null ? "No data for the previous period" : `${v > 0 ? "+" : ""}${fmtNum(v)}% vs previous period`);
const duration = (s: number) => `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, "0")}s`;
const percent = (r: number) => `${fmtNum(r * 100, 1)}%`;

/** GA bucket keys: dateHour "YYYYMMDDHH", date "YYYYMMDD", yearMonth "YYYYMM" */
function bucketLabel(key: string, dim: string, long = false) {
  const y = key.slice(0, 4);
  const m = MONTHS[Number(key.slice(4, 6)) - 1];
  if (dim === "dateHour") return long ? `${Number(key.slice(6, 8))} ${m}, ${key.slice(8, 10)}:00` : `${key.slice(8, 10)}:00`;
  if (dim === "date") return long ? `${Number(key.slice(6, 8))} ${m} ${y}` : `${Number(key.slice(6, 8))} ${m}`;
  return long ? `${m} ${y}` : `${m} ${y.slice(2)}`;
}

function Setup() {
  return (
    <div className="panel setup">
      <h2>Connect Google Analytics</h2>
      <p className="muted">
        Two parts: <strong>tracking</strong> on the website (visitors are counted after they accept the cookie banner)
        and <strong>reporting</strong> here in the admin (read access through a Google service account).
      </p>
      <ol>
        <li>
          <strong>GA4 property:</strong> in Google Analytics create a property and a <em>Web</em> data stream for your
          domain. Copy the <em>Measurement ID</em> (starts with <code>G-</code>).
        </li>
        <li>
          <strong>Vercel:</strong> add <code>NEXT_PUBLIC_GA_ID</code> = your <code>G-…</code> ID (Production). This turns on
          tracking and the cookie banner.
        </li>
        <li>
          <strong>Google Cloud:</strong> create a project, enable the <em>Google Analytics Data API</em>, create a{" "}
          <em>service account</em> and add a <em>JSON key</em>.
        </li>
        <li>
          <strong>Google Analytics:</strong> Admin, Property access management, add the service account email as{" "}
          <em>Viewer</em>. Copy the numeric <em>Property ID</em> (Admin, Property details).
        </li>
        <li>
          <strong>Vercel:</strong> add <code>GA_PROPERTY_ID</code>, <code>GA_CLIENT_EMAIL</code> (the service account email)
          and <code>GA_PRIVATE_KEY</code> (the <code>private_key</code> value from the JSON file), then redeploy.
        </li>
      </ol>
      <p className="muted" style={{ marginBottom: 0 }}>
        Tracking: {gaTrackingId ? <strong>on ({gaTrackingId})</strong> : "off"}. Reporting: off.
      </p>
    </div>
  );
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { period } = await searchParams;
  const p = getGaPeriod(period);

  const head = (
    <div className="admin-head">
      <h1>Analytics</h1>
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
        <Setup />
      </>
    );
  }

  let data: Awaited<ReturnType<typeof getGaDashboard>>;
  let live: Awaited<ReturnType<typeof getGaRealtime>> | null = null;
  try {
    [data, live] = await Promise.all([getGaDashboard(p.id), getGaRealtime().catch(() => null)]);
  } catch (e) {
    return (
      <>
        {head}
        <div className="notice">
          <strong>Google Analytics could not be loaded.</strong> {(e as Error).message}
          <br />
          Check that the service account is a Viewer on the property and that <code>GA_PROPERTY_ID</code> is the numeric
          property ID.
        </div>
      </>
    );
  }

  const t = data.totals;
  const c = data.change;
  const leadRate = t.sessions ? (data.leads.count / t.sessions) * 100 : 0;
  const nvr = Object.fromEntries(data.newVsReturning.map((x) => [x.key, x.count]));
  const nvrTotal = (nvr.new ?? 0) + (nvr.returning ?? 0) || 1;

  return (
    <>
      {head}

      <div className="live-card">
        <span className="live-dot" aria-hidden="true" />
        <div>
          <strong className="tabular">{live ? fmtNum(live.active) : "–"}</strong> active users right now
          <span className="sub">
            {live && live.pages.length
              ? `Top: ${live.pages
                  .slice(0, 3)
                  .map((x) => `${x.title} (${x.users})`)
                  .join(", ")}`
              : "Last 30 minutes"}
          </span>
        </div>
      </div>

      <dl className="kpis">
        <div className="kpi is-main">
          <dt>Sessions</dt>
          <dd>{fmtNum(t.sessions)}</dd>
          <p className="kpi-note">{pct(c.sessions)}</p>
        </div>
        <div className="kpi">
          <dt>Users</dt>
          <dd>{fmtNum(t.totalUsers)}</dd>
          <p className="kpi-note">{pct(c.totalUsers)}</p>
        </div>
        <div className="kpi">
          <dt>New users</dt>
          <dd>{fmtNum(t.newUsers)}</dd>
          <p className="kpi-note">{pct(c.newUsers)}</p>
        </div>
        <div className="kpi">
          <dt>Pageviews</dt>
          <dd>{fmtNum(t.screenPageViews)}</dd>
          <p className="kpi-note">{fmtNum(t.screenPageViewsPerSession, 2)} per session</p>
        </div>
        <div className="kpi">
          <dt>Avg. session duration</dt>
          <dd>{duration(t.averageSessionDuration)}</dd>
          <p className="kpi-note">{pct(c.averageSessionDuration)}</p>
        </div>
        <div className="kpi">
          <dt>Engagement rate</dt>
          <dd>{percent(t.engagementRate)}</dd>
          <p className="kpi-note">Bounce rate {percent(t.bounceRate)}</p>
        </div>
      </dl>

      <section className="panel" aria-labelledby="traffic" style={{ marginBottom: "1rem" }}>
        <div className="admin-head" style={{ marginBottom: "0.5rem" }}>
          <h2 id="traffic" style={{ margin: 0 }}>
            Sessions and pageviews, {p.label.toLowerCase()}
          </h2>
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
            longLabel: `${bucketLabel(s.bucket, p.dim, true)} (${fmtNum(s.users)} users)`,
            bar: s.sessions,
            dot: s.views,
          }))}
        />
      </section>

      <div className="admin-grid is-three">
        <section className="panel" aria-labelledby="funnel">
          <h2 id="funnel">Order funnel</h2>
          <ul className="funnel">
            <li>
              <span>Sessions</span>
              <strong className="tabular">{fmtNum(t.sessions)}</strong>
            </li>
            <li>
              <span>Order popup opened</span>
              <strong className="tabular">{fmtNum(data.checkouts.count)}</strong>
            </li>
            <li>
              <span>Order sent</span>
              <strong className="tabular">{fmtNum(data.leads.count)}</strong>
            </li>
          </ul>
          <p className="muted" style={{ margin: "0.6rem 0 0" }}>
            Conversion {fmtNum(leadRate, 2)}% of sessions, order value {fmtMoney(data.leads.value)}. Only visitors who
            accepted cookies are counted, so this is lower than the orders in the dashboard.
          </p>
        </section>
        <section className="panel" aria-labelledby="channels">
          <h2 id="channels">Traffic channels</h2>
          <BarList
            items={data.channels}
            label={(k) => k}
            showRevenue={false}
            showShare
            unit={["session", "sessions"]}
            empty="No sessions in this period."
          />
        </section>
        <section className="panel" aria-labelledby="devices-ga">
          <h2 id="devices-ga">Devices</h2>
          <BarList
            items={data.devices}
            label={(k) => k.charAt(0).toUpperCase() + k.slice(1)}
            showRevenue={false}
            showShare
            unit={["session", "sessions"]}
            empty="No sessions in this period."
          />
          <h2 style={{ marginTop: "1.25rem" }}>New vs returning</h2>
          <div className="split-bar" aria-label="New vs returning users">
            <span style={{ width: `${((nvr.new ?? 0) / nvrTotal) * 100}%` }} />
          </div>
          <p className="muted" style={{ margin: "0.4rem 0 0" }}>
            New {fmtNum(nvr.new ?? 0)} ({fmtNum(((nvr.new ?? 0) / nvrTotal) * 100)}%), returning{" "}
            {fmtNum(nvr.returning ?? 0)} ({fmtNum(((nvr.returning ?? 0) / nvrTotal) * 100)}%)
          </p>
        </section>
      </div>

      <div className="admin-grid">
        <section className="panel" aria-labelledby="pages">
          <h2 id="pages">Top pages</h2>
          {data.pages.length === 0 ? (
            <p className="empty">No pageviews in this period.</p>
          ) : (
            <div className="table-scroll" style={{ border: 0 }}>
              <table className="orders mini">
                <thead>
                  <tr>
                    <th scope="col">Page</th>
                    <th scope="col" className="num">
                      Views
                    </th>
                    <th scope="col" className="num">
                      Users
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="panel" aria-labelledby="countries">
          <h2 id="countries">Top countries</h2>
          <BarList items={data.countries} label={(k) => k} showRevenue={false} unit={["user", "users"]} empty="No data." />
        </section>
      </div>

      <div className="admin-grid is-detail">
        <section className="panel" aria-labelledby="sources">
          <h2 id="sources">Top sources</h2>
          {data.sources.length === 0 ? (
            <p className="empty">No data.</p>
          ) : (
            <ul className="simple-list">
              {data.sources.map((s) => (
                <li key={s.source + s.medium}>
                  <span>
                    {s.source}
                    <span className="sub">{s.medium}</span>
                  </span>
                  <strong className="tabular">{fmtNum(s.sessions)}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="panel" aria-labelledby="landing">
          <h2 id="landing">Top landing pages</h2>
          {data.landing.length === 0 ? (
            <p className="empty">No data.</p>
          ) : (
            <ul className="simple-list">
              {data.landing.map((s) => (
                <li key={s.path}>
                  <span>
                    {s.path}
                    <span className="sub">Engagement {percent(s.engagement)}</span>
                  </span>
                  <strong className="tabular">{fmtNum(s.sessions)}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="muted" style={{ fontSize: "0.8125rem" }}>
        Data from Google Analytics 4 ({gaTrackingId || "tracking ID not set"}), refreshed every 10 minutes (today: every
        2 minutes). Numbers can differ slightly from Google Analytics because of sampling and data processing delays.
      </p>
    </>
  );
}
