# Spendz 💰

Spendz is a modern personal finance and expense sharing mobile & web application built with **React Native (Expo)**, **TypeScript**, **Zustand**, and **Supabase**.

---

## ✨ Features

- 📊 **Expense & Income Tracking**: Track transactions across multiple accounts (Cash, Bank, Wallet, Card).
- 🤝 **Split Expenses & Friends**: Split group bills equally or with custom amounts, and track who owes who.
- ⚡ **Multi-Account Balances**: Real-time balance updates across cash and digital accounts.
- 🔐 **Supabase Cloud Backend & Auth**: Cloud persistence with email/password authentication and Row Level Security (RLS).
- 🌓 **Dark & Light Modes**: Beautiful UI tailored for both light and dark preferences.
- 📱 **Cross-Platform**: Runs seamlessly on Android, iOS, and Web.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create or edit `.env` in the root directory:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Setup Supabase Cloud Database
Spendz includes a complete SQL setup script and migration suite under the [`supabase/`](./supabase/) folder:
- **1-Minute Setup**: Open the [Supabase Dashboard](https://supabase.com/dashboard) -> **SQL Editor**, paste the contents of [`supabase/full_setup.sql`](./supabase/full_setup.sql), and run it.
- **Detailed Documentation**: See [`supabase/README.md`](./supabase/README.md) for table schemas, RLS policies, automated signup triggers, and the query library.

### 4. Start the Application
```bash
npx expo start
```
From the interactive terminal menu, press:
- `w` to open on the **Web**
- `a` to open in an **Android Emulator**
- `i` to open in an **iOS Simulator**

---

## 🗄️ Database & Queries

Detailed documentation on the cloud schema, automated triggers, and query libraries:
- 📖 [Supabase Documentation & Query Guides](./supabase/README.md)
- ⚡ [All-in-One SQL Setup Script](./supabase/full_setup.sql)
- 📜 [Migrations](./supabase/migrations/)
- 🔍 [Transactions, Splits & Analytics Queries](./supabase/queries/)

