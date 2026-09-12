# Backend

This folder contains all backend configuration and code for the Customer Billing system.

## Structure

```
backend/
├── supabase/
│   ├── migrations/
│   │   └── 001_init.sql          # Database schema with customers, transactions, daily_rates tables
│   ├── functions/
│   │   ├── verify-pin/
│   │   │   └── index.ts          # Edge Function for secure PIN verification
│   │   └── register-customer/
│   │       └── index.ts          # Edge Function for customer registration
│   └── config.toml               # Supabase functions configuration
└── .gitignore                     # Git ignore rules
```

## Database

### Tables

- **customers**: User accounts with phone + PIN authentication
  - Columns: id, name, phone, pin_hash, is_admin, created_at, updated_at
  - Indexes: phone (unique)

- **transactions**: Purchase records with automatic 10% commission calculation
  - Columns: id, customer_id, date, drumstick_type, weight_kg, rate_per_kg, status
  - Generated columns: gross_amount, commission_amount (10%), net_amount
  - Indexes: customer_id, date, status

- **daily_rates**: Admin-set rates for each drumstick type per day
  - Columns: id, date, drumstick_type, rate_per_kg
  - Unique constraint: date + drumstick_type

### Row Level Security (RLS)

- Customers can only view their own transactions
- Admins can view all transactions
- Only admins can set daily rates
- Customers cannot modify transaction status (only admins can mark as paid)

### Automatic Commission Calculation

The `commission_amount` and `net_amount` columns are **generated columns** in PostgreSQL that automatically calculate:
- Commission = gross_amount × 10%
- Net = gross_amount - commission
- No application-level calculation needed

## Edge Functions

### verify-pin

**Purpose**: Secure PIN verification for customer login
- Accepts: phone, pin
- Returns: success status, customer details
- Uses bcrypt for PIN comparison
- Returns 401 if PIN invalid

**Endpoint**: POST /functions/v1/verify-pin

### register-customer

**Purpose**: Register new customer with hashed PIN
- Accepts: name, phone, pin
- Returns: success status, customer details
- Uses bcrypt to hash PIN before storing
- Prevents duplicate phone numbers
- Validates PIN length (min 4 characters)

**Endpoint**: POST /functions/v1/register-customer

## Deployment

### Local Development

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Initialize Supabase project:
```bash
supabase init
```

3. Run migrations:
```bash
supabase db reset
```

4. Deploy functions locally:
```bash
supabase functions serve
```

### Production Deployment

1. Create Supabase project at https://supabase.com
2. Apply migrations using Supabase Dashboard or CLI:
```bash
supabase db push
```

3. Deploy Edge Functions:
```bash
supabase functions deploy verify-pin
supabase functions deploy register-customer
```

4. Get your Supabase URL and keys from project settings
5. Add to frontend `.env.local`:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
   - `APP_SESSION_SECRET` (set with `supabase secrets set`; never expose it to the frontend)

## Security Notes

- **PIN Storage**: Never stored in plain text, always hashed with bcrypt
- **Row Level Security**: Database enforces access control at the row level
- **Service Role Key**: Should only be used in Edge Functions, never expose to frontend
- **Anon Key**: Public key used by frontend, limited by RLS policies
