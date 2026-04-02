interface CampaignNotification {
  id: string;
  name: string;
  platform: string;
  totalBudget: number;
  businessCpv: number;
  targetCountry?: string | null;
  minEngagementRate: number;
  advertiserBrandName?: string | null;
}

export async function notifyCampaignLive(campaign: CampaignNotification): Promise<void> {
  const webhookUrl = process.env.DISCORD_DEALS_WEBHOOK_URL;
  if (!webhookUrl) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://clipprofit.com";
  const cpmDollars = campaign.businessCpv * 1_000_000;

  const payload = {
    embeds: [
      {
        title: "💰 New Campaign Available",
        color: 0x23a559,
        fields: [
          { name: "Brand", value: campaign.advertiserBrandName ?? campaign.name, inline: true },
          { name: "CPM", value: `$${cpmDollars.toFixed(0)}/1,000 views`, inline: true },
          { name: "Budget", value: `$${campaign.totalBudget.toLocaleString()}`, inline: true },
          { name: "Platform", value: campaign.platform, inline: true },
          ...(campaign.targetCountry ? [{ name: "Target", value: campaign.targetCountry, inline: true }] : []),
          { name: "Min. Engagement", value: `${campaign.minEngagementRate}%`, inline: true },
        ],
        url: `${appUrl}/campaigns`,
        footer: { text: "ClipProfit — Apply in the dashboard" },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(err => console.error("[discord webhook]", err));
}
