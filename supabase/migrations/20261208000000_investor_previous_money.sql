-- Earlier investment: money a person put in before the store started using Investor money.
--
-- entry_type 'previous_in' counts towards what the business owes that person (the loan or their capital), but not
-- towards the Investor account, because the money is already in the business's cash and stock. It can carry any
-- past date, including one before the starting cash date. Like put_in, it has no pay_from.
--
-- Requires 20261207000000_investor_money_out_of_profit.sql.

ALTER TABLE "public"."investor_entries" DROP CONSTRAINT IF EXISTS "investor_entries_type_check";
ALTER TABLE ONLY "public"."investor_entries"
  ADD CONSTRAINT "investor_entries_type_check" CHECK ("entry_type" IN ('put_in', 'previous_in', 'repay', 'pay_back', 'profit_share_paid', 'interest'));

ALTER TABLE "public"."investor_entries" DROP CONSTRAINT IF EXISTS "investor_entries_pay_from_check";
ALTER TABLE ONLY "public"."investor_entries"
  ADD CONSTRAINT "investor_entries_pay_from_check" CHECK (
    ("entry_type" IN ('put_in', 'previous_in') AND "pay_from" IS NULL)
    OR ("entry_type" NOT IN ('put_in', 'previous_in') AND "pay_from" IN ('business', 'investor'))
  );
