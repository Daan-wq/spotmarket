import { PageHeader } from "@/components/ui/page";
import { DiscordMessageComposer } from "./discord-message-composer";

export const dynamic = "force-dynamic";

export default function AdminDiscordPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Discord"
        description="Stel Discord-berichten op, preview ze, maak templates en verzend ze vanuit de ClipProfit-bot."
      />
      <DiscordMessageComposer />
    </div>
  );
}
