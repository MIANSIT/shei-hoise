import { redirect } from "next/navigation";

/** The Money Book was replaced by the Investor money page; old links and bookmarks land there. */
export default function MoneyBookRoute() {
  redirect("/dashboard/financial/investor-money");
}
