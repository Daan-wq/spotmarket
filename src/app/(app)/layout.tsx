import { redirect } from "next/navigation";
import { getCachedAuthClaims, resolveRoleFor } from "@/lib/auth";

// Legacy route group — redirect to the correct role-based dashboard
export default async function AppLayout() {
  const claims = await getCachedAuthClaims();
  if (!claims) redirect("/sign-in");

  const role = await resolveRoleFor(claims);
  if (role === "admin") redirect("/admin");
  redirect("/creator/dashboard");
}
