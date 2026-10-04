-- ==============================================================================
-- Spendz Supabase Query Library: Analytics & Reporting
-- Queries for dashboard insights, monthly summaries, category breakdowns, and trends
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Current Month Financial Summary (Income, Expense, Saved, Savings Rate)
-- ------------------------------------------------------------------------------
WITH current_month_tx AS (
    SELECT
        type,
        amount
    FROM public.transactions
    WHERE user_id = auth.uid()
      AND date_trunc('month', date) = date_trunc('month', CURRENT_DATE)
)
SELECT
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0.00) AS total_income,
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0.00) AS total_expense,
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0.00) AS net_saved,
    CASE 
        WHEN COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0.00) > 0 THEN
            ROUND(
                ((COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0.00) - 
                  COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0.00)) /
                  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) * 100)::numeric,
                1
            )
        ELSE 0.0
    END AS savings_rate_percentage
FROM current_month_tx;

-- ------------------------------------------------------------------------------
-- 2. Category Spending Breakdown for Current Month (with Percentages)
-- ------------------------------------------------------------------------------
WITH expense_totals AS (
    SELECT COALESCE(SUM(amount), 1.0) AS grand_total
    FROM public.transactions
    WHERE user_id = auth.uid()
      AND type = 'expense'
      AND date_trunc('month', date) = date_trunc('month', CURRENT_DATE)
)
SELECT
    c.id AS category_id,
    c.name AS category_name,
    c.icon AS category_icon,
    c.color AS category_color,
    SUM(t.amount) AS total_spent,
    COUNT(t.id) AS transaction_count,
    ROUND((SUM(t.amount) / MAX(et.grand_total) * 100)::numeric, 1) AS percentage_of_total
FROM public.transactions t
JOIN public.categories c ON t.category_id = c.id
CROSS JOIN expense_totals et
WHERE t.user_id = auth.uid()
  AND t.type = 'expense'
  AND date_trunc('month', t.date) = date_trunc('month', CURRENT_DATE)
GROUP BY c.id, c.name, c.icon, c.color
ORDER BY total_spent DESC;

-- ------------------------------------------------------------------------------
-- 3. Monthly Trend Over the Last 6 Months (Income vs Expense)
-- ------------------------------------------------------------------------------
SELECT
    to_char(date_trunc('month', date), 'YYYY-MM') AS month_key,
    to_char(date_trunc('month', date), 'Mon YYYY') AS month_label,
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0.00) AS income,
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0.00) AS expense,
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0.00) AS net_savings
FROM public.transactions
WHERE user_id = auth.uid()
  AND date >= (date_trunc('month', CURRENT_DATE) - INTERVAL '5 months')
GROUP BY date_trunc('month', date)
ORDER BY date_trunc('month', date) ASC;

-- ------------------------------------------------------------------------------
-- 4. Total Net Worth & Account Balances (Cash vs Bank/Online)
-- ------------------------------------------------------------------------------
SELECT
    COALESCE(SUM(balance), 0.00) AS total_balance,
    COALESCE(SUM(CASE WHEN type = 'cash' THEN balance ELSE 0 END), 0.00) AS cash_balance,
    COALESCE(SUM(CASE WHEN type != 'cash' THEN balance ELSE 0 END), 0.00) AS online_balance,
    COUNT(id) AS account_count
FROM public.accounts
WHERE user_id = auth.uid();

-- ------------------------------------------------------------------------------
-- 5. Top 5 Largest Expenses of the Current Month
-- ------------------------------------------------------------------------------
SELECT
    t.id,
    t.amount,
    t.note,
    t.date,
    c.name AS category_name,
    c.icon AS category_icon,
    c.color AS category_color,
    a.name AS account_name
FROM public.transactions t
LEFT JOIN public.categories c ON t.category_id = c.id
JOIN public.accounts a ON t.account_id = a.id
WHERE t.user_id = auth.uid()
  AND t.type = 'expense'
  AND date_trunc('month', t.date) = date_trunc('month', CURRENT_DATE)
ORDER BY t.amount DESC
LIMIT 5;
