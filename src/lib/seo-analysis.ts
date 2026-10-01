/**
 * SEO analysis in the style of Rank Math: the same groups of checks (basic SEO, additional,
 * title readability, content readability) and a 0–100 score.
 * Pure functions with no server imports: the editor runs them live in the browser while you type,
 * the server runs the same code when you save or analyze all pages, so both always agree.
 */

export type PageContent = {
  /** Text of <main>, scripts and styles removed */
  text: string;
  words: number;
  headings: { level: number; text: string }[];
  paragraphs: string[];
  links: { href: string; text: string; internal: boolean; nofollow: boolean }[];
  images: { src: string; alt: string }[];
  videos: number;
};

/* ---------- HTML → content ---------- */

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  hellip: "…",
  copy: "©",
  reg: "®",
  trade: "™",
};

export function decodeEntities(s: string) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

const BLOCK = /<\/?(p|div|section|article|header|footer|nav|aside|main|li|ul|ol|dl|dt|dd|h[1-6]|br|tr|td|th|table|figure|figcaption|blockquote|details|summary|button|label)\b[^>]*>/gi;

const stripTags = (html: string) =>
  decodeEntities(html.replace(BLOCK, " ").replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();

const attr = (tag: string, name: string) => {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m ? decodeEntities(m[2] ?? m[3] ?? m[4] ?? "") : null;
};

export const countWords = (text: string) => (text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []).length;

/** Reads the rendered page HTML (React output) and keeps what matters for SEO */
export function extractContent(html: string, siteOrigin: string): PageContent {
  const main = html.match(/<main\b[^>]*>([\s\S]*)<\/main>/i)?.[1] ?? html.match(/<body\b[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? html;
  const clean = main
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|noscript|template|svg)\b[\s\S]*?<\/\1>/gi, " ");

  const headings = [...clean.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)]
    .map((m) => ({ level: Number(m[1]), text: stripTags(m[2]) }))
    .filter((h) => h.text);

  const paragraphs = [...clean.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => stripTags(m[1])).filter(Boolean);

  let host = "";
  try {
    host = new URL(siteOrigin).hostname.replace(/^www\./, "");
  } catch {}
  const links = [...clean.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)]
    .map((m) => {
      const href = attr(m[1], "href") ?? "";
      const rel = (attr(m[1], "rel") ?? "").toLowerCase();
      let internal = href.startsWith("/") || href.startsWith("#");
      if (/^https?:\/\//i.test(href)) {
        try {
          internal = new URL(href).hostname.replace(/^www\./, "") === host;
        } catch {}
      }
      return { href, text: stripTags(m[2]), internal, nofollow: /nofollow|sponsored|ugc/.test(rel) };
    })
    // WhatsApp, mail and phone links are contact buttons, not links to resources
    .filter((l) => l.href && !/^(mailto:|tel:|javascript:)/i.test(l.href) && !/wa\.me|whatsapp\.com/i.test(l.href));

  const images = [...clean.matchAll(/<img\b[^>]*>/gi)].map((m) => ({
    src: attr(m[0], "src") ?? "",
    alt: attr(m[0], "alt") ?? "",
  }));
  const videos = (clean.match(/<(video|iframe)\b/gi) ?? []).length;

  const text = stripTags(clean);
  return { text, words: countWords(text), headings, paragraphs, links, images, videos };
}

/* ---------- Checks ---------- */

export type CheckStatus = "good" | "warn" | "bad" | "na";
export type CheckGroup = "basic" | "additional" | "title" | "readability";

export type SeoCheck = {
  id: string;
  group: CheckGroup;
  status: CheckStatus;
  label: string;
  /** What to do about it, plain words */
  hint?: string;
  weight: number;
  earned: number;
};

export type SeoInput = {
  path: string;
  /** The title as Google shows it (with brand suffix) */
  fullTitle: string;
  description: string;
  keyword: string;
  secondary: string[];
  /** Focus keywords of the other pages, to catch two pages fighting over one keyword */
  otherKeywords: { keyword: string; label: string }[];
  content: PageContent | null;
};

