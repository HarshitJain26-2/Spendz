-- ==============================================================================
-- Spendz Migration 08: Groups Invite Flow, RLS Ownership & Permissions Hardening
-- Resolves "new row violates row-level security policy for table 'groups'"
-- Enables authorized members to retrieve and create group invites without upserting groups
-- ==============================================================================

-- 1. Helper Function: Check if user is group owner (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_group_owner(check_group_id TEXT, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.groups
        WHERE id = check_group_id
        AND created_by = check_user_id
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_group_owner(TEXT, UUID) TO anon, authenticated, service_role;

-- 2. Safe Legacy Ownership Reconciliation
-- If any existing legacy groups have created_by IS NULL, assign to earliest owner/admin member
UPDATE public.groups g
SET created_by = gm.user_id
FROM (
    SELECT DISTINCT ON (group_id) group_id, user_id
    FROM public.group_members
    WHERE user_id IS NOT NULL
      AND role IN ('owner', 'admin')
    ORDER BY group_id, created_at ASC
) gm
WHERE g.id = gm.group_id
  AND g.created_by IS NULL;

-- ------------------------------------------------------------------------------
-- 3. RLS Policies: public.groups
-- ------------------------------------------------------------------------------
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- SELECT: Owner, verified members, or anyone with active invite preview
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
        SELECT 1 FROM public.group_invites gi
        WHERE gi.group_id = groups.id
        AND gi.is_active = true
        AND (gi.expires_at IS NULL OR gi.expires_at > now())
    )
);

-- INSERT: Authenticated users can create groups where created_by is their own auth.uid()
DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Authenticated users can create their own groups" ON public.groups;
CREATE POLICY "Authenticated users can create their own groups"
ON public.groups FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = created_by
);

-- UPDATE: Owner or members can update group metadata (e.g., name, icon)
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

-- DELETE: Strictly group owner
DROP POLICY IF EXISTS "Group owners can delete groups" ON public.groups;
CREATE POLICY "Group owners can delete groups"
ON public.groups FOR DELETE
TO authenticated
USING (
    created_by = auth.uid()
);

-- ------------------------------------------------------------------------------
-- 4. RLS Policies: public.group_invites
-- ------------------------------------------------------------------------------
ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;

-- SELECT: Anyone authenticated can view active, non-expired invites (needed to join via code/QR)
DROP POLICY IF EXISTS "Anyone authenticated can view active invites" ON public.group_invites;
CREATE POLICY "Anyone authenticated can view active invites"
ON public.group_invites FOR SELECT
TO authenticated
USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
);

-- SELECT: Group members or owner can view all invites for their group
DROP POLICY IF EXISTS "Group members can view all invites" ON public.group_invites;
CREATE POLICY "Group members can view all invites"
ON public.group_invites FOR SELECT
TO authenticated
USING (
    public.is_group_member(group_invites.group_id, auth.uid())
    OR
    public.is_group_owner(group_invites.group_id, auth.uid())
);

-- INSERT: Group owner or authorized members can generate invites for their group
DROP POLICY IF EXISTS "Group members can create invites" ON public.group_invites;
DROP POLICY IF EXISTS "Group owners and members can create invites" ON public.group_invites;
CREATE POLICY "Group owners and members can create invites"
ON public.group_invites FOR INSERT
TO authenticated
WITH CHECK (
    created_by = auth.uid()
    AND (
        public.is_group_member(group_id, auth.uid())
        OR
        public.is_group_owner(group_id, auth.uid())
    )
);

-- UPDATE: Group owner or authorized members can update/revoke invites for their group
DROP POLICY IF EXISTS "Group members can update invites" ON public.group_invites;
DROP POLICY IF EXISTS "Group owners and members can update invites" ON public.group_invites;
CREATE POLICY "Group owners and members can update invites"
ON public.group_invites FOR UPDATE
TO authenticated
USING (
    public.is_group_member(group_invites.group_id, auth.uid())
    OR
    public.is_group_owner(group_invites.group_id, auth.uid())
)
WITH CHECK (
    public.is_group_member(group_invites.group_id, auth.uid())
    OR
    public.is_group_owner(group_invites.group_id, auth.uid())
);

-- DELETE: Only group owner can delete invites
DROP POLICY IF EXISTS "Group owners can delete invites" ON public.group_invites;
CREATE POLICY "Group owners can delete invites"
ON public.group_invites FOR DELETE
TO authenticated
USING (
    public.is_group_owner(group_invites.group_id, auth.uid())
);

-- ------------------------------------------------------------------------------
-- 5. RLS Policies: public.group_members
-- ------------------------------------------------------------------------------
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- SELECT: Member itself, group members, owner, or active invite preview
DROP POLICY IF EXISTS "Users can view group members of their groups or active invite preview" ON public.group_members;
CREATE POLICY "Users can view group members of their groups or active invite preview"
ON public.group_members FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR
    public.is_group_member(group_id, auth.uid())
    OR
    public.is_group_owner(group_id, auth.uid())
    OR
    EXISTS (
        SELECT 1 FROM public.group_invites gi
        WHERE gi.group_id = group_members.group_id
        AND gi.is_active = true
        AND (gi.expires_at IS NULL OR gi.expires_at > now())
    )
);

-- INSERT: User joining group inserting their own record, or owner seeding members
DROP POLICY IF EXISTS "Users can insert their own membership" ON public.group_members;
CREATE POLICY "Users can insert their own membership"
ON public.group_members FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    OR
    public.is_group_owner(group_id, auth.uid())
);

-- UPDATE: User updating themselves, or group admin/owner updating members
DROP POLICY IF EXISTS "Users can update their own membership or admins update" ON public.group_members;
CREATE POLICY "Users can update their own membership or admins update"
ON public.group_members FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid()
    OR
    public.is_group_admin(group_id, auth.uid())
    OR
    public.is_group_owner(group_id, auth.uid())
)
WITH CHECK (
    user_id = auth.uid()
    OR
    public.is_group_admin(group_id, auth.uid())
    OR
    public.is_group_owner(group_id, auth.uid())
);

-- DELETE: User leaving group, or group admin/owner removing members
DROP POLICY IF EXISTS "Users can leave group or admins remove" ON public.group_members;
CREATE POLICY "Users can leave group or admins remove"
ON public.group_members FOR DELETE
TO authenticated
USING (
    user_id = auth.uid()
    OR
    public.is_group_admin(group_id, auth.uid())
    OR
    public.is_group_owner(group_id, auth.uid())
);
