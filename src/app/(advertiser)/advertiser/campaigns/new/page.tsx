import { AdvertiserCampaignForm } from "./campaign-form";

export default function NewCampaignPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-1" style={{ color: "var(--text-primary)" }}>New Campaign</h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
        Fill in the details below, then complete payment to launch your campaign.
      </p>
      <AdvertiserCampaignForm />
    </div>
  );
}
