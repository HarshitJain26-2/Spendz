-- ==============================================================================
-- Spendz Supabase Migration 03: Triggers, Functions & Views
-- Automated onboarding, updated_at handlers, settlement RPCs, and analytics views
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Automatic updated_at timestamp trigger function
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach to tables with updated_at
DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER trigger_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_accounts_updated_at ON public.accounts;
CREATE TRIGGER trigger_accounts_updated_at
    BEFORE UPDATE ON public.accounts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_transactions_updated_at ON public.transactions;
CREATE TRIGGER trigger_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 2. New User Registration Trigger:
--    Automatically sets up Profile, Default Accounts, and Categories on sign-up
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name TEXT;
    v_cash_id TEXT;
    v_bank_id TEXT;
BEGIN
    -- Extract full name or fallback to email prefix
    v_user_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );

    -- 1. Create Profile
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

    -- 2. Create User Settings
    INSERT INTO public.user_settings (user_id, theme_mode, has_onboarded)
    VALUES (NEW.id, 'light', false)
    ON CONFLICT (user_id) DO NOTHING;

    -- 3. Create Default Accounts (Cash & Bank)
    v_cash_id := 'acc_' || encode(gen_random_bytes(6), 'hex');
    v_bank_id := 'acc_' || encode(gen_random_bytes(6), 'hex');

    INSERT INTO public.accounts (id, user_id, name, type, balance, icon, color, is_default)
    VALUES 
        (v_cash_id, NEW.id, 'Cash', 'cash', 0.00, 'Banknote', '#10B981', true),
        (v_bank_id, NEW.id, 'Bank Account', 'bank', 0.00, 'Landmark', '#3B82F6', false)
    ON CONFLICT (id) DO NOTHING;

    -- 4. Seed Standard Default Categories for this user
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

-- Trigger to execute on user signup
DROP TRIGGER IF EXISTS trigger_on_auth_user_created ON auth.users;
CREATE TRIGGER trigger_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 3. Stored Procedure (RPC) to settle a split participant
-- ------------------------------------------------------------------------------
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

    -- Verify ownership
    IF NOT EXISTS (
        SELECT 1 FROM public.split_expenses
        WHERE id = p_split_expense_id AND user_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'Split expense not found or unauthorized';
    END IF;

    -- Update participant record
    UPDATE public.split_participants
    SET is_paid = true,
        settled_at = timezone('utc'::text, now())
    WHERE id = p_participant_id
      AND split_expense_id = p_split_expense_id
      AND user_id = v_user_id;

    -- Compute overall split status
    SELECT 
        bool_and(is_paid),
        bool_or(is_paid)
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

    -- Update parent split_expense
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
-- 4. Analytical Views for Reports and Dashboard
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
