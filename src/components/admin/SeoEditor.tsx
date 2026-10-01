"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  analyzeSeo,
  countPhrase,
  DESC_RANGE,
  GROUP_LABELS,
  TITLE_RANGE,
  type CheckGroup,
  type PageContent,
} from "@/lib/seo-analysis";
import { saveSeoAction, type SeoFormState } from "@/app/admin/seo-actions";
import { SeoSignal, scoreToneLabel } from "./seo-ui";
import { SubmitButton } from "./SeoForms";

type Values = {
  title: string;
  description: string;
  keyword: string;
  secondary: string;
  canonical: string;
  index: boolean;
  follow: boolean;
  absoluteTitle: boolean;
  ogTitle: string;
  ogDescription: string;
};

export type SeoEditorProps = {
  pageKey: string;
  path: string;
  siteUrl: string;
  siteName: string;
  brandSuffix: string;
  defaults: Values;
  initial: Values;
  content: PageContent | null;
  contentError?: string;
  otherKeywords: { keyword: string; label: string }[];
};

const GROUPS: CheckGroup[] = ["basic", "additional", "title", "readability"];

/** Length meter: the green band is the range Google shows in full */
function LengthMeter({ value, min, max, hard }: { value: number; min: number; max: number; hard: number }) {
  const pct = (n: number) => `${Math.min(100, (n / hard) * 100)}%`;
  const tone = value >= min && value <= max ? "good" : value > max * 1.15 || value < min * 0.6 ? "bad" : "ok";
  return (
    <span className="meter" aria-hidden="true">
      <span className="meter-band" style={{ left: pct(min), width: `calc(${pct(max)} - ${pct(min)})` }} />
      <span className={`meter-fill is-${tone}`} style={{ width: pct(value) }} />
    </span>
  );
}

