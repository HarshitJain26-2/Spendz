# Spendz Supabase Database & Query Library

This directory contains the complete database schema, Row Level Security (RLS) policies, automated user onboarding triggers, analytical views, and ready-to-use query libraries for **Spendz**.

---

## 📁 Directory Structure

```text
supabase/
├── README.md                      # This documentation
├── full_setup.sql                 # ⚡ All-in-one setup script (Single-paste in Supabase SQL Editor)
├── migrations/
│   ├── 01_initial_schema.sql      # Core tables, constraints, foreign keys & indexes
│   ├── 02_row_level_security.sql  # Strict multi-user Row Level Security (RLS) policies
│   ├── 03_triggers_and_functions.sql # Automatic updated_at, handle_new_user trigger, RPCs & views
│   └── 04_seed_categories.sql     # Global default expense & income category seeds
└── queries/
    ├── analytics_queries.sql      # Monthly summaries, category breakdowns & savings rates
    ├── splits_and_debts_queries.sql # Friend debts (who owes who), split settlements & pending tabs
    └── transactions_queries.sql   # Filtered transactions, atomic inserts with balance adjustments
```

---

## 🚀 Quick Setup (Under 1 Minute)

### Option A: All-in-One Setup (Recommended)
1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project and navigate to the **SQL Editor** from the left sidebar.
3. Click **New Query**.
4. Open [`supabase/full_setup.sql`](./full_setup.sql), copy the entire content, and paste it into the editor.
5. Click **Run** (or `Ctrl+Enter` / `Cmd+Enter`).
6. 🎉 Done! All 8 tables, indexes, RLS policies, new-user registration triggers, and seed categories are live.

---

### Option B: Step-by-Step Migrations
If you prefer running individual migration steps or using the Supabase CLI:

1. **Step 1: Create Schema & Tables**  
   Run [`migrations/01_initial_schema.sql`](./migrations/01_initial_schema.sql)  
   *Creates `profiles`, `user_settings`, `accounts`, `categories`, `friends`, `transactions`, `split_expenses`, and `split_participants`.*

2. **Step 2: Enable Row Level Security (RLS)**  
   Run [`migrations/02_row_level_security.sql`](./migrations/02_row_level_security.sql)  
   *Guarantees complete multi-tenant privacy where users can only view and mutate their own data.*

3. **Step 3: Add Functions, Triggers & Views**  
   Run [`migrations/03_triggers_and_functions.sql`](./migrations/03_triggers_and_functions.sql)  
   *Enables automatic `updated_at` handling, automated new user initialization (creates Profile, Cash & Bank accounts, and 19 default categories automatically when user registers), `settle_split_participant` RPC, and analytical reporting views.*

4. **Step 4: Seed Global Categories**  
   Run [`migrations/04_seed_categories.sql`](./migrations/04_seed_categories.sql)  
   *Seeds system default expense and income categories with icons and color schemes.*

---

## 🔒 Security Architecture (Row Level Security)

Every table has Row Level Security enabled. When querying via the Supabase client or API:
- `auth.uid()` evaluates to the currently authenticated user's ID.
- Users cannot read, insert, modify, or delete any record belonging to another user.
- Global default categories (where `user_id IS NULL`) are readable by all users, while custom categories are only accessible by their owner.

---

## ⚡ Automated User Onboarding

When a new user signs up via Supabase Auth (Email / Password or OAuth):
1. **Profile Creation**: Auto-populates `profiles` with their name and email.
2. **Preferences**: Creates `user_settings` with default theme and onboarding flags.
3. **Starter Accounts**: Automatically provisions standard `Cash` (default) and `Bank Account` accounts.
4. **Default Categories**: Seeds 13 expense categories and 6 income categories matching the Spendz app.

---

## 📊 Query Library

Ready-to-use queries are organized under `supabase/queries/`:

### 1. `transactions_queries.sql`
- Fetch recent transactions with accounts and categories joined.
- Filter transactions by month or custom date range.
- Search transactions by note or category name.
- Atomic transaction insert with account balance debit/credit.
- Transaction deletion with automatic balance rollback.

### 2. `splits_and_debts_queries.sql`
- Fetch split expenses with full participant lists and payers joined.
- **Friend Balance Calculation**: Evaluates who owes who across all transactions and splits.
- Settle participant shares via SQL or the `settle_split_participant` RPC function.
- Query unsettled / pending splits.

### 3. `analytics_queries.sql`
- Current month summary (Total Income, Total Expense, Net Saved, Savings Rate %).
- Category spending breakdown with percentage of total expense.
- 6-month historical income vs expense trends.
- Account balances breakdown (Cash vs Bank/Online).
- Top largest expenses of the current month.

---

## 💻 App Integration & Environment Variables

Make sure your `.env` in the project root includes your Supabase URL and Anon Key:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key
```

### TypeScript Client Helper
Full TypeScript database definitions and client query service methods are available in:
- [`src/types/supabase.ts`](../src/types/supabase.ts) - Complete database row and table types.
- [`src/lib/supabaseQueries.ts`](../src/lib/supabaseQueries.ts) - Pre-built typed query functions for accounts, categories, transactions, friends, and split settlements.
