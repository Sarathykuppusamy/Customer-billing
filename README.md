# Customer Billing System

A modern, production-ready web application for managing purchases with automatic 10% commission deduction.

## Project Structure

This project is organized into two main folders:

```
Customer-billing/
├── 📁 frontend/                  ← React web application (user interface)
│   ├── src/                      ← React components, pages, styling
│   ├── supabase/                 ← Database migrations & Edge Functions
│   ├── package.json              ← Dependencies
│   ├── vite.config.js            ← Build configuration
│   ├── QUICKSTART.md             ← Quick deployment guide
│   ├── DEPLOYMENT.md             ← Detailed deployment steps
│   ├── README.md                 ← Full documentation
│   └── PROJECT_STRUCTURE.md      ← Code organization
│
├── 📁 backend/                   ← Backend configuration
│   ├── supabase/                 ← Database & serverless functions
│   │   ├── migrations/           ← SQL schema files
│   │   └── functions/            ← TypeScript Edge Functions
│   └── README.md                 ← Backend documentation
│
├── 📄 START_HERE.md              ← Welcome & quick start
├── 📄 QUICK_REFERENCE.md         ← Commission examples & quick facts
├── 📄 WHAT_YOU_GET.md            ← Feature overview
├── 📄 IMPLEMENTATION_COMPLETE.md  ← What was delivered
└── 📄 drumstick-ledger-problem-solution.md ← Problem statement & solution
```

## Quick Start

### 1️⃣ **Read Documentation** (5 minutes)
- Start with [START_HERE.md](START_HERE.md)
- Then [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- Then [WHAT_YOU_GET.md](WHAT_YOU_GET.md)

### 2️⃣ **Deploy** (30 minutes)
- Follow [frontend/QUICKSTART.md](frontend/QUICKSTART.md)

### 3️⃣ **Go Live!**
- Test the admin dashboard
- Invite farmers to register
- Start logging transactions

## Key Features

### ✅ Admin Dashboard
- Daily entry of purchases (automatic 10% commission calculation)
- View total metrics (gross income, commission, net paid)
- Pending payments list with mark-as-paid functionality
- Set daily rates for different product types
- Search and view all transactions
- Commission tracking

### ✅ Customer Portal
- View personal transaction history
- See transparent commission breakdown
- Check payment status (Paid/Pending)
- Access from any device (mobile, tablet, desktop)

### ✅ Commission System
- **Automatic 10% deduction** calculated by database
- **Transparent breakdown** showing gross → commission → net
- **Real-time tracking** of pending vs paid amounts
- **Server-side security** (calculations never exposed to frontend)

### ✅ Zero-Cost Infrastructure
- **Frontend**: Deployed on Vercel
- **Database**: Supabase PostgreSQL with free tier
- **Authentication**: PIN-based with bcrypt hashing
- **Scalability**: Handles thousands of transactions

## Technology Stack

| Component | Technology | Cost |
|-----------|-----------|------|
| Frontend | React 18 + Vite | Free (Vercel) |
| Database | PostgreSQL (Supabase) | Free tier included |
| Auth | PIN + Bcrypt | Integrated |
| Functions | Supabase Edge Functions | Free tier included |
| Hosting | Vercel | Free tier |

## File Descriptions

### Root-Level Documentation

| File | Purpose |
|------|---------|
| **START_HERE.md** | Welcome guide - read this first! |
| **QUICK_REFERENCE.md** | Quick facts, commission examples, checklist |
| **WHAT_YOU_GET.md** | Feature overview and capabilities |
| **IMPLEMENTATION_COMPLETE.md** | What was delivered in this project |
| **drumstick-ledger-problem-solution.md** | Problem statement & technical solution |

### Frontend Folder

| File | Purpose |
|------|---------|
| **QUICKSTART.md** | 30-minute deployment guide (most important!) |
| **DEPLOYMENT.md** | Detailed step-by-step deployment instructions |
| **README.md** | Complete project documentation |
| **PROJECT_STRUCTURE.md** | Code organization and structure |
| **src/** | React components, pages, styling |
| **supabase/** | Database schema and Edge Functions |

### Backend Folder

| File | Purpose |
|------|---------|
| **README.md** | Backend documentation and setup |
| **supabase/migrations/** | Database schema files |
| **supabase/functions/** | Serverless functions (TypeScript) |

## Getting Help

### For Deployment Questions
→ Read [frontend/QUICKSTART.md](frontend/QUICKSTART.md)

### For Detailed Instructions
→ Read [frontend/DEPLOYMENT.md](frontend/DEPLOYMENT.md)

### For Troubleshooting
→ Check [frontend/README.md](frontend/README.md) troubleshooting section

### For Code Organization
→ Review [frontend/PROJECT_STRUCTURE.md](frontend/PROJECT_STRUCTURE.md)

### For Backend Setup
→ Read [backend/README.md](backend/README.md)

## Next Steps

1. **Read [START_HERE.md](START_HERE.md)** (5 minutes)
2. **Read [QUICK_REFERENCE.md](QUICK_REFERENCE.md)** (2 minutes)
3. **Read [WHAT_YOU_GET.md](WHAT_YOU_GET.md)** (10 minutes)
4. **Follow [frontend/QUICKSTART.md](frontend/QUICKSTART.md)** (30 minutes)
5. **Deploy and go live!**

---

**Total time to deployment: ~1 hour** ⚡

Good luck! 🚀
