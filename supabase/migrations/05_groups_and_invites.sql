-- ==============================================================================
-- Spendz Migration 05: Groups, Group Members, and Group Invites with RLS
-- ==============================================================================

-- 1. Groups table
CREATE TABLE IF NOT EXISTS public.groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT '🏖',
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Group Members table
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

-- 3. Group Invites table
CREATE TABLE IF NOT EXISTS public.group_invites (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_invites_code ON public.group_invites(code);
CREATE INDEX IF NOT EXISTS idx_group_invites_group_id ON public.group_invites(group_id);

-- Enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;

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

-- ------------------------------------------------------------------------------
-- RLS Policies: Group Invites
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone authenticated can view active invites" ON public.group_invites;
CREATE POLICY "Anyone authenticated can view active invites"
ON public.group_invites FOR SELECT
TO authenticated
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

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
WITH CHECK (
    created_by = auth.uid()
);

DROP POLICY IF EXISTS "Group members can update invites" ON public.group_invites;
CREATE POLICY "Group members can update invites"
ON public.group_invites FOR UPDATE
TO authenticated
USING (
    public.is_group_member(group_invites.group_id, auth.uid())
);

-- ------------------------------------------------------------------------------
-- RLS Policies: Groups
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- RLS Policies: Group Members
-- ------------------------------------------------------------------------------
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
WITH CHECK (
    user_id = auth.uid()
);

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
