-- ==============================================================================
-- Spendz Supabase Migration 02: Row Level Security (RLS)
-- Protects user data so that users can only access and modify their own rows.
-- ==============================================================================

-- 1. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_participants ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- Profiles Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete their own profile"
    ON public.profiles FOR DELETE
    USING (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- User Settings Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view their own settings"
    ON public.user_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
    ON public.user_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
    ON public.user_settings FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings"
    ON public.user_settings FOR DELETE
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- Accounts Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view their own accounts"
    ON public.accounts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own accounts"
    ON public.accounts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounts"
    ON public.accounts FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accounts"
    ON public.accounts FOR DELETE
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- Categories Policies
-- (Allows viewing system defaults where user_id IS NULL, and user-created categories)
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view global or own categories"
    ON public.categories FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own categories"
    ON public.categories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
    ON public.categories FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
    ON public.categories FOR DELETE
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- Friends Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view their own friends"
    ON public.friends FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own friends"
    ON public.friends FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own friends"
    ON public.friends FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own friends"
    ON public.friends FOR DELETE
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- Transactions Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view their own transactions"
    ON public.transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
    ON public.transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
    ON public.transactions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
    ON public.transactions FOR DELETE
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- Split Expenses Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view their own split expenses"
    ON public.split_expenses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own split expenses"
    ON public.split_expenses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own split expenses"
    ON public.split_expenses FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own split expenses"
    ON public.split_expenses FOR DELETE
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- Split Participants Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view their own split participants"
    ON public.split_participants FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own split participants"
    ON public.split_participants FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own split participants"
    ON public.split_participants FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own split participants"
    ON public.split_participants FOR DELETE
    USING (auth.uid() = user_id);