const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** Google bolds the words of the search query in the snippet; we bold the focus keyword the same way */
function Bolded({ text, keyword }: { text: string; keyword: string }) {
  const k = keyword.trim();
  if (!k) return <>{text}</>;
  const re = new RegExp(`(${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return (
    <>
      {text.split(re).map((part, i) => (i % 2 ? <b key={i}>{part}</b> : part))}
    </>
  );
}

export default function SeoEditor(props: SeoEditorProps) {
  const { defaults, initial, content } = props;
  const [v, setV] = useState<Values>(initial);
  const [saved, setSaved] = useState<Values>(initial);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [state, action] = useActionState<SeoFormState, FormData>(saveSeoAction, undefined);

  useEffect(() => {
    if (state?.ok) setSaved(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.savedAt]);

  const set = <K extends keyof Values>(k: K, value: Values[K]) => setV((s) => ({ ...s, [k]: value }));
  const differs = (a: Values, b: Values) => (Object.keys(a) as (keyof Values)[]).some((k) => a[k] !== b[k]);
  const dirty = differs(v, saved);
  const atDefaults = !differs(v, defaults);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  const fullTitle = v.absoluteTitle ? v.title : `${v.title}${props.brandSuffix}`;
  const secondary = v.secondary
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const result = useMemo(
    () =>
      analyzeSeo({
        path: props.path,
        fullTitle,
        description: v.description,
        keyword: v.keyword,
        secondary,
        otherKeywords: props.otherKeywords,
        content,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fullTitle, v.description, v.keyword, v.secondary, content],
  );

  const host = props.siteUrl.replace(/^https?:\/\//, "");
  const crumbs = props.path === "/" ? "" : ` › ${props.path.slice(1).split("/").join(" › ")}`;
  const problems = (g: CheckGroup) => result.checks.filter((c) => c.group === g && (c.status === "bad" || c.status === "warn")).length;

  return (
    <div className="seo-editor">
      <form action={action} className="seo-form">
        <input type="hidden" name="key" value={props.pageKey} />

        <section className="panel serp-panel" aria-labelledby="serp-title">
          <div className="panel-head">
            <h2 id="serp-title">Google preview</h2>
            <div className="seg" role="group" aria-label="Preview device">
              {(["desktop", "mobile"] as const).map((d) => (
                <button key={d} type="button" aria-pressed={device === d} onClick={() => setDevice(d)}>
                  {d === "desktop" ? "Desktop" : "Mobile"}
                </button>
              ))}
            </div>
          </div>
          <div className={`serp is-${device}`}>
            <div className="serp-site">
              <span className="serp-fav" aria-hidden="true">
                {props.siteName.slice(0, 1)}
              </span>
              <span>
                <span className="serp-name">{props.siteName}</span>
                <span className="serp-url">
                  {host}
                  {crumbs}
                </span>
              </span>
            </div>
            <p className="serp-title">{cut(fullTitle, device === "desktop" ? 61 : 70) || "Add an SEO title"}</p>
            <p className="serp-desc">
              <Bolded text={cut(v.description, device === "desktop" ? 158 : 120) || "Add a meta description."} keyword={v.keyword} />
            </p>
          </div>
          {!v.index && <p className="serp-off">This page is set to noindex, so it won’t appear in Google at all.</p>}
        </section>

        <section className="panel" aria-labelledby="kw-title">
          <h2 id="kw-title" className="panel-title">
            Focus keyword
          </h2>
          <label className="seo-field">
            <span>The search term this page should rank for</span>
            <input
              name="keyword"
              value={v.keyword}
              onChange={(e) => set("keyword", e.target.value)}
              placeholder="e.g. iptv for firestick"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          {v.keyword.trim() !== defaults.keyword && defaults.keyword && (
            <p className="seo-help">
              Silo plan keyword: <strong>{defaults.keyword}</strong>.{" "}
              <button type="button" className="linkish" onClick={() => set("keyword", defaults.keyword)}>
                Use it
              </button>
            </p>
          )}
          <label className="seo-field">
            <span>Secondary keywords, separated by commas</span>
            <input
              name="secondary"
              value={v.secondary}
              onChange={(e) => set("secondary", e.target.value)}
              placeholder="iptv usa, iptv providers"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          {result.secondary.length > 0 && (
            <ul className="kw-chips" aria-label="Secondary keywords found in the content">
              {result.secondary.map((s) => (
                <li key={s.keyword} className={s.found ? "is-found" : "is-missing"}>
                  {s.keyword}
                  <span>{content ? (s.found ? `${s.found}×` : "not in content") : "–"}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel" aria-labelledby="meta-title">
          <h2 id="meta-title" className="panel-title">
            Title and description
          </h2>

          <label className="seo-field">
            <span className="field-top">
              SEO title
              <em className="tabular">
                {fullTitle.length} / {TITLE_RANGE.max}
              </em>
            </span>
            <input name="title" value={v.title} onChange={(e) => set("title", e.target.value)} required maxLength={200} />
            <LengthMeter value={fullTitle.length} min={TITLE_RANGE.min} max={TITLE_RANGE.max} hard={80} />
          </label>
          <label className="check">
            <input
              type="checkbox"
              name="absolute_title"
              checked={v.absoluteTitle}
              onChange={(e) => set("absoluteTitle", e.target.checked)}
            />
            <span>
              Don’t add “{props.brandSuffix.replace(/^ \| /, "| ")}” after the title
            </span>
          </label>
          {v.title !== defaults.title && (
            <p className="seo-help">
              Default: {defaults.title}{" "}
              <button type="button" className="linkish" onClick={() => set("title", defaults.title)}>
                Restore
              </button>
            </p>
          )}

          <label className="seo-field">
            <span className="field-top">
              Meta description
              <em className="tabular">
                {v.description.length} / {DESC_RANGE.max}
              </em>
            </span>
            <textarea
              name="description"
              value={v.description}
              onChange={(e) => set("description", e.target.value)}
              required
              rows={3}
              maxLength={400}
            />
            <LengthMeter value={v.description.length} min={DESC_RANGE.min} max={DESC_RANGE.max} hard={200} />
          </label>
          {v.description !== defaults.description && (
            <p className="seo-help">
              Default: {defaults.description}{" "}
              <button type="button" className="linkish" onClick={() => set("description", defaults.description)}>
                Restore
              </button>
            </p>
          )}
        </section>

        <details className="panel seo-details">
          <summary>
            <h2>Indexing and canonical</h2>
            <span className="sub">
              {v.index ? "Index" : "Noindex"}, {v.follow ? "follow" : "nofollow"}
              {v.canonical && v.canonical !== props.path ? ", custom canonical" : ""}
            </span>
          </summary>
          <fieldset className="seo-radios">
            <legend>Show this page in Google?</legend>
            <label>
              <input type="radio" name="robots_index" value="index" checked={v.index} onChange={() => set("index", true)} />
              Yes, index it
            </label>
            <label>
              <input type="radio" name="robots_index" value="noindex" checked={!v.index} onChange={() => set("index", false)} />
              No (noindex), and leave it out of the sitemap
            </label>
          </fieldset>
          <fieldset className="seo-radios">
            <legend>Follow the links on this page?</legend>
            <label>
              <input type="radio" name="robots_follow" value="follow" checked={v.follow} onChange={() => set("follow", true)} />
              Yes (recommended)
            </label>
            <label>
              <input
                type="radio"
                name="robots_follow"
                value="nofollow"
                checked={!v.follow}
                onChange={() => set("follow", false)}
              />
              No (nofollow)
            </label>
          </fieldset>
          <label className="seo-field">
            <span>Canonical URL</span>
            <input
              name="canonical"
              value={v.canonical}
              onChange={(e) => set("canonical", e.target.value)}
              placeholder={props.path}
              spellCheck={false}
            />
          </label>
          <p className="seo-help">Leave it as {props.path} unless the same content also lives at another URL.</p>
        </details>

        <details className="panel seo-details">
          <summary>
            <h2>Social sharing</h2>
            <span className="sub">How the link looks on Facebook, WhatsApp and X</span>
          </summary>
          <div className="social-card" aria-hidden="true">
            <span className="social-img">{props.siteName}</span>
            <span className="social-body">
              <span className="social-host">{host.toUpperCase()}</span>
              <strong>{cut(v.ogTitle || v.title, 88)}</strong>
              <span>{cut(v.ogDescription || v.description, 110)}</span>
            </span>
          </div>
          <label className="seo-field">
            <span>Social title</span>
            <input name="og_title" value={v.ogTitle} onChange={(e) => set("ogTitle", e.target.value)} placeholder={v.title} />
          </label>
          <label className="seo-field">
            <span>Social description</span>
            <textarea
              name="og_description"
              value={v.ogDescription}
              onChange={(e) => set("ogDescription", e.target.value)}
              placeholder={v.description}
              rows={2}
            />
          </label>
          <p className="seo-help">Empty fields use the SEO title and description.</p>
        </details>

        <div className="save-bar">
          <span className="save-score">
            <SeoSignal score={result.score} />
          </span>
          <SubmitButton pending="Saving and re-analyzing…">Save changes</SubmitButton>
          {!atDefaults && (
            <button type="button" className="btn btn-ghost" onClick={() => setV(defaults)}>
              Restore all defaults
            </button>
          )}
          <p role="status" aria-live="polite" className={state?.error ? "form-error" : dirty ? "save-note" : "form-ok"}>
            {state?.error ?? (dirty ? "Unsaved changes" : state?.ok ?? "")}
          </p>
        </div>
      </form>

      <aside className="seo-side" aria-label="SEO analysis">
        <section className="panel score-panel">
          <div className="score-top">
            <SeoSignal score={result.score} size="lg" />
            <p>
              <strong>{scoreToneLabel(result.score)}</strong>
              <span className="sub">
                {v.keyword.trim() ? <>for “{v.keyword.trim()}”</> : "Set a focus keyword for a real score"}
              </span>
            </p>
          </div>
          {props.contentError && (
            <p className="form-error small">
              {props.contentError} Checks that need the page content count as failed.
            </p>
          )}
          {GROUPS.map((g) => {
            const list = result.checks.filter((c) => c.group === g);
            const n = problems(g);
            return (
              <details key={g} className="check-group" open={g === "basic" || n > 0}>
                <summary>
                  {GROUP_LABELS[g]}
                  <span className={`check-count ${n ? "is-bad" : "is-good"}`}>{n ? `${n} to fix` : "All good"}</span>
                </summary>
                <ul className="checks">
                  {list.map((c) => (
                    <li key={c.id} className={`is-${c.status}`}>
                      <span className="check-icon" aria-hidden="true" />
                      <span>
                        <span className="visually-hidden">
                          {c.status === "good" ? "Passed: " : c.status === "warn" ? "Could be better: " : c.status === "na" ? "Not applicable: " : "Failed: "}
                        </span>
                        {c.label}
                        {c.hint && c.status !== "good" && <span className="check-hint">{c.hint}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </section>

        {content && (
          <section className="panel content-panel" aria-labelledby="content-title">
            <h2 id="content-title" className="panel-title">
              Page content
            </h2>
            <dl className="content-stats">
              <div>
                <dt>Words</dt>
                <dd className="tabular">{content.words.toLocaleString("en-US")}</dd>
              </div>
              <div>
                <dt>Keyword uses</dt>
                <dd className="tabular">{result.stats.occurrences}</dd>
              </div>
              <div>
                <dt>Density</dt>
                <dd className="tabular">{result.stats.density.toFixed(2)}%</dd>
              </div>
              <div>
                <dt>Links in / out</dt>
                <dd className="tabular">
                  {result.stats.internal} / {result.stats.external}
                </dd>
              </div>
            </dl>
            <h3 className="outline-title">Headings</h3>
            <ol className="outline">
              {content.headings.slice(0, 40).map((h, i) => {
                const hit = v.keyword.trim() && countPhrase(h.text, v.keyword) > 0;
                return (
                  <li key={i} className={`lv-${h.level}${hit ? " has-kw" : ""}`}>
                    <span className="lv">H{h.level}</span>
                    {h.text}
                  </li>
                );
              })}
            </ol>
            <p className="seo-help">
              The text of the page itself lives in the code. Ask for content changes and they ship with the next deploy.
            </p>
          </section>
        )}
      </aside>
    </div>
  );
}

