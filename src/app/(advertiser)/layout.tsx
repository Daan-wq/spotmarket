import { redirect } from "next/navigation";

// The advertiser role has been merged into the unified 'user' role.
// All advertiser routes permanently redirect to the unified dashboard.
export default function AdvertiserLayout() {
  redirect("/dashboard");
}
