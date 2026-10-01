"use client";

import { useActionState, useState } from "react";
import { login, type LoginState } from "@/app/admin/actions";

export default function LoginForm({ twoFa }: { twoFa: boolean }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, undefined);
  const [show, setShow] = useState(false);
  const askCode = twoFa || state?.needsCode;

  return (
    <form action={action} className="login-form" autoComplete="on">
      <label htmlFor="username">Username</label>
      <input
        id="username"
        name="username"
        type="text"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        required
        autoFocus
      />

      <label htmlFor="password">Password</label>
      <div className="pw-field">
        <input id="password" name="password" type={show ? "text" : "password"} autoComplete="current-password" required />
        <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"}>
          {show ? "Hide" : "Show"}
        </button>
      </div>

      {askCode && (
        <>
          <label htmlFor="code">Code from your authenticator app</label>
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            pattern="[0-9 ]{6,7}"
            maxLength={7}
            autoComplete="one-time-code"
            placeholder="123 456"
            required
          />
        </>
      )}

      {state?.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" className="btn btn-primary login-submit" disabled={pending}>
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
