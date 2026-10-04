-- ==============================================================================
-- Spendz Supabase Query Library: Transactions
-- Queries for retrieving, inserting, filtering, and analyzing transactions
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Fetch Recent Transactions with Categories and Accounts Joined
-- ------------------------------------------------------------------------------
-- Replace :user_id with the active user UUID, or in Supabase client auth.uid() handles RLS
SELECT
    t.id,
    t.type,
    t.amount,
    t.note,
    t.date,
    t.created_at,
    t.updated_at,
    -- Account Info
    json_build_object(
        'id', a.id,
        'name', a.name,
        'type', a.type,
        'icon', a.icon,
        'color', a.color,
        'balance', a.balance
    ) AS account,
    -- Destination Account (if transfer)
    CASE 
        WHEN t.to_account_id IS NOT NULL THEN
            json_build_object(
                'id', ta.id,
                'name', ta.name,
                'type', ta.type,
                'icon', ta.icon,
                'color', ta.color
            )
        ELSE NULL
    END AS to_account,
    -- Category Info (if expense or income)
    CASE 
        WHEN t.category_id IS NOT NULL THEN
            json_build_object(
                'id', c.id,
                'name', c.name,
                'icon', c.icon,
                'color', c.color,
                'type', c.type
            )
        ELSE NULL
    END AS category
FROM public.transactions t
JOIN public.accounts a ON t.account_id = a.id
LEFT JOIN public.accounts ta ON t.to_account_id = ta.id
LEFT JOIN public.categories c ON t.category_id = c.id
WHERE t.user_id = auth.uid()
ORDER BY t.date DESC, t.created_at DESC
LIMIT 50;

-- ------------------------------------------------------------------------------
-- 2. Fetch Transactions for a Specific Month (e.g., '2026-10')
-- ------------------------------------------------------------------------------
SELECT
    t.*,
    c.name AS category_name,
    c.icon AS category_icon,
    c.color AS category_color,
    a.name AS account_name
FROM public.transactions t
LEFT JOIN public.categories c ON t.category_id = c.id
JOIN public.accounts a ON t.account_id = a.id
WHERE t.user_id = auth.uid()
  AND to_char(t.date, 'YYYY-MM') = '2026-10'
ORDER BY t.date DESC;

-- ------------------------------------------------------------------------------
-- 3. Search Transactions by Note or Category Name
-- ------------------------------------------------------------------------------
SELECT
    t.id,
    t.type,
    t.amount,
    t.note,
    t.date,
    c.name AS category_name,
    a.name AS account_name
FROM public.transactions t
LEFT JOIN public.categories c ON t.category_id = c.id
JOIN public.accounts a ON t.account_id = a.id
WHERE t.user_id = auth.uid()
  AND (
      t.note ILIKE '%grocery%' 
      OR c.name ILIKE '%grocery%'
  )
ORDER BY t.date DESC;

-- ------------------------------------------------------------------------------
-- 4. Insert New Transaction & Automatically Adjust Account Balance(s)
-- (Atomic transaction handling)
-- ------------------------------------------------------------------------------
-- Expense example:
BEGIN;
    INSERT INTO public.transactions (
        id, user_id, type, amount, category_id, account_id, note, date
    ) VALUES (
        'tx_' || encode(gen_random_bytes(6), 'hex'),
        auth.uid(),
        'expense',
        450.00,
        'cat_global_food',
        'acc_cash_123',
        'Dinner with friends',
        now()
    );

    UPDATE public.accounts
    SET balance = balance - 450.00,
        updated_at = now()
    WHERE id = 'acc_cash_123' AND user_id = auth.uid();
COMMIT;

-- Transfer example:
BEGIN;
    INSERT INTO public.transactions (
        id, user_id, type, amount, account_id, to_account_id, note, date
    ) VALUES (
        'tx_' || encode(gen_random_bytes(6), 'hex'),
        auth.uid(),
        'transfer',
        2000.00,
        'acc_bank_123',
        'acc_cash_123',
        'ATM Cash Withdrawal',
        now()
    );

    UPDATE public.accounts
    SET balance = balance - 2000.00,
        updated_at = now()
    WHERE id = 'acc_bank_123' AND user_id = auth.uid();

    UPDATE public.accounts
    SET balance = balance + 2000.00,
        updated_at = now()
    WHERE id = 'acc_cash_123' AND user_id = auth.uid();
COMMIT;

-- ------------------------------------------------------------------------------
-- 5. Delete Transaction and Safely Reverse Balance
-- ------------------------------------------------------------------------------
-- For Expense reversal:
BEGIN;
    UPDATE public.accounts
    SET balance = balance + t.amount,
        updated_at = now()
    FROM public.transactions t
    WHERE t.id = 'target_transaction_id'
      AND t.account_id = accounts.id
      AND t.type = 'expense'
      AND t.user_id = auth.uid();

    DELETE FROM public.transactions
    WHERE id = 'target_transaction_id' AND user_id = auth.uid();
COMMIT;
