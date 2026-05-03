import { redirect } from "next/navigation";
import { getCachedAuthUser, resolveRoleFor } from "@/lib/auth";

// Legacy route group — redirect to the correct role-based dashboard
export default async function AppLayout() {
  const user = await getCachedAuthUser();
  if (!user) redirect("/sign-in");

  const role = await resolveRoleFor(user);
  if (role === "admin") redirect("/admin");
  redirect("/creator/dashboard");
}
