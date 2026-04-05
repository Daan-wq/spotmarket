import { redirect } from "next/navigation";
import { checkRole } from "@/lib/auth";
import { CreatorSidebar } from "../_components/creator-sidebar";

export default async function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isCreator = await checkRole("creator");
  if (!isCreator) redirect("/unauthorized");

  return (
    <div className="flex h-screen" style={{ background: "var(--bg-primary)" }}>
      <CreatorSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
