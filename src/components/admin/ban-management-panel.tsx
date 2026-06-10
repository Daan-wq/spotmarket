"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Ban, ShieldAlert, ShieldOff, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type SignalType =
  | "IP"
  | "DEVICE"
  | "DISCORD"
  | "INSTAGRAM"
  | "TIKTOK"
  | "YOUTUBE"
  | "FACEBOOK"
  | "PAYOUT";

interface AccessSignalRow {
  id: string;
  type: SignalType;
  maskedValue: string;
  lastSeenAt: string;
}

interface IndicatorRow {
  id: string;
  type: SignalType;
  maskedValue: string;
  mode: "LAYERED" | "HARD";
}

interface ActiveBan {
  id: string;
  reason: string;
  internalNote: string | null;
  bannedAt: string;
  indicators: IndicatorRow[];
}

interface BanManagementPanelProps {
  creatorId: string;
  ban: ActiveBan | null;
  signals: AccessSignalRow[];
}

const inputClass =
  "w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-950 outline-none focus:border-neutral-500";

export function BanManagementPanel({
  creatorId,
  ban,
  signals,
}: BanManagementPanelProps) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function request(
    key: string,
    url: string,
    init: RequestInit,
    fallbackError: string,
  ) {
    setPendingKey(key);
    setError(null);
    const response = await fetch(url, init);
    const body = await response.json().catch(() => ({}));
    setPendingKey(null);

    if (!response.ok) {
      setError(typeof body.error === "string" ? body.error : fallbackError);
      return false;
    }

    router.refresh();
    return true;
  }

  if (!ban) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50/50 p-5">
        <div className="flex items-start gap-3">
          <ShieldOff className="mt-0.5 h-5 w-5 text-red-600" />
          <div>
            <h2 className="text-sm font-semibold text-neutral-950">Account bannen</h2>
            <p className="mt-1 text-sm text-neutral-600">
              Blokkeert dit creatoraccount direct. Signalen worden daarna apart en
              uitsluitend op adminselectie geactiveerd.
            </p>
          </div>
        </div>
        <ErrorMessage error={error} />
        <form
          className="mt-4 grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const data = new FormData(form);
            const ok = await request(
              "ban",
              `/api/admin/creators/${creatorId}/ban`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  reason: data.get("reason"),
                  internalNote: data.get("internalNote") || undefined,
                }),
              },
              "Bannen mislukt.",
            );
            if (ok) form.reset();
          }}
        >
          <label className="grid gap-1.5 text-sm font-medium text-neutral-700">
            Reden
            <input
              className={inputClass}
              name="reason"
              minLength={3}
              maxLength={200}
              required
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-neutral-700">
            Interne notitie
            <textarea
              className={inputClass}
              name="internalNote"
              maxLength={2000}
              rows={3}
            />
          </label>
          <Button
            className="justify-self-start"
            type="submit"
            variant="destructive"
            isPending={pendingKey === "ban"}
          >
            <Ban className="h-4 w-4" />
            Account bannen
          </Button>
        </form>
      </section>
    );
  }

  return (
    <section className="space-y-5 rounded-2xl border border-red-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-600" />
            <h2 className="text-sm font-semibold text-neutral-950">
              Actieve accountban
            </h2>
            <Badge variant="failed">Geblokkeerd</Badge>
          </div>
          <p className="mt-2 text-sm text-neutral-700">{ban.reason}</p>
          {ban.internalNote ? (
            <p className="mt-1 text-xs text-neutral-500">{ban.internalNote}</p>
          ) : null}
        </div>
        <p className="text-xs text-neutral-500">
          Sinds {new Date(ban.bannedAt).toLocaleDateString("nl-NL")}
        </p>
      </div>

      <ErrorMessage error={error} />

      <div>
        <h3 className="text-sm font-semibold text-neutral-950">
          Waargenomen signalen
        </h3>
        <p className="mt-1 text-xs text-neutral-500">
          Niets is vooraf geselecteerd. Activeer alleen signalen die voldoende
          betrouwbaar en proportioneel zijn.
        </p>
        <div className="mt-3 space-y-3">
          {signals.length === 0 ? (
            <p className="rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-500">
              Nog geen recente IP-, device- of identiteitssignalen beschikbaar.
            </p>
          ) : (
            signals.map((signal) => {
              const indicator = ban.indicators.find(
                (item) =>
                  item.type === signal.type &&
                  item.maskedValue === signal.maskedValue,
              );
              return (
                <SignalControl
                  key={signal.id}
                  signal={signal}
                  indicator={indicator}
                  banId={ban.id}
                  pendingKey={pendingKey}
                  request={request}
                />
              );
            })
          )}
        </div>
      </div>

      <form
        className="rounded-xl border border-neutral-200 bg-neutral-50 p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          const ok = await request(
            "unban",
            `/api/admin/bans/${ban.id}/unban`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ liftReason: data.get("liftReason") }),
            },
            "Unban mislukt.",
          );
          if (ok) form.reset();
        }}
      >
        <label className="grid gap-1.5 text-sm font-medium text-neutral-700">
          Reden voor unban
          <input
            className={inputClass}
            name="liftReason"
            minLength={3}
            maxLength={1000}
            required
          />
        </label>
        <Button
          className="mt-3"
          type="submit"
          variant="outline"
          isPending={pendingKey === "unban"}
        >
          Accountban opheffen
        </Button>
      </form>
    </section>
  );
}

