import { redirect } from "next/navigation";

export default function PayoutsPage() {
  redirect("/earnings?tab=payouts");
}
