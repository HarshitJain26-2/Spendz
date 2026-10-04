-- ==============================================================================
-- Spendz: Complete Supabase Database Setup Script
-- Run this entire script in the Supabase Dashboard -> SQL Editor -> New Query
-- It sets up all tables, foreign keys, indexes, RLS, functions, triggers,
-- analytical views, and seed data.
-- ==============================================================================

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. Schema: Tables
-- ------------------------------------------------------------------------------

-- Profiles (synced with auth.users)
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

-- User Settings
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    theme_mode TEXT NOT NULL CHECK (theme_mode IN ('light', 'dark', 'system')) DEFAULT 'light',
    has_onboarded BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Accounts
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

-- Categories
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

-- Friends
CREATE TABLE IF NOT EXISTS public.friends (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    avatar_color TEXT NOT NULL DEFAULT '#4ECDC4',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_friends_user_id ON public.friends(user_id);

-- Transactions
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

-- Split Expenses
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

-- Split Participants
CREATE TABLE IF NOT EXISTS public.split_participants (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    split_expense_id TEXT NOT NULL REFERENCES public.split_expenses(id) ON DELETE CASCADE,
    friend_id TEXT REFERENCES public.friends(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
    is_paid BOOLEAN NOT NULL DEFAULT false,
    settled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_split_participants_user_id ON public.split_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_split_participants_split_id ON public.split_participants(split_expense_id);
CREATE INDEX IF NOT EXISTS idx_split_participants_friend_id ON public.split_participants(friend_id);

-- ------------------------------------------------------------------------------
-- 3. Row Level Security (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_participants ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
CREATE POLICY "Users can delete their own profile" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- User Settings
DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
CREATE POLICY "Users can view their own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
CREATE POLICY "Users can insert their own settings" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
CREATE POLICY "Users can update their own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own settings" ON public.user_settings;
CREATE POLICY "Users can delete their own settings" ON public.user_settings FOR DELETE USING (auth.uid() = user_id);

-- Accounts
DROP POLICY IF EXISTS "Users can view their own accounts" ON public.accounts;
CREATE POLICY "Users can view their own accounts" ON public.accounts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own accounts" ON public.accounts;
CREATE POLICY "Users can insert their own accounts" ON public.accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own accounts" ON public.accounts;
CREATE POLICY "Users can update their own accounts" ON public.accounts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own accounts" ON public.accounts;
CREATE POLICY "Users can delete their own accounts" ON public.accounts FOR DELETE USING (auth.uid() = user_id);

-- Categories
DROP POLICY IF EXISTS "Users can view global or own categories" ON public.categories;
CREATE POLICY "Users can view global or own categories" ON public.categories FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
DROP POLICY IF EXISTS "Users can insert their own categories" ON public.categories;
CREATE POLICY "Users can insert their own categories" ON public.categories FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own categories" ON public.categories;
CREATE POLICY "Users can update their own categories" ON public.categories FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own categories" ON public.categories;
CREATE POLICY "Users can delete their own categories" ON public.categories FOR DELETE USING (auth.uid() = user_id);

-- Friends
DROP POLICY IF EXISTS "Users can view their own friends" ON public.friends;
CREATE POLICY "Users can view their own friends" ON public.friends FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own friends" ON public.friends;
CREATE POLICY "Users can insert their own friends" ON public.friends FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own friends" ON public.friends;
CREATE POLICY "Users can update their own friends" ON public.friends FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own friends" ON public.friends;
CREATE POLICY "Users can delete their own friends" ON public.friends FOR DELETE USING (auth.uid() = user_id);

-- Transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
CREATE POLICY "Users can view their own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions;
CREATE POLICY "Users can insert their own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own transactions" ON public.transactions;
CREATE POLICY "Users can update their own transactions" ON public.transactions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own transactions" ON public.transactions;
CREATE POLICY "Users can delete their own transactions" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- Split Expenses
DROP POLICY IF EXISTS "Users can view their own split expenses" ON public.split_expenses;
CREATE POLICY "Users can view their own split expenses" ON public.split_expenses FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own split expenses" ON public.split_expenses;
CREATE POLICY "Users can insert their own split expenses" ON public.split_expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own split expenses" ON public.split_expenses;
CREATE POLICY "Users can update their own split expenses" ON public.split_expenses FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own split expenses" ON public.split_expenses;
CREATE POLICY "Users can delete their own split expenses" ON public.split_expenses FOR DELETE USING (auth.uid() = user_id);

-- Split Participants
DROP POLICY IF EXISTS "Users can view their own split participants" ON public.split_participants;
CREATE POLICY "Users can view their own split participants" ON public.split_participants FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own split participants" ON public.split_participants;
CREATE POLICY "Users can insert their own split participants" ON public.split_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own split participants" ON public.split_participants;
CREATE POLICY "Users can update their own split participants" ON public.split_participants FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own split participants" ON public.split_participants;
CREATE POLICY "Users can delete their own split participants" ON public.split_participants FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 4. Triggers & Functions
-- ------------------------------------------------------------------------------

-- Updated At handler
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER trigger_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_accounts_updated_at ON public.accounts;
CREATE TRIGGER trigger_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_transactions_updated_at ON public.transactions;
CREATE TRIGGER trigger_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- User Signup Handler: Creates Profile, Settings, Accounts, & Categories
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name TEXT;
    v_cash_id TEXT;
    v_bank_id TEXT;
BEGIN
    v_user_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );

    -- 1. Profile
    INSERT INTO public.profiles (id, email, name, full_name, avatar_url, currency)
    VALUES (NEW.id, NEW.email, v_user_name, v_user_name, NEW.raw_user_meta_data->>'avatar_url', '₹')
    ON CONFLICT (id) DO NOTHING;

    -- 2. User Settings
    INSERT INTO public.user_settings (user_id, theme_mode, has_onboarded)
    VALUES (NEW.id, 'light', false)
    ON CONFLICT (user_id) DO NOTHING;

    -- 3. Default Accounts
    v_cash_id := 'acc_' || encode(gen_random_bytes(6), 'hex');
    v_bank_id := 'acc_' || encode(gen_random_bytes(6), 'hex');

    INSERT INTO public.accounts (id, user_id, name, type, balance, icon, color, is_default)
    VALUES 
        (v_cash_id, NEW.id, 'Cash', 'cash', 0.00, 'Banknote', '#10B981', true),
        (v_bank_id, NEW.id, 'Bank Account', 'bank', 0.00, 'Landmark', '#3B82F6', false)
    ON CONFLICT (id) DO NOTHING;

    -- 4. Default Categories
    INSERT INTO public.categories (id, user_id, name, icon, color, type, is_default)
    VALUES
        ('cat_' || encode(gen_random_bytes(6), 'hex'), NEW.id, 'Food & Dining', 'UtensilsCrossed', '#FF6B6B', 'expense', true),
        ('cat_' || encode(gen_random_bytes(6), 'hex'), NEW.id, 'Transport', 'Car', '#4ECDC4', 'expense', true),
        ('cat_' || encode(gen_random_bytes(6), 'hex'), NEW.id, 'Shopping', 'ShoppingBag', '#FFE66D', 'expense', true),
        ('cat_' || encode(gen_random_bytes(6), 'hex'), NEW.id, 'Bills & Utilities', 'Receipt', '#A78BFA', 'expense', true),
        ('cat_' || encode(gen_random_bytes(6), 'hex'), NEW.id, 'Entertainment', 'Gamepad2', '#F472B6', 'expense', true),
        ('cat_' || encode(gen_random_bytes(6), 'hex'), NEW.id, 'Education', 'GraduationCap', '#60A5FA', 'expense', true),
        ('cat_' || encode(gen_random_bytes(6), 'hex'), NEW.id, 'Health', 'Heart', '#34D399', 'expense', true),
        ('cat_' || encode(gen_random_bytes(6), 'hex'), NEW.id, 'Travel', 'Plane', '#FB923C', 'expense', true),
        ('cat_' || encode(gen_random_bytes(6), 'hex'), NEW.id, 'Gifts', 'Gift', '#E879F9', 'expense', true),
        ('cat_' || encode(gen_random_bytes(6), 'hex'), NEW.id, 'Groceries', 'Apple', '#F97316', 'expense', true),
        ('cat_' || encode(gen_random_bytes(6), 'hex'), NEW.id, 'Rent', 'Home', '#8B5CF6', 'expense', true),
        ('cat_' || encode(gen_random_bytes(6), 'hex'), NEW.id, 'Subscriptions', 'CreditCard', '#06B6D4', 'expense', true),
        ('cat_' || encode(gen_random_bytes(6), 'hex'), NEW.id, 'Other', 'MoreHorizontal', '#94A3B8', 'expense', true),
        ('cat_' || encode(gen_random_bytes(6), 'hex'), NEW.id, 'Salary', 'Banknote', '#22C55E', 'income', true),
        ('cat_' || encode(gen_random_bytes(6), 'hex'), NEW.id, 'Freelance', 'Laptop', '#10B981', 'income', true),
        ('cat_' || encode(gen_random_bytes(6), 'hex'), NEW.id, 'Investment', 'TrendingUp', '#6366F1', 'income', true),
        ('cat_' || encode(gen_random_bytes(6), 'hex'), NEW.id, 'Refund', 'RotateCcw', '#F59E0B', 'income', true),
        ('cat_' || encode(gen_random_bytes(6), 'hex'), NEW.id, 'Gift Received', 'Gift', '#EC4899', 'income', true),
        ('cat_' || encode(gen_random_bytes(6), 'hex'), NEW.id, 'Other Income', 'Plus', '#94A3B8', 'income', true)
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_on_auth_user_created ON auth.users;
CREATE TRIGGER trigger_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Settle participant RPC
CREATE OR REPLACE FUNCTION public.settle_split_participant(
    p_split_expense_id TEXT,
    p_participant_id TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_all_paid BOOLEAN;
    v_any_paid BOOLEAN;
    v_new_status TEXT;
    v_result JSONB;
BEGIN
    v_user_id := auth.uid();

    IF NOT EXISTS (
        SELECT 1 FROM public.split_expenses
        WHERE id = p_split_expense_id AND user_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'Split expense not found or unauthorized';
    END IF;

    UPDATE public.split_participants
    SET is_paid = true,
        settled_at = timezone('utc'::text, now())
    WHERE id = p_participant_id
      AND split_expense_id = p_split_expense_id
      AND user_id = v_user_id;

    SELECT bool_and(is_paid), bool_or(is_paid)
    INTO v_all_paid, v_any_paid
    FROM public.split_participants
    WHERE split_expense_id = p_split_expense_id;

    IF v_all_paid THEN
        v_new_status := 'settled';
    ELSIF v_any_paid THEN
        v_new_status := 'partial';
    ELSE
        v_new_status := 'pending';
    END IF;

    UPDATE public.split_expenses
    SET status = v_new_status
    WHERE id = p_split_expense_id;

    SELECT jsonb_build_object(
        'split_expense_id', p_split_expense_id,
        'participant_id', p_participant_id,
        'status', v_new_status
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 5. Seed Global Categories
-- ------------------------------------------------------------------------------
INSERT INTO public.categories (id, user_id, name, icon, color, type, is_default)
VALUES
    ('cat_global_food', NULL, 'Food & Dining', 'UtensilsCrossed', '#FF6B6B', 'expense', true),
    ('cat_global_transport', NULL, 'Transport', 'Car', '#4ECDC4', 'expense', true),
    ('cat_global_shopping', NULL, 'Shopping', 'ShoppingBag', '#FFE66D', 'expense', true),
    ('cat_global_bills', NULL, 'Bills & Utilities', 'Receipt', '#A78BFA', 'expense', true),
    ('cat_global_entertainment', NULL, 'Entertainment', 'Gamepad2', '#F472B6', 'expense', true),
    ('cat_global_education', NULL, 'Education', 'GraduationCap', '#60A5FA', 'expense', true),
    ('cat_global_health', NULL, 'Health', 'Heart', '#34D399', 'expense', true),
    ('cat_global_travel', NULL, 'Travel', 'Plane', '#FB923C', 'expense', true),
    ('cat_global_gifts', NULL, 'Gifts', 'Gift', '#E879F9', 'expense', true),
    ('cat_global_groceries', NULL, 'Groceries', 'Apple', '#F97316', 'expense', true),
    ('cat_global_rent', NULL, 'Rent', 'Home', '#8B5CF6', 'expense', true),
    ('cat_global_subscriptions', NULL, 'Subscriptions', 'CreditCard', '#06B6D4', 'expense', true),
    ('cat_global_other_exp', NULL, 'Other', 'MoreHorizontal', '#94A3B8', 'expense', true),
    ('cat_global_salary', NULL, 'Salary', 'Banknote', '#22C55E', 'income', true),
    ('cat_global_freelance', NULL, 'Freelance', 'Laptop', '#10B981', 'income', true),
    ('cat_global_investment', NULL, 'Investment', 'TrendingUp', '#6366F1', 'income', true),
    ('cat_global_refund', NULL, 'Refund', 'RotateCcw', '#F59E0B', 'income', true),
    ('cat_global_gift_inc', NULL, 'Gift Received', 'Gift', '#EC4899', 'income', true),
    ('cat_global_other_inc', NULL, 'Other Income', 'Plus', '#94A3B8', 'income', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    type = EXCLUDED.type,
    is_default = EXCLUDED.is_default;