function SignalControl({
  signal,
  indicator,
  banId,
  pendingKey,
  request,
}: {
  signal: AccessSignalRow;
  indicator: IndicatorRow | undefined;
  banId: string;
  pendingKey: string | null;
  request: (
    key: string,
    url: string,
    init: RequestInit,
    fallbackError: string,
  ) => Promise<boolean>;
}) {
  const key = `signal:${signal.id}`;
  return (
    <article className="rounded-xl border border-neutral-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant={signal.type === "IP" ? "pending" : "neutral"}>
              {signalLabel(signal.type)}
            </Badge>
            {indicator ? (
              <Badge variant="failed">
                {indicator.mode === "HARD" ? "Hard actief" : "Actief"}
              </Badge>
            ) : null}
          </div>
          <p className="mt-2 font-mono text-sm text-neutral-800">
            {signal.maskedValue}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Laatst gezien{" "}
            {new Date(signal.lastSeenAt).toLocaleString("nl-NL")}
          </p>
        </div>
        {indicator ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-red-600"
            isPending={pendingKey === key}
            onClick={() =>
              request(
                key,
                `/api/admin/bans/${banId}/indicators/${indicator.id}`,
                { method: "DELETE" },
                "Signaal verwijderen mislukt.",
              )
            }
          >
            <Trash2 className="h-4 w-4" />
            Verwijderen
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            isPending={pendingKey === key}
            onClick={() =>
              request(
                key,
                `/api/admin/bans/${banId}/indicators`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    accessSignalId: signal.id,
                    mode: "LAYERED",
                  }),
                },
                "Signaal activeren mislukt.",
              )
            }
          >
            {signal.type === "IP"
              ? "IP-signaal activeren"
              : `${signalLabel(signal.type)} activeren`}
          </Button>
        )}
      </div>

      {signal.type === "IP" && !indicator ? (
        <form
          className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            request(
              `${key}:hard`,
              `/api/admin/bans/${banId}/indicators`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  accessSignalId: signal.id,
                  mode: "HARD",
                  acknowledgeSharedIpRisk:
                    data.get("acknowledgeSharedIpRisk") === "on",
                  reason: data.get("reason"),
                }),
              },
              "Harde IP-ban activeren mislukt.",
            );
          }}
        >
          <h4 className="text-sm font-semibold text-red-800">Harde IP-ban</h4>
          <p className="mt-1 text-xs text-red-700">
            Dit kan alle gebruikers op een gedeeld netwerk blokkeren. Gebruik dit
            alleen bij overtuigend bewijs en een uitzonderlijke noodzaak.
          </p>
          <label className="mt-3 flex items-start gap-2 text-xs font-medium text-red-800">
            <input
              className="mt-0.5"
              name="acknowledgeSharedIpRisk"
              type="checkbox"
              required
            />
            Ik begrijp het risico voor onschuldige gebruikers op hetzelfde
            gedeelde IP-adres.
          </label>
          <label className="mt-3 grid gap-1.5 text-xs font-medium text-red-800">
            Verplichte motivatie
            <textarea
              className={inputClass}
              name="reason"
              minLength={10}
              maxLength={500}
              rows={2}
              required
            />
          </label>
          <Button
            className="mt-3"
            type="submit"
            size="sm"
            variant="destructive"
            isPending={pendingKey === `${key}:hard`}
          >
            Harde IP-ban activeren
          </Button>
        </form>
      ) : null}
    </article>
  );
}

function ErrorMessage({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
      {error}
    </p>
  );
}

function signalLabel(type: SignalType) {
  const labels: Record<SignalType, string> = {
    IP: "IP",
    DEVICE: "Device",
    DISCORD: "Discord",
    INSTAGRAM: "Instagram",
    TIKTOK: "TikTok",
    YOUTUBE: "YouTube",
    FACEBOOK: "Facebook",
    PAYOUT: "Payout",
  };
  return labels[type];
}
