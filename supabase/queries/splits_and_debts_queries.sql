-- ==============================================================================
-- Spendz Supabase Query Library: Splits and Debts
-- Queries for group bill splitting, participants, friend debt balances, and settlements
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Fetch All Split Expenses with Participants and Friends Joined
-- ------------------------------------------------------------------------------
SELECT
    se.id,
    se.transaction_id,
    se.total_amount,
    se.split_method,
    se.status,
    se.paid_by_type,
    se.paid_by_friend_id,
    se.created_at,
    -- Payer details if a friend paid
    CASE 
        WHEN se.paid_by_friend_id IS NOT NULL THEN
            json_build_object(
                'id', pf.id,
                'name', pf.name,
                'avatar_color', pf.avatar_color
            )
        ELSE NULL
    END AS paid_by_friend,
    -- Transaction details
    json_build_object(
        'note', t.note,
        'date', t.date,
        'amount', t.amount
    ) AS transaction,
    -- Participants List
    COALESCE(
        json_agg(
            json_build_object(
                'id', p.id,
                'friend_id', p.friend_id,
                'name', p.name,
                'amount', p.amount,
                'is_paid', p.is_paid,
                'settled_at', p.settled_at,
                'avatar_color', f.avatar_color
            ) ORDER BY p.is_paid ASC, p.name ASC
        ) FILTER (WHERE p.id IS NOT NULL),
        '[]'::json
    ) AS participants
FROM public.split_expenses se
JOIN public.transactions t ON se.transaction_id = t.id
LEFT JOIN public.friends pf ON se.paid_by_friend_id = pf.id
LEFT JOIN public.split_participants p ON se.id = p.split_expense_id
LEFT JOIN public.friends f ON p.friend_id = f.id
WHERE se.user_id = auth.uid()
GROUP BY se.id, t.note, t.date, t.amount, pf.id, pf.name, pf.avatar_color
ORDER BY se.created_at DESC;

-- ------------------------------------------------------------------------------
-- 2. Net Friend Balances (Who owes who)
--    Positive balance = Friend owes you
--    Negative balance = You owe friend
-- ------------------------------------------------------------------------------
WITH friend_debts AS (
    -- Case A: You paid ('me'), and the friend is an unpaid participant -> Friend owes you (+)
    SELECT
        p.friend_id,
        p.amount AS amount_delta
    FROM public.split_expenses se
    JOIN public.split_participants p ON se.id = p.split_expense_id
    WHERE se.user_id = auth.uid()
      AND se.paid_by_type = 'me'
      AND p.friend_id IS NOT NULL
      AND p.is_paid = false

    UNION ALL

    -- Case B: Friend paid ('friend'), and your share (friend_id IS NULL) is unpaid -> You owe friend (-)
    SELECT
        se.paid_by_friend_id AS friend_id,
        -p.amount AS amount_delta
    FROM public.split_expenses se
    JOIN public.split_participants p ON se.id = p.split_expense_id
    WHERE se.user_id = auth.uid()
      AND se.paid_by_type = 'friend'
      AND p.friend_id IS NULL
      AND p.is_paid = false
)
SELECT
    f.id AS friend_id,
    f.name AS friend_name,
    f.avatar_color,
    f.phone,
    COALESCE(SUM(fd.amount_delta), 0.00) AS net_balance,
    CASE 
        WHEN COALESCE(SUM(fd.amount_delta), 0.00) > 0 THEN 'owes_you'
        WHEN COALESCE(SUM(fd.amount_delta), 0.00) < 0 THEN 'you_owe'
        ELSE 'settled'
    END AS debt_status
FROM public.friends f
LEFT JOIN friend_debts fd ON f.id = fd.friend_id
WHERE f.user_id = auth.uid()
GROUP BY f.id, f.name, f.avatar_color, f.phone
ORDER BY net_balance DESC;

-- ------------------------------------------------------------------------------
-- 3. Settle a Participant's Share (Direct SQL alternative to RPC)
-- ------------------------------------------------------------------------------
BEGIN;
    -- Mark participant as paid
    UPDATE public.split_participants
    SET is_paid = true,
        settled_at = now()
    WHERE id = 'target_participant_id'
      AND split_expense_id = 'target_split_expense_id'
      AND user_id = auth.uid();

    -- Re-evaluate split status
    UPDATE public.split_expenses se
    SET status = CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM public.split_participants 
            WHERE split_expense_id = se.id AND is_paid = false
        ) THEN 'settled'
        ELSE 'partial'
    END
    WHERE id = 'target_split_expense_id'
      AND user_id = auth.uid();
COMMIT;

-- ------------------------------------------------------------------------------
-- 4. Get All Unsettled / Pending Splits
-- ------------------------------------------------------------------------------
SELECT
    se.id,
    se.total_amount,
    se.split_method,
    se.status,
    se.paid_by_type,
    t.note,
    t.date
FROM public.split_expenses se
JOIN public.transactions t ON se.transaction_id = t.id
WHERE se.user_id = auth.uid()
  AND se.status IN ('pending', 'partial')
ORDER BY se.created_at DESC;
