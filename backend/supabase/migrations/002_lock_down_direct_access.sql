-- Browser clients have no direct table access. Edge Functions use the
-- service-role key and enforce the signed application session themselves.
DROP POLICY IF EXISTS "customers_self_select" ON customers;
DROP POLICY IF EXISTS "admin_customers_select" ON customers;
DROP POLICY IF EXISTS "customers_transactions_select" ON transactions;
DROP POLICY IF EXISTS "admin_transactions_select" ON transactions;
DROP POLICY IF EXISTS "customers_transactions_insert" ON transactions;
DROP POLICY IF EXISTS "admin_transactions_insert" ON transactions;
DROP POLICY IF EXISTS "admin_transactions_update" ON transactions;
DROP POLICY IF EXISTS "daily_rates_select" ON daily_rates;
DROP POLICY IF EXISTS "admin_rates_insert" ON daily_rates;
DROP POLICY IF EXISTS "admin_rates_update" ON daily_rates;

REVOKE ALL ON FUNCTION get_dashboard_metrics() FROM PUBLIC;
REVOKE ALL ON FUNCTION get_pending_by_customer() FROM PUBLIC;
