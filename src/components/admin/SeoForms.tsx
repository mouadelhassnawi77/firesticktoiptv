"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { addRedirectAction, type RedirectFormState } from "@/app/admin/seo-actions";

/** Submit button that shows what is happening while the server action runs */
export function SubmitButton({
  children,
  pending,
  className = "btn btn-primary",
  confirm,
  name,
  value,
}: {
  children: React.ReactNode;
  pending: string;
  className?: string;
  /** Asks before submitting (for destructive actions) */
  confirm?: string;
  name?: string;
  value?: string;
}) {
  const status = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={status.pending}
      name={name}
      value={value}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {status.pending ? pending : children}
    </button>
  );
}

export function RedirectForm({ from }: { from?: string }) {
  const [state, action] = useActionState<RedirectFormState, FormData>(addRedirectAction, undefined);
  const dest = useRef<HTMLInputElement>(null);
  // Controlled fields: what you typed stays after an error, and clears after a successful save
  const [source, setSource] = useState(from ?? "");
  const [destination, setDestination] = useState("");
  const [type, setType] = useState("permanent");

  useEffect(() => {
    if (state?.ok) {
      setSource("");
      setDestination("");
      setType("permanent");
    }
  }, [state?.savedAt, state?.ok]);

  // Coming from the 404 monitor: the old URL is filled in, so start with the new one
  useEffect(() => {
    if (from) dest.current?.focus();
  }, [from]);

  return (
    <form action={action} className="panel redirect-form" aria-labelledby="add-redirect">
      <h2 id="add-redirect">Add a redirect</h2>
      <div className="redirect-fields">
        <label className="seo-field">
          <span>Old URL</span>
          <input
            name="source"
            required
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="/old-page"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <label className="seo-field">
          <span>New URL</span>
          <input
            ref={dest}
            name="destination"
            required
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="/pricing or https://…"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <label className="seo-field">
          <span>Type</span>
          <select name="type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="permanent">Permanent (301/308)</option>
            <option value="temporary">Temporary (307)</option>
          </select>
        </label>
        <SubmitButton pending="Saving…">Save redirect</SubmitButton>
      </div>
      <p className="seo-help">
        Permanent: the page moved for good and its Google ranking moves with it (sent as 308, which Google treats exactly
        like 301). Temporary: the old URL stays in Google.
      </p>
      <p role="status" aria-live="polite" className={state?.error ? "form-error" : state?.ok ? "form-ok" : "visually-hidden"}>
        {state?.error ?? state?.ok ?? ""}
      </p>
    </form>
  );
}
