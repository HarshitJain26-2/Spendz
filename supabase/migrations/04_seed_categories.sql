-- ==============================================================================
-- Spendz Supabase Migration 04: Seed Global Categories
-- Inserts default system categories (user_id IS NULL) that any user can view
-- and reference if their account is not using per-user category copies.
-- ==============================================================================

INSERT INTO public.categories (id, user_id, name, icon, color, type, is_default)
VALUES
    -- Expense Categories
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
    
    -- Income Categories
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
