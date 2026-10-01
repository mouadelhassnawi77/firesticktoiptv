import type { Metadata } from "next";
import "./admin.css";
import "./analytics.css";
import "./shell.css";
import "./seo.css";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: { default: `Admin | ${site.name}`, template: `%s | Admin ${site.name}` },
  robots: { index: false, follow: false, nocache: true },
};

// The admin is in English
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin" lang="en">
      {children}
    </div>
  );
}
