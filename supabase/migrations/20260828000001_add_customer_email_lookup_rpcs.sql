-- Storefront signup/login (customerSignup.ts, customerSignupServer.ts,
-- useCurrentCustomer.ts) call two RPCs — check_customer_email_exists and
-- find_customer_by_email — that were never captured in tracked migrations
-- (created ad hoc on the remote project, same gap as the reviews tables
-- fixed in the previous migration). Local/fresh databases 404 on signup
-- ("Could not find the function ... in the schema cache") because of it.
--
-- Both run as SECURITY INVOKER (the default) and rely on store_customers'
-- existing anon/authenticated SELECT grant — same effective access the
-- calling code already had before these existed as real functions.

CREATE OR REPLACE FUNCTION public.check_customer_email_exists(p_email "text")
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.store_customers WHERE lower(email) = lower(p_email)
  );
$$;

CREATE OR REPLACE FUNCTION public.find_customer_by_email(p_email "text")
RETURNS SETOF public.store_customers
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT * FROM public.store_customers WHERE lower(email) = lower(p_email);
$$;

GRANT EXECUTE ON FUNCTION public.check_customer_email_exists("text") TO "anon", "authenticated", "service_role";
GRANT EXECUTE ON FUNCTION public.find_customer_by_email("text") TO "anon", "authenticated", "service_role";
