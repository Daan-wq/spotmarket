"use client";

import { useState } from "react";
import { ExternalLink, LifeBuoy, Ticket } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

const DISCORD_GUILD_ID = "1486482870272000102";
const DISCORD_HELP_CHANNEL_ID = "1486745899500830801";
const DISCORD_HELP_URL = `https://discord.com/channels/${DISCORD_GUILD_ID}/${DISCORD_HELP_CHANNEL_ID}`;
const DISCORD_APP_URL = `discord:///channels/${DISCORD_GUILD_ID}/${DISCORD_HELP_CHANNEL_ID}`;
const DISCORD_WEB_FALLBACK_DELAY_MS = 2500;

export function ContactSupportButton() {
  const t = useTranslations("creator.campaigns.detail");
  const [open, setOpen] = useState(false);

  const openDiscord = () => {
    let fallbackTimerId = 0;

    const cleanup = () => {
      if (fallbackTimerId) {
        window.clearTimeout(fallbackTimerId);
      }
      window.removeEventListener("blur", cleanup);
      window.removeEventListener("pagehide", cleanup);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        cleanup();
      }
    };

    window.addEventListener("blur", cleanup, { once: true });
    window.addEventListener("pagehide", cleanup, { once: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);

    fallbackTimerId = window.setTimeout(() => {
      cleanup();
      if (!document.hidden) {
        window.open(DISCORD_HELP_URL, "_blank", "noopener,noreferrer");
      }
    }, DISCORD_WEB_FALLBACK_DELAY_MS);

    window.location.href = DISCORD_APP_URL;
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
      >
        {t("contact")}
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="lg"
        className="overflow-hidden"
        title={
          <span className="flex items-center gap-2">
            <LifeBuoy className="h-4 w-4 text-neutral-600" />
            {t("contactSupport.title")}
          </span>
        }
        description={t("contactSupport.description")}
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
            >
              {t("contactSupport.close")}
            </Button>
            <button
              type="button"
              onClick={openDiscord}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-neutral-800 to-neutral-950 px-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.16)] transition-all duration-150 ease-out hover:from-neutral-700 hover:to-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
            >
              {t("contactSupport.openDiscord")}
              <ExternalLink className="h-4 w-4" />
            </button>
          </>
        }
      >
        <div className="flex items-start gap-3 border-y border-neutral-100 py-4">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-50 text-neutral-950 ring-1 ring-neutral-200">
            <Ticket className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-950">
              {t("contactSupport.ticketTitle")}
            </p>
            <p className="mt-1 text-sm leading-6 text-neutral-600">
              {t("contactSupport.ticketCopy")}
            </p>
          </div>
        </div>
      </Dialog>
    </>
  );
}
