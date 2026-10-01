"use client";

import { useActionState } from "react";
import { disableTwoFa, enableTwoFa, type TwoFaState } from "@/app/admin/actions";

export function EnableTwoFa({ secret }: { secret: string }) {
  const [state, action, pending] = useActionState<TwoFaState, FormData>(enableTwoFa, undefined);
  if (state?.ok) return <p className="notice is-ok">{state.ok}</p>;
  return (
    <form action={action} className="twofa-form">
      <input type="hidden" name="secret" value={secret} />
      <label htmlFor="code-on">Code from the app</label>
      <input id="code-on" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder="123 456" required />
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Checking…" : "Turn on 2FA"}
      </button>
      {state?.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function DisableTwoFa() {
  const [state, action, pending] = useActionState<TwoFaState, FormData>(disableTwoFa, undefined);
  if (state?.ok) return <p className="notice">{state.ok}</p>;
  return (
    <form action={action} className="twofa-form">
      <label htmlFor="code-off">Current code from the app</label>
      <input id="code-off" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder="123 456" required />
      <button type="submit" className="btn btn-ghost btn-danger" disabled={pending}>
        {pending ? "Checking…" : "Turn off 2FA"}
      </button>
      {state?.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
