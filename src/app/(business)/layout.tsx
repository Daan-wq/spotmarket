import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { BusinessSidebar } from "./_components/business-sidebar";

export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { role: true },
  });

  if (dbUser?.role === "admin") redirect("/admin");
  if (dbUser?.role !== "business") redirect("/dashboard");

  return (
    <div className="flex h-screen" style={{ background: "#f9fafb" }}>
      <BusinessSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
