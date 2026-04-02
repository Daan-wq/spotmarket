import { redirect } from "next/navigation";

// The network role has been merged into the unified 'user' role.
// Network functionality is now handled via the referral system.
// All network routes permanently redirect to the unified dashboard.
export default function NetworkLayout() {
  redirect("/dashboard");
}
