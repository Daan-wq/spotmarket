import { redirect } from "next/navigation";

// Wallet has been merged into Payments. Existing bookmarks/links continue to
// work via this 307 redirect into the Withdraw tab.
export default function WalletPage() {
  redirect("/creator/payouts?tab=withdraw");
}
