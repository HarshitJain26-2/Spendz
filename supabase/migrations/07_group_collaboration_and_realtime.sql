-- ==============================================================================
-- Spendz Migration 07: Full Group Collaboration, Expenses, Settlements & Realtime
-- Enables shared group expenses, participants, settlements, RLS, and Realtime sync
-- ==============================================================================

-- 1. Create public.group_expenses table
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

-- 2. Create public.group_expense_participants table
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

-- 3. Create public.group_settlements table
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

-- 4. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.group_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_expense_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_settlements ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies: group_expenses
DROP POLICY IF EXISTS "Group members can view group expenses" ON public.group_expenses;
CREATE POLICY "Group members can view group expenses"
ON public.group_expenses FOR SELECT
TO authenticated
USING (
    public.is_group_member(group_id, auth.uid())
);

DROP POLICY IF EXISTS "Group members can insert group expenses" ON public.group_expenses;
CREATE POLICY "Group members can insert group expenses"
ON public.group_expenses FOR INSERT
TO authenticated
WITH CHECK (
    public.is_group_member(group_id, auth.uid())
    AND (created_by = auth.uid() OR created_by IS NULL)
);

DROP POLICY IF EXISTS "Group members can update group expenses" ON public.group_expenses;
CREATE POLICY "Group members can update group expenses"
ON public.group_expenses FOR UPDATE
TO authenticated
USING (
    public.is_group_member(group_id, auth.uid())
)
WITH CHECK (
    public.is_group_member(group_id, auth.uid())
);

DROP POLICY IF EXISTS "Group members can delete group expenses" ON public.group_expenses;
CREATE POLICY "Group members can delete group expenses"
ON public.group_expenses FOR DELETE
TO authenticated
USING (
    public.is_group_member(group_id, auth.uid())
);

-- 6. RLS Policies: group_expense_participants
DROP POLICY IF EXISTS "Group members can view expense participants" ON public.group_expense_participants;
CREATE POLICY "Group members can view expense participants"
ON public.group_expense_participants FOR SELECT
TO authenticated
USING (
    public.is_group_member(group_id, auth.uid())
);

DROP POLICY IF EXISTS "Group members can insert expense participants" ON public.group_expense_participants;
CREATE POLICY "Group members can insert expense participants"
ON public.group_expense_participants FOR INSERT
TO authenticated
WITH CHECK (
    public.is_group_member(group_id, auth.uid())
);

DROP POLICY IF EXISTS "Group members can update expense participants" ON public.group_expense_participants;
CREATE POLICY "Group members can update expense participants"
ON public.group_expense_participants FOR UPDATE
TO authenticated
USING (
    public.is_group_member(group_id, auth.uid())
)
WITH CHECK (
    public.is_group_member(group_id, auth.uid())
);

DROP POLICY IF EXISTS "Group members can delete expense participants" ON public.group_expense_participants;
CREATE POLICY "Group members can delete expense participants"
ON public.group_expense_participants FOR DELETE
TO authenticated
USING (
    public.is_group_member(group_id, auth.uid())
);

-- 7. RLS Policies: group_settlements
DROP POLICY IF EXISTS "Group members can view group settlements" ON public.group_settlements;
CREATE POLICY "Group members can view group settlements"
ON public.group_settlements FOR SELECT
TO authenticated
USING (
    public.is_group_member(group_id, auth.uid())
);

DROP POLICY IF EXISTS "Group members can insert group settlements" ON public.group_settlements;
CREATE POLICY "Group members can insert group settlements"
ON public.group_settlements FOR INSERT
TO authenticated
WITH CHECK (
    public.is_group_member(group_id, auth.uid())
    AND (created_by = auth.uid() OR created_by IS NULL)
);

DROP POLICY IF EXISTS "Group members can update group settlements" ON public.group_settlements;
CREATE POLICY "Group members can update group settlements"
ON public.group_settlements FOR UPDATE
TO authenticated
USING (
    public.is_group_member(group_id, auth.uid())
)
WITH CHECK (
    public.is_group_member(group_id, auth.uid())
);

DROP POLICY IF EXISTS "Group members can delete group settlements" ON public.group_settlements;
CREATE POLICY "Group members can delete group settlements"
ON public.group_settlements FOR DELETE
TO authenticated
USING (
    public.is_group_member(group_id, auth.uid())
);

-- 8. Grant permissions to standard Supabase roles
GRANT ALL ON TABLE public.group_expenses TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.group_expense_participants TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.group_settlements TO anon, authenticated, service_role;

-- 9. Enable Realtime Replication on all collaborative group tables
DO $$
BEGIN
    -- Enable REPLICA IDENTITY FULL so UPDATE/DELETE events broadcast complete row changes
    ALTER TABLE public.groups REPLICA IDENTITY FULL;
    ALTER TABLE public.group_members REPLICA IDENTITY FULL;
    ALTER TABLE public.group_expenses REPLICA IDENTITY FULL;
    ALTER TABLE public.group_expense_participants REPLICA IDENTITY FULL;
    ALTER TABLE public.group_settlements REPLICA IDENTITY FULL;
EXCEPTION WHEN OTHERS THEN
    -- Ignore if already configured or permissions restricted
    NULL;
END $$;

DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.group_expenses;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.group_expense_participants;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.group_settlements;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;
