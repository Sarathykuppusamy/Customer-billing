-- Create customers table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  pin_hash TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create daily_rates table
CREATE TABLE daily_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  drumstick_type TEXT NOT NULL,
  rate_per_kg DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(date, drumstick_type)
);

-- Create transactions table with generated columns for automatic commission calculation
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  drumstick_type TEXT NOT NULL,
  weight_kg DECIMAL(10, 2) NOT NULL,
  rate_per_kg DECIMAL(10, 2) NOT NULL,
  commission_percent INTEGER DEFAULT 10,
  -- Generated columns for automatic calculation
  gross_amount DECIMAL(12, 2) GENERATED ALWAYS AS (weight_kg * rate_per_kg) STORED,
  commission_amount DECIMAL(12, 2) GENERATED ALWAYS AS (weight_kg * rate_per_kg * commission_percent / 100) STORED,
  net_amount DECIMAL(12, 2) GENERATED ALWAYS AS (weight_kg * rate_per_kg * (100 - commission_percent) / 100) STORED,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_customers_phone ON customers(phone);

-- Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_rates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customers table
-- Customers can only see their own record
CREATE POLICY "customers_self_select" ON customers FOR SELECT
  USING (auth.uid() = id);

-- Admin can see all customers
CREATE POLICY "admin_customers_select" ON customers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customers c WHERE c.id = auth.uid() AND c.is_admin = true
    )
  );

-- RLS Policies for transactions table
-- Customers can only see their own transactions
CREATE POLICY "customers_transactions_select" ON transactions FOR SELECT
  USING (customer_id = auth.uid());

-- Admin can see all transactions
CREATE POLICY "admin_transactions_select" ON transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customers c WHERE c.id = auth.uid() AND c.is_admin = true
    )
  );

-- Customers can insert their own transactions
CREATE POLICY "customers_transactions_insert" ON transactions FOR INSERT
  WITH CHECK (customer_id = auth.uid());

-- Admin can insert transactions
CREATE POLICY "admin_transactions_insert" ON transactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers c WHERE c.id = auth.uid() AND c.is_admin = true
    )
  );

-- Admin can update transaction status
CREATE POLICY "admin_transactions_update" ON transactions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM customers c WHERE c.id = auth.uid() AND c.is_admin = true
    )
  );

-- RLS Policies for daily_rates table
-- Everyone can read rates
CREATE POLICY "daily_rates_select" ON daily_rates FOR SELECT
  USING (true);

-- Only admin can insert/update rates
CREATE POLICY "admin_rates_insert" ON daily_rates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers c WHERE c.id = auth.uid() AND c.is_admin = true
    )
  );

CREATE POLICY "admin_rates_update" ON daily_rates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM customers c WHERE c.id = auth.uid() AND c.is_admin = true
    )
  );

-- Helper function to get dashboard metrics (called by admin)
CREATE OR REPLACE FUNCTION get_dashboard_metrics()
RETURNS TABLE (
  total_gross_income DECIMAL,
  total_commission_collected DECIMAL,
  total_net_paid DECIMAL,
  total_pending DECIMAL,
  total_weight DECIMAL
) LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT
    COALESCE(SUM(gross_amount), 0),
    COALESCE(SUM(commission_amount), 0),
    COALESCE(SUM(CASE WHEN status = 'paid' THEN net_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'pending' THEN net_amount ELSE 0 END), 0),
    COALESCE(SUM(weight_kg), 0)
  FROM transactions;
$$;

-- Helper function to group pending payments by customer
CREATE OR REPLACE FUNCTION get_pending_by_customer()
RETURNS TABLE (
  customer_id UUID,
  customer_name TEXT,
  customer_phone TEXT,
  total_pending DECIMAL
) LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT
    c.id,
    c.name,
    c.phone,
    COALESCE(SUM(t.net_amount), 0)
  FROM customers c
  LEFT JOIN transactions t ON c.id = t.customer_id AND t.status = 'pending'
  WHERE c.is_admin = false
  GROUP BY c.id, c.name, c.phone
  HAVING COALESCE(SUM(t.net_amount), 0) > 0;
$$;
