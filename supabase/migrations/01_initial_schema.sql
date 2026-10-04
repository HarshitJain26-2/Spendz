-- ==============================================================================
-- Spendz Supabase Migration 01: Initial Schema
-- Tables: profiles, user_settings, accounts, categories, transactions,
--         friends, split_expenses, split_participants
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. Profiles Table (extends auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    name TEXT,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    currency TEXT NOT NULL DEFAULT '₹',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.profiles IS 'User profile information synced with auth.users';

-- ------------------------------------------------------------------------------
-- 2. User Settings Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    theme_mode TEXT NOT NULL CHECK (theme_mode IN ('light', 'dark', 'system')) DEFAULT 'light',
    has_onboarded BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.user_settings IS 'User application preferences and onboarding state';

-- ------------------------------------------------------------------------------
-- 3. Accounts Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.accounts (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'wallet', 'card', 'custom')),
    balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    icon TEXT NOT NULL DEFAULT 'Wallet',
    color TEXT NOT NULL DEFAULT '#3B82F6',
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);
COMMENT ON TABLE public.accounts IS 'Financial accounts (Cash, Bank, Wallet, Card, Custom) owned by user';

-- ------------------------------------------------------------------------------
-- 4. Categories Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON public.categories(type);
COMMENT ON TABLE public.categories IS 'Expense and Income categories per user or global templates';

-- ------------------------------------------------------------------------------
-- 5. Friends Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.friends (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    avatar_color TEXT NOT NULL DEFAULT '#4ECDC4',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_friends_user_id ON public.friends(user_id);
COMMENT ON TABLE public.friends IS 'Friends list for bill splitting and debt tracking';

-- ------------------------------------------------------------------------------
-- 6. Transactions Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
    category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
    account_id TEXT NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    to_account_id TEXT REFERENCES public.accounts(id) ON DELETE SET NULL,
    note TEXT NOT NULL DEFAULT '',
    date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON public.transactions(category_id);
COMMENT ON TABLE public.transactions IS 'Income, Expense, and Transfer transactions';

-- ------------------------------------------------------------------------------
-- 7. Split Expenses Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.split_expenses (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_id TEXT NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    total_amount NUMERIC(14, 2) NOT NULL CHECK (total_amount >= 0),
    split_method TEXT NOT NULL CHECK (split_method IN ('equal', 'custom')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'partial', 'settled')) DEFAULT 'pending',
    paid_by_type TEXT NOT NULL CHECK (paid_by_type IN ('me', 'friend')) DEFAULT 'me',
    paid_by_friend_id TEXT REFERENCES public.friends(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_split_expenses_user_id ON public.split_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_split_expenses_tx_id ON public.split_expenses(transaction_id);
CREATE INDEX IF NOT EXISTS idx_split_expenses_paid_by ON public.split_expenses(paid_by_friend_id);
COMMENT ON TABLE public.split_expenses IS 'Group and peer bill splits associated with a transaction';

-- ------------------------------------------------------------------------------
-- 8. Split Participants Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.split_participants (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    split_expense_id TEXT NOT NULL REFERENCES public.split_expenses(id) ON DELETE CASCADE,
    friend_id TEXT REFERENCES public.friends(id) ON DELETE SET NULL, -- NULL represents the current user ("You")
    name TEXT NOT NULL,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
    is_paid BOOLEAN NOT NULL DEFAULT false,
    settled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_split_participants_user_id ON public.split_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_split_participants_split_id ON public.split_participants(split_expense_id);
CREATE INDEX IF NOT EXISTS idx_split_participants_friend_id ON public.split_participants(friend_id);
COMMENT ON TABLE public.split_participants IS 'Individual share per participant in a split expense';
