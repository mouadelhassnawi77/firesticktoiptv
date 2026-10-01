"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { analyzeSeo } from "@/lib/seo-analysis";
import {
  effectiveSeo,
  isSeoKey,
  otherKeywords,
  seoPageList,
  seoPages,
  splitKeywords,
  type SeoOverride,
  type SeoPage,
} from "@/lib/seo-pages";
import {
  addRedirect,
  clear404,
  delete404,
  deleteRedirect,
  fetchPageContent,
  listOverrides,
  livePaths,
  normalizePath,
  saveOverride,
  saveScore,
  type OverrideInput,
} from "@/lib/seo-store";

async function requireAdmin() {
  if (!(await getSession())) redirect("/admin/login");
}

/** Rebuilds the public page (it is static) plus the sitemap, and refreshes the admin lists */
function refresh(path?: string) {
  if (path) revalidatePath(path);
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/seo", "layout");
}

async function scoreFor(page: SeoPage, o: Partial<SeoOverride> | null, overrides: Map<string, SeoOverride>) {
  const seo = effectiveSeo(page, o);
  const { content } = await fetchPageContent(page.path);
  if (!content) return null;
  return analyzeSeo({
    path: page.path,
    fullTitle: seo.fullTitle,
    description: seo.description,
    keyword: seo.keyword,
    secondary: seo.secondary,
    otherKeywords: otherKeywords(page.path, overrides),
    content,
  }).score;
}

export type SeoFormState = { ok?: string; error?: string; savedAt?: number } | undefined;

const text = (fd: FormData, name: string, max: number) =>
  String(fd.get(name) ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

/** Saves only what differs from the code default, so later code changes still reach untouched fields */
export async function saveSeoAction(_prev: SeoFormState, fd: FormData): Promise<SeoFormState> {
  await requireAdmin();
  const key = String(fd.get("key") ?? "");
  if (!isSeoKey(key)) return { error: "Unknown page." };
  const page = seoPages[key];

  const title = text(fd, "title", 200);
  const description = text(fd, "description", 400);
  const keyword = text(fd, "keyword", 100).toLowerCase();
  const secondary = splitKeywords(String(fd.get("secondary") ?? "")).join(", ");
  const canonicalRaw = text(fd, "canonical", 500);
  const index = fd.get("robots_index") !== "noindex";
  const follow = fd.get("robots_follow") !== "nofollow";
  const absolute = fd.get("absolute_title") === "on";
  const ogTitle = text(fd, "og_title", 200);
  const ogDescription = text(fd, "og_description", 400);

  if (!title) return { error: "The SEO title can’t be empty." };
  if (!description) return { error: "The meta description can’t be empty." };
  if (canonicalRaw && !/^(\/|https:\/\/)/.test(canonicalRaw)) {
    return { error: "The canonical URL must start with / or https://" };
  }

  const keep = <T>(value: T, def: T) => (value === def ? null : value);
  const o: OverrideInput = {
    title: keep(title, page.title),
    description: keep(description, page.description),
    keyword: keep(keyword, page.keyword),
    secondary: keep(secondary, page.secondary.join(", ")),
    canonical: canonicalRaw && canonicalRaw !== page.path ? canonicalRaw : null,
    robots_index: keep(index, !page.noindex),
    robots_follow: keep(follow, true),
    absolute_title: keep(absolute, Boolean(page.absoluteTitle)),
    og_title: ogTitle && ogTitle !== title ? ogTitle : null,
    og_description: ogDescription && ogDescription !== description ? ogDescription : null,
  };

  const overrides = await listOverrides();
  overrides.set(page.path, { ...o, path: page.path } as SeoOverride);
  const score = await scoreFor(page, o, overrides);
  await saveOverride(page.path, o, score);
  refresh(page.path);
  return { ok: "Saved. The page is updated for visitors and Google.", savedAt: Date.now() };
}

/** Fetches every page and stores a fresh score (4 at a time) */
export async function analyzeAllAction() {
  await requireAdmin();
  const overrides = await listOverrides();
  const queue = [...seoPageList];
  async function worker() {
    for (let page = queue.shift(); page; page = queue.shift()) {
      await saveScore(page.path, await scoreFor(page, overrides.get(page.path) ?? null, overrides));
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()]);
  refresh();
  redirect("/admin/seo?analyzed=1");
}

/* ---------- Redirects ---------- */

export type RedirectFormState = { ok?: string; error?: string; savedAt?: number } | undefined;

export async function addRedirectAction(_prev: RedirectFormState, fd: FormData): Promise<RedirectFormState> {
  await requireAdmin();
  const rawSource = text(fd, "source", 500);
  const rawDest = text(fd, "destination", 1000);
  const permanent = fd.get("type") !== "temporary";
  if (!rawSource || !rawDest) return { error: "Fill in both the old URL and the new URL." };

  const source = normalizePath(rawSource);
  if (source === "/") return { error: "The homepage can’t be redirected." };
  if (/^\/(admin|api|_next)(\/|$)/.test(source)) return { error: "Admin and system URLs can’t be redirected." };
  if (livePaths().has(source)) {
    return {
      error: `${source} is a live page, so visitors would never reach the redirect. Remove the page from the site first.`,
    };
  }

  let destination = rawDest;
  if (/^https?:\/\//i.test(rawDest)) {
    try {
      const u = new URL(rawDest);
      destination = u.toString();
    } catch {
      return { error: "The new URL isn’t a valid address." };
    }
  } else {
    destination = rawDest.startsWith("/") ? rawDest : `/${rawDest}`;
    if (normalizePath(destination) === source) return { error: "The old and new URL are the same." };
  }

  await addRedirect(source, destination, permanent);
  refresh();
  return { ok: `Redirect saved: ${source} now goes to ${destination}.`, savedAt: Date.now() };
}

export async function deleteRedirectAction(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  if (/^\d+$/.test(id)) await deleteRedirect(id);
  refresh();
}

/* ---------- 404 monitor ---------- */

export async function delete404Action(fd: FormData) {
  await requireAdmin();
  const path = String(fd.get("path") ?? "");
  if (path.startsWith("/")) await delete404(path);
  refresh();
}

export async function clear404Action(fd: FormData) {
  await requireAdmin();
  await clear404(fd.get("scope") === "probes");
  refresh();
}
