import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (authUser) {
    const user = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
      select: { role: true },
    });
    const role = user?.role;
    if (role === "admin") redirect("/admin");
    if (role === "creator") redirect("/creator/dashboard");
    redirect("/onboarding");
  }

  redirect("/sign-in");
}
