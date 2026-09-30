import Breadcrumbs from "./Breadcrumbs";

/** Frame for legal pages. The yellow note only shows locally (npm run dev), never live. */
export default function LegalPage({
  title,
  path,
  children,
}: {
  title: string;
  path: string;
  children: React.ReactNode;
}) {
  return (
    <div className="wrap" style={{ paddingBottom: "clamp(3rem, 7vw, 5rem)" }}>
      <div className="page-head" style={{ paddingInline: 0 }}>
        <Breadcrumbs items={[{ name: title, path }]} />
        <h1>{title}</h1>
      </div>
      {process.env.NODE_ENV !== "production" && (
        <p className="dev-note">
          Template: fill in your real details and have the text reviewed before going live.
        </p>
      )}
      <div className="prose">{children}</div>
    </div>
  );
}
