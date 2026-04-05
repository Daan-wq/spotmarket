import { checkRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdvertiserSidebar } from "./_components/advertiser-sidebar";

export default async function AdvertiserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hasAccess = await checkRole("advertiser");
  if (!hasAccess) {
    redirect("/unauthorized");
  }

  return (
    <div className="flex h-screen" style={{ background: "var(--bg-primary)" }}>
      <AdvertiserSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
