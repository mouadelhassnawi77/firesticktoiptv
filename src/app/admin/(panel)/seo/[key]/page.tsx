import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { brandSuffix, effectiveSeo, isSeoKey, otherKeywords, seoPages } from "@/lib/seo-pages";
import { fetchPageContent, listOverrides } from "@/lib/seo-store";
import { site } from "@/lib/site";
import SeoEditor from "@/components/admin/SeoEditor";
import { fmtDateTime } from "@/components/admin/ui";

type Params = { key: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { key } = await params;
  return { title: isSeoKey(key) ? `SEO: ${seoPages[key].label}` : "SEO" };
}

export default async function SeoEditPage({ params }: { params: Promise<Params> }) {
  const { key } = await params;
  if (!isSeoKey(key)) notFound();
  const page = seoPages[key];

  const [overrides, fetched] = await Promise.all([listOverrides(), fetchPageContent(page.path)]);
  const o = overrides.get(page.path) ?? null;
  const seo = effectiveSeo(page, o);
  const def = effectiveSeo(page, null);

  const values = (s: typeof seo) => ({
    title: s.title,
    description: s.description,
    keyword: s.keyword,
    secondary: s.secondary.join(", "),
    canonical: s.canonical,
    index: s.index,
    follow: s.follow,
    absoluteTitle: s.absoluteTitle,
    // Empty = same as the SEO title/description
    ogTitle: s.ogTitle === s.title ? "" : s.ogTitle,
    ogDescription: s.ogDescription === s.description ? "" : s.ogDescription,
  });

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="crumb">
            <Link href="/admin/seo">SEO</Link> / {page.label}
          </p>
          <h1>{page.label}</h1>
          <p className="page-sub">
            <a href={page.path} target="_blank" rel="noopener">
              {page.path} ↗
            </a>
            {o?.updated_at ? `, last edited ${fmtDateTime(o.updated_at)}` : ", using the defaults from the code"}
          </p>
        </div>
      </div>

      <SeoEditor
        pageKey={key}
        path={page.path}
        siteUrl={site.url}
        siteName={site.name}
        brandSuffix={brandSuffix}
        defaults={values(def)}
        initial={values(seo)}
        content={fetched.content}
        contentError={fetched.error}
        otherKeywords={otherKeywords(page.path, overrides)}
      />
    </>
  );
}
