"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface BrandInviteFormProps {
  token: string;
  brandName: string;
  email: string;
  initialName: string;
}

export function BrandInviteForm({ token, brandName, email, initialName }: BrandInviteFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("De wachtwoorden komen niet overeen.");
      return;
    }

    setPending(true);
    const response = await fetch("/api/auth/brand-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, name, password }),
    });
    const body = await response.json().catch(() => ({}));
    setPending(false);

    if (!response.ok || !body.session) {
      setError(typeof body.error === "string" ? body.error : "Activatie mislukt.");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    await supabase.auth.setSession({
      access_token: body.session.access_token,
      refresh_token: body.session.refresh_token,
    });
    router.push(body.redirect ?? "/brand");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <div className="flex items-center gap-2 font-semibold">
          <CheckCircle2 className="h-4 w-4" />
          {brandName}
        </div>
        <p className="mt-1 text-emerald-700">{email}</p>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-neutral-800">Naam</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          className="h-11 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-neutral-800">Wachtwoord</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={6}
          required
          className="h-11 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-neutral-800">Herhaal wachtwoord</span>
        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          minLength={6}
          required
          className="h-11 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500"
        />
      </label>
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full rounded-lg" isPending={pending}>
        Account activeren
      </Button>
    </form>
  );
}
