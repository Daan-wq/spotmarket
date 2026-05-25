import { PageHeader } from "@/components/ui/page";
import { DiscordMessageComposer } from "./discord-message-composer";

export const dynamic = "force-dynamic";

export default function AdminDiscordPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Discord"
        description="Compose, preview, template, and send Discord messages from the ClipProfit bot."
      />
      <DiscordMessageComposer />
    </div>
  );
}
