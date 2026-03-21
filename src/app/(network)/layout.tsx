import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { NetworkSidebar } from "./_components/network-sidebar";

export default async function NetworkLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { role: true },
  });

  if (dbUser?.role !== "network") redirect("/unauthorized");

  return (
    <div className="flex h-screen bg-gray-50">
      <NetworkSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
