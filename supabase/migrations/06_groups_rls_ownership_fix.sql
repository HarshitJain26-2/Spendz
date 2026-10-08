-- ==============================================================================
-- Spendz Migration 06: Groups RLS & Ownership Architecture Fix
-- Resolves "new row violates row-level security policy for table 'groups'"
-- and infinite recursion in group_members policies.
-- ==============================================================================

-- 1. Ensure groups has the ownership column `created_by`
ALTER TABLE public.groups 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_groups_created_by ON public.groups(created_by);

-- 2. Non-recursive SECURITY DEFINER helper functions
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

-- 3. Groups RLS Policies
-- INSERT: Creator must set created_by to their own authenticated user ID
DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Authenticated users can create their own groups" ON public.groups;
CREATE POLICY "Authenticated users can create their own groups"
ON public.groups FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = created_by
);

-- SELECT: Creator, members, or active invite preview
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

-- UPDATE: Creator or group members can update group details
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

-- DELETE: Only group owner can delete
DROP POLICY IF EXISTS "Group owners can delete groups" ON public.groups;
CREATE POLICY "Group owners can delete groups"
ON public.groups FOR DELETE
TO authenticated
USING (
    created_by = auth.uid()
);

-- 4. Group Members RLS Policies
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

-- 5. Group Invites RLS Policies
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
