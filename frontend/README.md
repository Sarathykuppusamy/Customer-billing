# Customer Billing
A modern web application to replace paper bills for drumstick (moringa) purchases.

## Features
- **Admin Dashboard** — Fast entry of daily purchases with automatic commission calculation
- **Farmer Portal** — Customers can view their transaction history anytime with phone number + PIN login
- **Automatic Commission** — 10% commission is automatically deducted and displayed transparently
- **Cost-Effective Deployment** — Deploys on Vercel + Supabase with minimal costs
- **Mobile-Friendly** — Works on any smartphone browser, can be saved as a home-screen shortcut

## Tech Stack
- **Frontend:** React + Vite (deployed on Vercel)
- **Backend:** Supabase (PostgreSQL + REST API + Edge Functions)
- **Auth:** Phone Number + PIN (no SMS cost)
- **Database:** Supabase Standard Tier (500MB, enough for thousands of transactions)

## Quick Start

### 1. **Clone or Download the Project**
```bash
git clone <your-repo-url>
cd frontend
npm install
```

### 2. **Set Up Supabase**

1. Go to [supabase.com](https://supabase.com) and sign up
2. Create a new project (name: "customer-billing", region: closest to you)
3. Once created, go to **Project Settings → API**
4. Copy your:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `Anon Key` → `VITE_SUPABASE_ANON_KEY`

5. From the repository root, run `cd backend && supabase db push` to apply all migrations.

6. Create the first admin account:
   - In Supabase SQL Editor, run:
   ```sql
   -- First, generate a bcrypt hash of your PIN (e.g., PIN: 1234)
   -- You can use: https://bcrypt-generator.com/
   -- Or run this in your terminal:
   -- npx bcryptjs hash "1234" 10
   
   INSERT INTO customers (name, phone, pin_hash, is_admin)
   VALUES ('Your Name', '9999999999', '$2a$10$YOUR_BCRYPT_HASH_HERE', true);
   ```
   - Replace `YOUR_BCRYPT_HASH_HERE` with the actual bcrypt hash

### 3. **Configure Environment Variables**

Create `.env.local` file in the project root:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. **Run Locally**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. **Deploy to Vercel**

1. Push your code to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo>
   git push -u origin main
   ```

2. Go to [vercel.com](https://vercel.com) and sign up
3. Click "New Project" → Import your GitHub repository
4. Set the Vercel Root Directory to `frontend`, then add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click "Deploy"

Your app is now live! Share the URL with farmers and admins.

## Usage

### For Admin (Shop Owner)
1. **Login** with phone number + PIN (the one you set up)
2. **New Entry Tab** — Add daily purchases:
   - Search or add a customer
   - Enter weight, type, rate
   - Commission (10%) is auto-calculated
   - Mark as Paid or Pending
3. **Metrics Tab** — View total gross, commission collected, net paid
4. **Pending Payments** — List of farmers still owed money
5. **Set Rates Tab** — Set today's rates per type (Karumbu, Cheti, Maram)
6. **All Transactions** — Search and filter all records

### For Farmer (Customer)
1. **First Time:** Register with name, phone number, and set a PIN
2. **Login** with phone number + PIN
3. **View History** — See all your sales:
   - Gross amount
   - Commission deducted (10%)
   - Net amount you're getting paid
   - Payment status (Paid ✓ or Pending ⏳)
4. **Share Link** — Give customers the app URL; they can register anytime

## Commission Example
```
Farmer brings 100 kg of drumsticks at ₹35/kg

Gross Amount = 100 × 35 = ₹3,500
Commission (10%) = ₹3,500 × 0.10 = ₹350
Net Amount Paid = ₹3,500 − ₹350 = ₹3,150

Farmer receives: ₹3,150 ✓
Owner keeps: ₹350 (commission)
```

## Data Model
- **customers** — Farmer/admin profiles (phone unique, PIN hashed)
- **transactions** — Each purchase (auto-calculated gross, commission, net)
- **daily_rates** — Today's rate per drumstick type

All calculations use **generated columns** — database computes them, so totals never drift.

## Security
- PINs are **hashed** (bcrypt), never stored in plain text
- Row Level Security (RLS) — Farmers only see their own data
- All calculations happen server-side
- No SMS cost — PIN-based login is
- Deployment is automatic through Vercel

## Limitations
- Supabase: 500MB database (handles ~5,000+ transactions)
- Vercel: Based on usage plan
- No real SMS OTP (PIN-based login instead)

## Future Enhancements
- Real SMS OTP (add SMS91/Twilio budget)
- WhatsApp receipts after each sale
- Export reports as CSV/PDF
- Multi-shop support
- Dynamic commission rates per farmer

## Support
For issues or questions:
1. Check the **Help** section in the Customer view
2. Review the database schema in [backend/supabase/migrations](../backend/supabase/migrations)
3. Consult [Supabase docs](https://supabase.com/docs)

## License
MIT — Use and modify

---

**Ready to go live?** Follow the deployment steps above and share the URL with your farmers! 🚀
