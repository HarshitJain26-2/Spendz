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
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

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
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_user_name TEXT;
    v_cash_id TEXT;
    v_bank_id TEXT;
BEGIN
    -- Fallback name extraction
    v_user_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1),
        'User'
    );

    -- 1. Profile
    INSERT INTO public.profiles (id, email, name, full_name, avatar_url, currency)
    VALUES (
        NEW.id,
        NEW.email,
        v_user_name,
        v_user_name,
        NEW.raw_user_meta_data->>'avatar_url',
        '₹'
    )
    ON CONFLICT (id) DO NOTHING;

    -- 2. User Settings
    INSERT INTO public.user_settings (user_id, theme_mode, has_onboarded)
    VALUES (NEW.id, 'light', false)
    ON CONFLICT (user_id) DO NOTHING;

    -- 3. Default Accounts (Using built-in gen_random_uuid)
    v_cash_id := 'acc_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
    v_bank_id := 'acc_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);

    INSERT INTO public.accounts (id, user_id, name, type, balance, icon, color, is_default)
    VALUES 
        (v_cash_id, NEW.id, 'Cash', 'cash', 0.00, 'Banknote', '#10B981', true),
        (v_bank_id, NEW.id, 'Bank Account', 'bank', 0.00, 'Landmark', '#3B82F6', false)
    ON CONFLICT (id) DO NOTHING;

    -- 4. Default Categories
    INSERT INTO public.categories (id, user_id, name, icon, color, type, is_default)
    VALUES
        ('cat_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12), NEW.id, 'Food & Dining', 'UtensilsCrossed', '#FF6B6B', 'expense', true),
        ('cat_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12), NEW.id, 'Transport', 'Car', '#4ECDC4', 'expense', true),
        ('cat_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12), NEW.id, 'Shopping', 'ShoppingBag', '#FFE66D', 'expense', true),
        ('cat_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12), NEW.id, 'Bills & Utilities', 'Receipt', '#A78BFA', 'expense', true),
        ('cat_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12), NEW.id, 'Entertainment', 'Gamepad2', '#F472B6', 'expense', true),
        ('cat_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12), NEW.id, 'Education', 'GraduationCap', '#60A5FA', 'expense', true),
        ('cat_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12), NEW.id, 'Health', 'Heart', '#34D399', 'expense', true),
        ('cat_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12), NEW.id, 'Travel', 'Plane', '#FB923C', 'expense', true),
        ('cat_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12), NEW.id, 'Gifts', 'Gift', '#E879F9', 'expense', true),
        ('cat_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12), NEW.id, 'Groceries', 'Apple', '#F97316', 'expense', true),
        ('cat_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12), NEW.id, 'Rent', 'Home', '#8B5CF6', 'expense', true),
        ('cat_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12), NEW.id, 'Subscriptions', 'CreditCard', '#06B6D4', 'expense', true),
        ('cat_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12), NEW.id, 'Other', 'MoreHorizontal', '#94A3B8', 'expense', true),
        ('cat_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12), NEW.id, 'Salary', 'Banknote', '#22C55E', 'income', true),
        ('cat_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12), NEW.id, 'Freelance', 'Laptop', '#10B981', 'income', true),
        ('cat_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12), NEW.id, 'Investment', 'TrendingUp', '#6366F1', 'income', true),
        ('cat_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12), NEW.id, 'Refund', 'RotateCcw', '#F59E0B', 'income', true),
        ('cat_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12), NEW.id, 'Gift Received', 'Gift', '#EC4899', 'income', true),
        ('cat_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12), NEW.id, 'Other Income', 'Plus', '#94A3B8', 'income', true)
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'handle_new_user failed: %', SQLERRM;
        RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_on_auth_user_created ON auth.users;
CREATE TRIGGER trigger_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Settle participant RPC
CREATE OR REPLACE FUNCTION public.settle_split_participant(
    p_split_expense_id TEXT,
    p_participant_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
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
$$;

-- ------------------------------------------------------------------------------
-- 5. Analytical Views for Reports and Dashboard
-- ------------------------------------------------------------------------------

-- Monthly Income, Expense, and Savings View
CREATE OR REPLACE VIEW public.view_user_monthly_summary AS
SELECT
    user_id,
    to_char(date, 'YYYY-MM') AS month_key,
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense,
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) AS net_saved,
    COUNT(id) AS transaction_count
FROM public.transactions
GROUP BY user_id, to_char(date, 'YYYY-MM');

-- Category Breakdown View
CREATE OR REPLACE VIEW public.view_user_category_spending AS
SELECT
    t.user_id,
    to_char(t.date, 'YYYY-MM') AS month_key,
    c.id AS category_id,
    c.name AS category_name,
    c.icon AS category_icon,
    c.color AS category_color,
    SUM(t.amount) AS total_amount,
    COUNT(t.id) AS transaction_count
FROM public.transactions t
JOIN public.categories c ON t.category_id = c.id
WHERE t.type = 'expense'
GROUP BY t.user_id, to_char(t.date, 'YYYY-MM'), c.id, c.name, c.icon, c.color;

-- ------------------------------------------------------------------------------
-- 6. Seed Global Categories
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

-- ------------------------------------------------------------------------------
-- 7. Groups, Members, and Invites (with RLS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT '🏖',
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.group_members (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.group_invites (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_invites_code ON public.group_invites(code);
CREATE INDEX IF NOT EXISTS idx_group_invites_group_id ON public.group_invites(group_id);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view active invites" ON public.group_invites;
CREATE POLICY "Anyone authenticated can view active invites"
ON public.group_invites FOR SELECT
TO authenticated
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- ------------------------------------------------------------------------------
-- Helper Functions (SECURITY DEFINER to avoid RLS recursion)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_group_member(check_group_id TEXT, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.group_members
        WHERE group_id = check_group_id
        AND user_id = check_user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(check_group_id TEXT, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.group_members
        WHERE group_id = check_group_id
        AND user_id = check_user_id
        AND role IN ('admin', 'owner')
    );
$$;

CREATE OR REPLACE FUNCTION public.group_has_members(check_group_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.group_members
        WHERE group_id = check_group_id
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_group_member(TEXT, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_group_admin(TEXT, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.group_has_members(TEXT) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Group members can view all invites" ON public.group_invites;
CREATE POLICY "Group members can view all invites"
ON public.group_invites FOR SELECT
TO authenticated
USING (
    public.is_group_member(group_invites.group_id, auth.uid())
);

DROP POLICY IF EXISTS "Group members can create invites" ON public.group_invites;
CREATE POLICY "Group members can create invites"
ON public.group_invites FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Group members can update invites" ON public.group_invites;
CREATE POLICY "Group members can update invites"
ON public.group_invites FOR UPDATE
TO authenticated
USING (
    public.is_group_member(group_invites.group_id, auth.uid())
);

DROP POLICY IF EXISTS "Users can view groups they belong to or preview via active invite" ON public.groups;
DROP POLICY IF EXISTS "Users can view groups they belong to, created, or preview via active invite" ON public.groups;
CREATE POLICY "Users can view groups they belong to, created, or preview via active invite"
ON public.groups FOR SELECT
TO authenticated
USING (
    created_by = auth.uid()
    OR
    public.is_group_member(groups.id, auth.uid())
    OR
    EXISTS (
        SELECT 1 FROM public.group_invites
        WHERE group_invites.group_id = groups.id
        AND group_invites.is_active = true
        AND (group_invites.expires_at IS NULL OR group_invites.expires_at > now())
    )
);

DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Authenticated users can create their own groups" ON public.groups;
CREATE POLICY "Authenticated users can create their own groups"
ON public.groups FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = created_by
);

DROP POLICY IF EXISTS "Group members can update group details" ON public.groups;
DROP POLICY IF EXISTS "Group owners or members can update group details" ON public.groups;
CREATE POLICY "Group owners or members can update group details"
ON public.groups FOR UPDATE
TO authenticated
USING (
    created_by = auth.uid()
    OR
    public.is_group_member(groups.id, auth.uid())
)
WITH CHECK (
    created_by = auth.uid()
    OR
    public.is_group_member(groups.id, auth.uid())
);

DROP POLICY IF EXISTS "Group owners can delete groups" ON public.groups;
CREATE POLICY "Group owners can delete groups"
ON public.groups FOR DELETE
TO authenticated
USING (
    created_by = auth.uid()
);

DROP POLICY IF EXISTS "Users can view group members of their groups or active invite preview" ON public.group_members;
CREATE POLICY "Users can view group members of their groups or active invite preview"
ON public.group_members FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR
    public.is_group_member(group_id, auth.uid())
    OR
    EXISTS (
        SELECT 1 FROM public.group_invites gi
        WHERE gi.group_id = group_members.group_id
        AND gi.is_active = true
        AND (gi.expires_at IS NULL OR gi.expires_at > now())
    )
);

DROP POLICY IF EXISTS "Users can insert their own membership" ON public.group_members;
CREATE POLICY "Users can insert their own membership"
ON public.group_members FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own membership or admins update" ON public.group_members;
CREATE POLICY "Users can update their own membership or admins update"
ON public.group_members FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid()
    OR
    public.is_group_admin(group_id, auth.uid())
)
WITH CHECK (
    user_id = auth.uid()
    OR
    public.is_group_admin(group_id, auth.uid())
);

DROP POLICY IF EXISTS "Users can leave group or admins remove" ON public.group_members;
CREATE POLICY "Users can leave group or admins remove"
ON public.group_members FOR DELETE
TO authenticated
USING (
    user_id = auth.uid()
    OR
    public.is_group_admin(group_id, auth.uid())
);

-- ------------------------------------------------------------------------------
-- 8. Group Expenses, Participants & Settlements
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.group_expenses (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    paid_by_member_id TEXT REFERENCES public.group_members(id) ON DELETE SET NULL,
    paid_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    date TEXT NOT NULL,
    split_method TEXT NOT NULL DEFAULT 'equal',
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_group_expenses_group_id ON public.group_expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_group_expenses_created_by ON public.group_expenses(created_by);

CREATE TABLE IF NOT EXISTS public.group_expense_participants (
    id TEXT PRIMARY KEY,
    group_expense_id TEXT NOT NULL REFERENCES public.group_expenses(id) ON DELETE CASCADE,
    group_id TEXT NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    member_id TEXT REFERENCES public.group_members(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    share_amount NUMERIC NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_group_expense_participants_expense_id ON public.group_expense_participants(group_expense_id);
CREATE INDEX IF NOT EXISTS idx_group_expense_participants_group_id ON public.group_expense_participants(group_id);

CREATE TABLE IF NOT EXISTS public.group_settlements (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    from_member_id TEXT REFERENCES public.group_members(id) ON DELETE SET NULL,
    from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    to_member_id TEXT REFERENCES public.group_members(id) ON DELETE SET NULL,
    to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    amount NUMERIC NOT NULL,
    date TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_group_settlements_group_id ON public.group_settlements(group_id);

ALTER TABLE public.group_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_expense_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Group members can view group expenses" ON public.group_expenses;
CREATE POLICY "Group members can view group expenses"
ON public.group_expenses FOR SELECT
TO authenticated
USING (public.is_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "Group members can insert group expenses" ON public.group_expenses;
CREATE POLICY "Group members can insert group expenses"
ON public.group_expenses FOR INSERT
TO authenticated
WITH CHECK (public.is_group_member(group_id, auth.uid()) AND (created_by = auth.uid() OR created_by IS NULL));

DROP POLICY IF EXISTS "Group members can update group expenses" ON public.group_expenses;
CREATE POLICY "Group members can update group expenses"
ON public.group_expenses FOR UPDATE
TO authenticated
USING (public.is_group_member(group_id, auth.uid()))
WITH CHECK (public.is_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "Group members can delete group expenses" ON public.group_expenses;
CREATE POLICY "Group members can delete group expenses"
ON public.group_expenses FOR DELETE
TO authenticated
USING (public.is_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "Group members can view expense participants" ON public.group_expense_participants;
CREATE POLICY "Group members can view expense participants"
ON public.group_expense_participants FOR SELECT
TO authenticated
USING (public.is_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "Group members can insert expense participants" ON public.group_expense_participants;
CREATE POLICY "Group members can insert expense participants"
ON public.group_expense_participants FOR INSERT
TO authenticated
WITH CHECK (public.is_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "Group members can update expense participants" ON public.group_expense_participants;
CREATE POLICY "Group members can update expense participants"
ON public.group_expense_participants FOR UPDATE
TO authenticated
USING (public.is_group_member(group_id, auth.uid()))
WITH CHECK (public.is_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "Group members can delete expense participants" ON public.group_expense_participants;
CREATE POLICY "Group members can delete expense participants"
ON public.group_expense_participants FOR DELETE
TO authenticated
USING (public.is_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "Group members can view group settlements" ON public.group_settlements;
CREATE POLICY "Group members can view group settlements"
ON public.group_settlements FOR SELECT
TO authenticated
USING (public.is_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "Group members can insert group settlements" ON public.group_settlements;
CREATE POLICY "Group members can insert group settlements"
ON public.group_settlements FOR INSERT
TO authenticated
WITH CHECK (public.is_group_member(group_id, auth.uid()) AND (created_by = auth.uid() OR created_by IS NULL));

DROP POLICY IF EXISTS "Group members can update group settlements" ON public.group_settlements;
CREATE POLICY "Group members can update group settlements"
ON public.group_settlements FOR UPDATE
TO authenticated
USING (public.is_group_member(group_id, auth.uid()))
WITH CHECK (public.is_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "Group members can delete group settlements" ON public.group_settlements;
CREATE POLICY "Group members can delete group settlements"
ON public.group_settlements FOR DELETE
TO authenticated
USING (public.is_group_member(group_id, auth.uid()));

-- Realtime Configuration
DO $$
BEGIN
    ALTER TABLE public.groups REPLICA IDENTITY FULL;
    ALTER TABLE public.group_members REPLICA IDENTITY FULL;
    ALTER TABLE public.group_expenses REPLICA IDENTITY FULL;
    ALTER TABLE public.group_expense_participants REPLICA IDENTITY FULL;
    ALTER TABLE public.group_settlements REPLICA IDENTITY FULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.groups; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.group_expenses; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.group_expense_participants; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.group_settlements; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ------------------------------------------------------------------------------
-- 9. Grant Permissions to standard Supabase roles
-- ------------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;


