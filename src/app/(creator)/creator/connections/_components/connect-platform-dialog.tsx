"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function ConnectPlatformDialog({ children }: { children: ReactNode }) {
  const t = useTranslations("creator.connections.connect");
  const sharedT = useTranslations("creator.shared");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        {t("button")}
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="connect-platform-title">
          <button className="absolute inset-0 cursor-default" type="button" aria-label={sharedT("actions.close")} onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-2xl rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="connect-platform-title" className="text-lg font-semibold tracking-normal text-neutral-950">{t("title")}</h2>
                <p className="mt-1 text-sm leading-6 text-neutral-500">{t("description")}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 transition hover:bg-neutral-50"
                aria-label={sharedT("actions.close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