export type SeoResult = {
  score: number;
  checks: SeoCheck[];
  stats: { words: number; density: number; occurrences: number; internal: number; external: number };
  secondary: { keyword: string; found: number }[];
};

export const GROUP_LABELS: Record<CheckGroup, string> = {
  basic: "Basic SEO",
  additional: "Additional",
  title: "Title & description",
  readability: "Content readability",
};

export const TITLE_RANGE = { min: 30, max: 60 } as const;
export const DESC_RANGE = { min: 120, max: 160 } as const;

const POWER_WORDS = new Set(
  (
    "free best ultimate proven easy instant instantly guaranteed exclusive new top fast faster simple complete " +
    "essential premium official unlimited save cheap affordable reliable secret amazing powerful quick quickly " +
    "trusted today now discover proven-way stunning crystal-clear smooth legal safe secure risk-free bonus " +
    "effortless incredible massive huge breakthrough insider expert ultimate-guide step-by-step tested real " +
    "no-contract instant-access lifetime hassle-free fastest easiest cheapest biggest ultra 4k hd live"
  ).split(" "),
);

export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘`]/g, "'")
    .replace(/[^\p{L}\p{N}'+]+/gu, " ")
    .trim();

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Whole-phrase matches of the keyword in a text (case, accents and punctuation ignored) */
export function countPhrase(text: string, keyword: string) {
  const k = normalize(keyword);
  if (!k) return 0;
  const re = new RegExp(`(?:^| )${escapeRe(k)}(?= |$)`, "g");
  return (` ${normalize(text)} `.match(re) ?? []).length;
}
const hasPhrase = (text: string, keyword: string) => countPhrase(text, keyword) > 0;

const STOP = new Set(["a", "an", "the", "for", "on", "in", "of", "to", "and", "or", "with", "at", "by", "from", "is", "my", "your"]);
const contentWords = (s: string) => normalize(s).split(" ").filter((w) => w && !STOP.has(w));

export function analyzeSeo(input: SeoInput): SeoResult {
  const checks: SeoCheck[] = [];
  const kw = normalize(input.keyword);
  const c = input.content;
  const noKw = "Set a focus keyword to run this check.";
  const noContent = "The page content couldn't be loaded.";

  const add = (
    id: string,
    group: CheckGroup,
    weight: number,
    status: CheckStatus,
    label: string,
    hint?: string,
  ) => {
    const earned = status === "good" ? weight : status === "warn" ? weight / 2 : 0;
    checks.push({ id, group, weight, status, label, hint, earned: status === "na" ? 0 : earned });
  };

  const occurrences = c && kw ? countPhrase(c.text, kw) : 0;
  const density = c && c.words ? (occurrences / c.words) * 100 : 0;
  const internal = c ? c.links.filter((l) => l.internal).length : 0;
  const externalLinks = c ? c.links.filter((l) => !l.internal) : [];

  /* Basic SEO */
  if (!kw) add("kw-title", "basic", 8, "bad", "Focus keyword in the SEO title", noKw);
  else if (hasPhrase(input.fullTitle, kw)) add("kw-title", "basic", 8, "good", "Focus keyword is in the SEO title");
  else add("kw-title", "basic", 8, "bad", "Focus keyword is missing from the SEO title", `Work “${input.keyword}” into the title.`);

  if (!kw) add("kw-desc", "basic", 6, "bad", "Focus keyword in the meta description", noKw);
  else if (hasPhrase(input.description, kw)) add("kw-desc", "basic", 6, "good", "Focus keyword is in the meta description");
  else add("kw-desc", "basic", 6, "bad", "Focus keyword is missing from the meta description", "Use it once, early in the description.");

  if (input.path === "/") {
    add("kw-url", "basic", 5, "na", "Keyword in the URL doesn’t apply to the homepage");
  } else if (!kw) {
    add("kw-url", "basic", 5, "bad", "Focus keyword in the URL", noKw);
  } else {
    const slug = normalize(input.path.replace(/[-/_]+/g, " "));
    const words = contentWords(kw);
    const inSlug = words.filter((w) => ` ${slug} `.includes(` ${w} `)).length;
    if (` ${slug} `.includes(` ${kw} `) || (words.length > 0 && inSlug === words.length)) {
      add("kw-url", "basic", 5, "good", "Focus keyword is in the URL");
    } else if (inSlug > 0) {
      add("kw-url", "basic", 5, "warn", "Only part of the focus keyword is in the URL", "Changing a live URL needs a redirect. Only do it on new pages.");
    } else {
      add("kw-url", "basic", 5, "bad", "Focus keyword is not in the URL", "Changing a live URL needs a redirect. Only do it on new pages.");
    }
  }

  if (!kw) add("kw-start", "basic", 6, "bad", "Focus keyword at the start of the content", noKw);
  else if (!c) add("kw-start", "basic", 6, "bad", "Focus keyword at the start of the content", noContent);
  else {
    const words = c.text.split(" ");
    const head = words.slice(0, Math.max(60, Math.ceil(words.length * 0.1))).join(" ");
    if (hasPhrase(head, kw)) add("kw-start", "basic", 6, "good", "Focus keyword appears in the first 10% of the content");
    else add("kw-start", "basic", 6, "bad", "Focus keyword doesn’t appear in the first 10% of the content", "Use it in the H1 or the first paragraph.");
  }

  if (!kw) add("kw-content", "basic", 6, "bad", "Focus keyword in the content", noKw);
  else if (!c) add("kw-content", "basic", 6, "bad", "Focus keyword in the content", noContent);
  else if (occurrences > 0) add("kw-content", "basic", 6, "good", `Focus keyword appears ${occurrences} time${occurrences === 1 ? "" : "s"} in the content`);
  else add("kw-content", "basic", 6, "bad", "Focus keyword doesn’t appear in the content");

  if (!c) add("length", "basic", 8, "bad", "Content length", noContent);
  else if (c.words >= 1000) add("length", "basic", 8, "good", `Content is ${c.words.toLocaleString("en-US")} words long`);
  else if (c.words >= 600) add("length", "basic", 8, "warn", `Content is ${c.words.toLocaleString("en-US")} words long`, "Pages that rank for competitive terms usually have 1,000+ words.");
  else add("length", "basic", 8, "bad", `Content is only ${c.words.toLocaleString("en-US")} words long`, "Aim for at least 600 words, 1,000+ for main pages.");

  if (!c) add("h1", "basic", 6, "bad", "H1 heading", noContent);
  else {
    const h1 = c.headings.filter((h) => h.level === 1);
    if (h1.length === 0) add("h1", "basic", 6, "bad", "The page has no H1 heading");
    else if (h1.length > 1) add("h1", "basic", 6, "warn", `The page has ${h1.length} H1 headings`, "Keep exactly one H1.");
    else if (!kw) add("h1", "basic", 6, "warn", "The page has one H1", noKw);
    else if (hasPhrase(h1[0].text, kw)) add("h1", "basic", 6, "good", "The H1 contains the focus keyword");
    else add("h1", "basic", 6, "bad", "The H1 doesn’t contain the focus keyword", `H1 now: “${h1[0].text}”`);
  }

  /* Additional */
  if (!kw) add("kw-sub", "additional", 5, "bad", "Focus keyword in subheadings", noKw);
  else if (!c) add("kw-sub", "additional", 5, "bad", "Focus keyword in subheadings", noContent);
  else {
    const subs = c.headings.filter((h) => h.level >= 2 && h.level <= 4);
    const n = subs.filter((h) => hasPhrase(h.text, kw)).length;
    if (n > 0) add("kw-sub", "additional", 5, "good", `Focus keyword is in ${n} subheading${n === 1 ? "" : "s"} (H2–H4)`);
    else add("kw-sub", "additional", 5, "bad", "Focus keyword isn’t in any subheading (H2–H4)", "Use it in at least one H2.");
  }

  if (!kw) add("kw-alt", "additional", 4, "bad", "Focus keyword in image alt text", noKw);
  else if (!c) add("kw-alt", "additional", 4, "bad", "Focus keyword in image alt text", noContent);
  else if (c.images.length === 0) add("kw-alt", "additional", 4, "bad", "The content has no images", "Add an image with the focus keyword in its alt text.");
  else if (c.images.some((i) => hasPhrase(i.alt, kw))) add("kw-alt", "additional", 4, "good", "An image has the focus keyword in its alt text");
  else add("kw-alt", "additional", 4, "bad", "No image has the focus keyword in its alt text");

  if (!kw) add("density", "additional", 6, "bad", "Keyword density", noKw);
  else if (!c) add("density", "additional", 6, "bad", "Keyword density", noContent);
  else {
    const d = density.toFixed(2);
    if (density >= 0.5 && density <= 2.5) add("density", "additional", 6, "good", `Keyword density is ${d}%`);
    else if (density > 2.5 && density <= 3.5) add("density", "additional", 6, "warn", `Keyword density is ${d}%`, "A bit high. Swap some uses for variations.");
    else if (density > 3.5) add("density", "additional", 6, "bad", `Keyword density is ${d}%, that looks like keyword stuffing`, "Aim for 0.5–2.5%.");
    else if (density >= 0.3) add("density", "additional", 6, "warn", `Keyword density is ${d}%`, "A little low. Aim for 0.5–2.5%.");
    else add("density", "additional", 6, "bad", `Keyword density is ${d}%`, "Too low. Aim for 0.5–2.5%.");
  }

  if (input.path.length <= 75) add("url-length", "additional", 3, "good", `URL is ${input.path.length} characters long`);
  else add("url-length", "additional", 3, "warn", `URL is ${input.path.length} characters long`, "Short URLs (under 75 characters) are easier to rank and share.");

  if (!c) add("internal", "additional", 4, "bad", "Internal links", noContent);
  else if (internal >= 3) add("internal", "additional", 4, "good", `${internal} internal links in the content`);
  else if (internal > 0) add("internal", "additional", 4, "warn", `Only ${internal} internal link${internal === 1 ? "" : "s"} in the content`, "Link to at least 3 related pages.");
  else add("internal", "additional", 4, "bad", "No internal links in the content", "Link to related pages on your site.");

  if (!c) add("external", "additional", 2, "bad", "External links", noContent);
  else if (externalLinks.some((l) => !l.nofollow)) add("external", "additional", 2, "good", "The content links to an outside resource");
  else if (externalLinks.length) add("external", "additional", 2, "warn", "External links are all nofollow");
  else add("external", "additional", 2, "warn", "No links to outside resources", "Optional: link to a useful source (app store page, speed test).");

  if (!kw) add("unique", "additional", 6, "bad", "Focus keyword not used on another page", noKw);
  else {
    const clash = input.otherKeywords.find((o) => normalize(o.keyword) === kw);
    if (clash) add("unique", "additional", 6, "bad", `“${clash.label}” already uses this focus keyword`, "Two pages on one keyword compete with each other. Pick another.");
    else add("unique", "additional", 6, "good", "No other page uses this focus keyword");
  }

  /* Title & description */
  const t = input.fullTitle;
  if (!kw) add("kw-title-start", "title", 4, "bad", "Focus keyword near the start of the title", noKw);
  else {
    const pos = normalize(t).indexOf(kw);
    if (pos === -1) add("kw-title-start", "title", 4, "bad", "Focus keyword isn’t in the title");
    else if (pos <= normalize(t).length * 0.25) add("kw-title-start", "title", 4, "good", "Focus keyword is at the start of the title");
    else if (pos <= normalize(t).length * 0.5) add("kw-title-start", "title", 4, "warn", "Focus keyword is in the first half of the title", "Move it to the start.");
    else add("kw-title-start", "title", 4, "bad", "Focus keyword is near the end of the title", "Move it to the start.");
  }

  if (t.length >= TITLE_RANGE.min && t.length <= TITLE_RANGE.max) add("title-length", "title", 4, "good", `Title is ${t.length} characters`);
  else if (t.length > TITLE_RANGE.max && t.length <= 70) add("title-length", "title", 4, "warn", `Title is ${t.length} characters`, `Google cuts titles at about ${TITLE_RANGE.max}.`);
  else if (t.length > 70) add("title-length", "title", 4, "bad", `Title is ${t.length} characters`, `Google cuts titles at about ${TITLE_RANGE.max}. Shorten it.`);
  else add("title-length", "title", 4, "warn", `Title is only ${t.length} characters`, `Use ${TITLE_RANGE.min}–${TITLE_RANGE.max}.`);

  const dl = input.description.length;
  if (dl >= DESC_RANGE.min && dl <= DESC_RANGE.max) add("desc-length", "title", 4, "good", `Description is ${dl} characters`);
  else if (dl > DESC_RANGE.max) add("desc-length", "title", 4, dl <= 180 ? "warn" : "bad", `Description is ${dl} characters`, `Google cuts it at about ${DESC_RANGE.max}.`);
  else if (dl >= 70) add("desc-length", "title", 4, "warn", `Description is only ${dl} characters`, `Use ${DESC_RANGE.min}–${DESC_RANGE.max}.`);
  else add("desc-length", "title", 4, "bad", dl ? `Description is only ${dl} characters` : "There is no meta description", `Use ${DESC_RANGE.min}–${DESC_RANGE.max}.`);

  const titleWords = normalize(t).split(" ");
  const power = titleWords.find((w) => POWER_WORDS.has(w));
  if (power) add("power", "title", 2, "good", `Title uses a power word (“${power}”)`);
  else add("power", "title", 2, "warn", "Title has no power word", "Words like free, best, instant or official raise clicks.");

  if (/\d/.test(t)) add("number", "title", 1, "good", "Title contains a number");
  else add("number", "title", 1, "warn", "Title has no number", "Numbers (prices, hours, channel counts) raise clicks.");

  /* Readability */
  if (!c) add("paragraphs", "readability", 5, "bad", "Paragraph length", noContent);
  else {
    const long = c.paragraphs.filter((p) => countWords(p) > 120).length;
    if (long === 0) add("paragraphs", "readability", 5, "good", "Paragraphs are short and easy to read");
    else add("paragraphs", "readability", 5, long === 1 ? "warn" : "bad", `${long} paragraph${long === 1 ? " is" : "s are"} longer than 120 words`, "Split them up.");
  }

  if (!c) add("media", "readability", 5, "bad", "Images or video", noContent);
  else if (c.images.length + c.videos >= 1) add("media", "readability", 5, "good", `The content has ${c.images.length + c.videos} image${c.images.length + c.videos === 1 ? "" : "s"} or video${c.images.length + c.videos === 1 ? "" : "s"}`);
  else add("media", "readability", 5, "bad", "The content has no images or video", "Pages with media keep visitors longer.");

  const possible = checks.filter((x) => x.status !== "na").reduce((s, x) => s + x.weight, 0);
  const earned = checks.reduce((s, x) => s + x.earned, 0);
  const score = possible ? Math.round((earned / possible) * 100) : 0;

  return {
    score,
    checks,
    stats: { words: c?.words ?? 0, density, occurrences, internal, external: externalLinks.length },
    secondary: input.secondary.map((k) => ({ keyword: k, found: c ? countPhrase(c.text, k) : 0 })),
  };
}

export type ScoreTone = "good" | "ok" | "bad" | "none";

/** Rank Math colors: 81+ green, 51–80 orange, 50 and below red */
export const scoreTone = (score: number | null | undefined): ScoreTone =>
  score == null ? "none" : score > 80 ? "good" : score > 50 ? "ok" : "bad";
