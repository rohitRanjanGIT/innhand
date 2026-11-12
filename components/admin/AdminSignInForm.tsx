"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient, GENERIC_SIGN_IN_ERROR } from "@/lib/auth-client";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { Card, CardContent } from "@/components/admin/ui/card";

export default function AdminSignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState(params.get("denied") ? "This account is not an admin." : "");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError("");
    const { error } = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setPending(false);
    if (error) {
      setError(error.status === 429 ? "Too many attempts. Wait a minute and try again." : GENERIC_SIGN_IN_ERROR);
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
          <p className="text-xs text-muted-foreground">
            First time? Create the account on the shop&apos;s <a className="underline" href="/sign-up">sign-up page</a>{" "}
            with an email listed in ADMIN_EMAILS, verify it, then sign in here.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
