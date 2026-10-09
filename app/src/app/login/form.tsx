"use client";

import { useActionState } from "react";
import { login } from "./actions";
import { Button } from "@/components/ui";

export function LoginForm({ next }: { next: string }) {
  const [error, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <input name="password" type="password" autoFocus autoComplete="current-password" required className="h-11 w-full rounded-md border border-line bg-surface px-3" placeholder="Passcode" />
      {error && <p className="text-sm text-bad">{error}</p>}
      <Button variant="primary" className="w-full" disabled={pending}>{pending ? "Checking…" : "Sign in"}</Button>
    </form>
  );
}
