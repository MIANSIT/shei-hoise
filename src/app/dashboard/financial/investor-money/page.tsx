import InvestorMoneyPage from "@/app/components/admin/dashboard/financial/InvestorMoneyPage";

/** Hidden (not found) unless the plan has opening_cash or investor_money; the page itself shows only the parts the plan has. */
export default function InvestorMoneyRoute() {
  return <InvestorMoneyPage />;
}
