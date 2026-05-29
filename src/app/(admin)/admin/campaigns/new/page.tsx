import { redirect } from "next/navigation";
import { checkRole } from "@/lib/auth";
import { CampaignCreateForm } from "./campaign-create-form";

export default async function NewCampaignPage() {
  const isAdmin = await checkRole("admin");
  if (!isAdmin) redirect("/unauthorized");

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Campagne maken</h1>
      <p className="mb-8" style={{ color: "var(--text-secondary)" }}>Vul de details in - na het opslaan kun je de campagne op Discord plaatsen.</p>
      <CampaignCreateForm />
    </div>
  );
}
