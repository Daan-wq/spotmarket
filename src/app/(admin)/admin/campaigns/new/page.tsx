import { redirect } from "next/navigation";
import { checkRole } from "@/lib/auth";
import { CampaignCreateForm } from "./campaign-create-form";

export default async function NewCampaignPage() {
  const isAdmin = await checkRole("admin");
  if (!isAdmin) redirect("/unauthorized");

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Create Campaign</h1>
      <p className="mb-8" style={{ color: "var(--text-secondary)" }}>Fill in the details — you can post it to Discord after saving.</p>
      <CampaignCreateForm />
    </div>
  );
}
