"use client";

import { useRef } from "react";
import { updateStatus } from "@/app/admin/actions";

type Option = { id: string; label: string };

/** Change the status right in the table: saves on selection, no extra click. */
export default function StatusSelect({ id, status, options }: { id: string; status: string; options: Option[] }) {
  const form = useRef<HTMLFormElement>(null);
  return (
    <form ref={form} action={updateStatus} className="inline-form">
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={status}
        aria-label={`Status of ${id}`}
        onChange={() => form.current?.requestSubmit()}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit">OK</button>
      </noscript>
    </form>
  );
}
