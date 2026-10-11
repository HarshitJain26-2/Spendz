import { supabase, isSupabaseConfigured } from './supabase';
import type { Database } from '@/types/supabase';
import type {
  Account,
  Category,
  Transaction,
  Friend,
  SplitExpense,
  SplitParticipant,
  UserProfile,
} from '@/types';

type AccountRow = Database['public']['Tables']['accounts']['Row'];
type CategoryRow = Database['public']['Tables']['categories']['Row'];
type TransactionRow = Database['public']['Tables']['transactions']['Row'];
type FriendRow = Database['public']['Tables']['friends']['Row'];
type SplitExpenseRow = Database['public']['Tables']['split_expenses']['Row'];
type SplitParticipantRow = Database['public']['Tables']['split_participants']['Row'];

let hasLoggedMissingExpensesTable = false;
let hasLoggedMissingSettlementsTable = false;
let isExpensesTableAvailable: boolean | null = null;
let isSettlementsTableAvailable: boolean | null = null;

/**
 * Service providing typed queries and synchronization between the Spendz app and Supabase.
 */
export const SupabaseQueries = {
  isExpensesTableReady(): boolean {
    return isExpensesTableAvailable !== false;
  },
  isSettlementsTableReady(): boolean {
    return isSettlementsTableAvailable !== false;
  },
  /**
   * Check if user is authenticated and Supabase is configured
   */
  async getAuthenticatedUserId(): Promise<string | null> {
    if (!isSupabaseConfigured()) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  },

  // ─── Accounts ─────────────────────────────────────────────────────────
  async getAccounts(userId: string): Promise<Account[]> {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map((row: AccountRow) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      balance: Number(row.balance),
      icon: row.icon,
      color: row.color,
      isDefault: row.is_default,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  async upsertAccount(account: Account, userId: string): Promise<void> {
    const { error } = await supabase.from('accounts').upsert({
      id: account.id,
      user_id: userId,
      name: account.name,
      type: account.type,
      balance: account.balance,
      icon: account.icon,
      color: account.color,
      is_default: account.isDefault,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
  },

  async deleteAccount(accountId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', accountId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  // ─── Categories ───────────────────────────────────────────────────────
  async getCategories(userId: string): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order('name', { ascending: true });

    if (error) throw error;

    return (data || []).map((row: CategoryRow) => ({
      id: row.id,
      name: row.name,
      icon: row.icon,
      color: row.color,
      type: row.type,
      isDefault: row.is_default,
      createdAt: row.created_at,
    }));
  },

  async upsertCategory(category: Category, userId: string): Promise<void> {
    const { error } = await supabase.from('categories').upsert({
      id: category.id,
      user_id: userId,
      name: category.name,
      icon: category.icon,
      color: category.color,
      type: category.type,
      is_default: category.isDefault,
    });

    if (error) throw error;
  },

  async deleteCategory(categoryId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  // ─── Transactions ─────────────────────────────────────────────────────
  async getTransactions(userId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        categories (*),
        accounts!transactions_account_id_fkey (*)
      `)
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      type: row.type,
      amount: Number(row.amount),
      categoryId: row.category_id,
      accountId: row.account_id,
      toAccountId: row.to_account_id,
      note: row.note,
      date: row.date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      category: row.categories
        ? {
            id: row.categories.id,
            name: row.categories.name,
            icon: row.categories.icon,
            color: row.categories.color,
            type: row.categories.type,
            isDefault: row.categories.is_default,
            createdAt: row.categories.created_at,
          }
        : null,
      account: row.accounts
        ? {
            id: row.accounts.id,
            name: row.accounts.name,
            type: row.accounts.type,
            balance: Number(row.accounts.balance),
            icon: row.accounts.icon,
            color: row.accounts.color,
            isDefault: row.accounts.is_default,
            createdAt: row.accounts.created_at,
            updatedAt: row.accounts.updated_at,
          }
        : undefined,
    }));
  },

  async upsertTransaction(transaction: Transaction, userId: string): Promise<void> {
    const { error } = await supabase.from('transactions').upsert({
      id: transaction.id,
      user_id: userId,
      type: transaction.type,
      amount: transaction.amount,
      category_id: transaction.categoryId,
      account_id: transaction.accountId,
      to_account_id: transaction.toAccountId,
      note: transaction.note,
      date: transaction.date,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
  },

  async deleteTransaction(transactionId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  // ─── Friends ──────────────────────────────────────────────────────────
  async getFriends(userId: string): Promise<Friend[]> {
    const { data, error } = await supabase
      .from('friends')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) throw error;

    return (data || []).map((row: FriendRow) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      avatarColor: row.avatar_color,
      createdAt: row.created_at,
    }));
  },

  async upsertFriend(friend: Friend, userId: string): Promise<void> {
    const { error } = await supabase.from('friends').upsert({
      id: friend.id,
      user_id: userId,
      name: friend.name,
      phone: friend.phone,
      avatar_color: friend.avatarColor,
    });

    if (error) throw error;
  },

  async deleteFriend(friendId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('id', friendId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  // ─── Split Expenses ───────────────────────────────────────────────────
  async getSplitExpenses(userId: string): Promise<SplitExpense[]> {
    const { data, error } = await supabase
      .from('split_expenses')
      .select(`
        *,
        split_participants (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      transactionId: row.transaction_id,
      totalAmount: Number(row.total_amount),
      splitMethod: row.split_method,
      status: row.status,
      paidByType: row.paid_by_type,
      paidByFriendId: row.paid_by_friend_id,
      createdAt: row.created_at,
      participants: (row.split_participants || []).map((p: SplitParticipantRow) => ({
        id: p.id,
        splitExpenseId: p.split_expense_id,
        friendId: p.friend_id,
        name: p.name,
        amount: Number(p.amount),
        isPaid: p.is_paid,
        settledAt: p.settled_at,
      })),
    }));
  },

  async upsertSplitExpense(
    split: SplitExpense,
    participants: SplitParticipant[],
    userId: string
  ): Promise<void> {
    // 1. Upsert parent split expense
    const { error: splitError } = await supabase.from('split_expenses').upsert({
      id: split.id,
      user_id: userId,
      transaction_id: split.transactionId,
      total_amount: split.totalAmount,
      split_method: split.splitMethod,
      status: split.status,
      paid_by_type: split.paidByType,
      paid_by_friend_id: split.paidByFriendId || null,
    });

    if (splitError) throw splitError;

    // 2. Upsert participants
    if (participants && participants.length > 0) {
      const participantRows = participants.map((p) => ({
        id: p.id,
        user_id: userId,
        split_expense_id: split.id,
        friend_id: p.friendId || null,
        name: p.name,
        amount: p.amount,
        is_paid: p.isPaid,
        settled_at: p.settledAt || null,
      }));

      const { error: partError } = await supabase
        .from('split_participants')
        .upsert(participantRows);

      if (partError) throw partError;
    }
  },

  async settleParticipant(
    splitExpenseId: string,
    participantId: string
  ): Promise<any> {
    const { data, error } = await supabase.rpc('settle_split_participant', {
      p_split_expense_id: splitExpenseId,
      p_participant_id: participantId,
    });

    if (error) throw error;
    return data;
  },

  // ─── Profile & Settings ───────────────────────────────────────────────
  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) return null;

    return {
      id: data.id,
      email: data.email || '',
      name: data.name || '',
      fullName: data.full_name || '',
      phone: data.phone || '',
      avatarUri: data.avatar_url,
      currency: data.currency || '₹',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async updateProfile(userId: string, profile: Partial<UserProfile>): Promise<void> {
    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      name: profile.name,
      full_name: profile.fullName || profile.name,
      email: profile.email,
      phone: profile.phone,
      avatar_url: profile.avatarUri,
      currency: profile.currency,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
  },

  // ─── Groups & Invites ────────────────────────────────────────────────
  async getInviteByCode(
    code: string
  ): Promise<{ invite: any; group: any; members: any[] } | null> {
    if (!isSupabaseConfigured()) return null;
    const normalized = code.trim().toUpperCase();

    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    const { data: inviteData, error: inviteErr } = await supabase
      .from('group_invites')
      .select('*')
      .eq('code', normalized)
      .eq('is_active', true)
      .maybeSingle();

    console.log('[GROUP INVITE] code:', normalized);
    console.log('[GROUP INVITE] invite found:', !!inviteData);
    console.log('[GROUP INVITE] group id:', inviteData?.group_id);
    console.log('[GROUP INVITE] current user:', user?.id);

    if (inviteErr) {
      console.error('[GROUP INVITE] lookup error:', inviteErr);
      if (
        inviteErr.code === '42501' ||
        inviteErr.message?.toLowerCase().includes('permission') ||
        inviteErr.message?.toLowerCase().includes('policy')
      ) {
        console.error('[GROUP INVITE] RLS / permission failure detected:', inviteErr.message);
      }
      return null;
    }
    if (!inviteData) {
      console.log('[GROUP INVITE] No active invite row found in Supabase for code:', normalized);
      return null;
    }

    const { data: groupData, error: groupErr } = await supabase
      .from('groups')
      .select('*')
      .eq('id', inviteData.group_id)
      .maybeSingle();

    if (groupErr || !groupData) {
      console.error('[GROUP INVITE] lookup error (group):', groupErr?.message);
      return null;
    }

    const { data: membersData, error: membersErr } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', inviteData.group_id);

    if (membersErr) {
      console.warn('[SUPABASE LOOKUP] Members lookup warning:', membersErr.message);
    }

    return {
      invite: {
        id: inviteData.id,
        groupId: inviteData.group_id,
        code: inviteData.code,
        createdBy: inviteData.created_by,
        createdAt: inviteData.created_at,
        expiresAt: inviteData.expires_at,
        isActive: inviteData.is_active,
      },
      group: {
        id: groupData.id,
        name: groupData.name,
        icon: groupData.icon,
        createdAt: groupData.created_at,
        updatedAt: groupData.updated_at,
      },
      members: (membersData || []).map((m: any) => ({
        id: m.id,
        groupId: m.group_id,
        userId: m.user_id,
        name: m.name,
        avatarUrl: m.avatar_url,
        role: m.role || 'member',
        createdAt: m.created_at,
        friendId: null,
      })),
    };
  },

  async getActiveInviteForGroup(groupId: string): Promise<any | null> {
    if (!isSupabaseConfigured() || !groupId) return null;
    try {
      const { data, error } = await supabase
        .from('group_invites')
        .select('*')
        .eq('group_id', groupId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('[SUPABASE GROUP INVITE] Error fetching active invite:', {
          code: error.code,
          message: error.message,
          groupId,
        });
        return null;
      }
      if (!data) return null;

      // Expiration check
      if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
        return null;
      }

      return {
        id: data.id,
        groupId: data.group_id,
        code: data.code,
        createdBy: data.created_by,
        createdAt: data.created_at,
        expiresAt: data.expires_at,
        isActive: data.is_active,
      };
    } catch (e: any) {
      console.warn('[SUPABASE GROUP INVITE] Exception fetching active invite:', e?.message || e);
      return null;
    }
  },

  async syncGroupAndInviteToSupabase(
    group: any,
    creatorMember: any,
    invite: any
  ): Promise<{ success: boolean; invite?: any; error?: string; code?: string }> {
    if (!isSupabaseConfigured()) return { success: true, invite };
    try {
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData?.user;
      if (!authUser || !authUser.id) {
        return { success: false, error: 'You must be signed in to share group invites.' };
      }

      // Step 1: FIRST check if an active, non-expired invite already exists in Supabase.
      // If found, return it immediately without writing to groups or group_members.
      const existingActive = await this.getActiveInviteForGroup(group.id);
      if (existingActive) {
        console.log('[SUPABASE GROUP SYNC] Active invite retrieved from Supabase:', existingActive.code);
        return {
          success: true,
          invite: existingActive,
        };
      }

      // Step 2: No active invite exists. Check if group exists in Supabase.
      const { data: existingGroup, error: checkError } = await supabase
        .from('groups')
        .select('id, created_by')
        .eq('id', group.id)
        .maybeSingle();

      if (checkError) {
        console.warn('[SUPABASE GROUP SYNC] Note on checking existing group:', {
          code: checkError.code,
          message: checkError.message,
          groupId: group.id,
        });
      }

      if (!existingGroup) {
        // Group does not exist in Supabase yet. Current authenticated user is creating it.
        console.log('[SUPABASE GROUP SYNC] Creating new group row in Supabase with created_by:', authUser.id);
        const { error: groupError } = await supabase.from('groups').insert({
          id: group.id,
          name: group.name,
          icon: group.icon || '🏖',
          created_by: authUser.id, // Strictly use authenticated user ID
          created_at: group.createdAt || new Date().toISOString(),
          updated_at: group.updatedAt || new Date().toISOString(),
        });

        if (groupError) {
          console.error('[SUPABASE GROUP SYNC] Failed to insert group:', {
            code: groupError.code,
            message: groupError.message,
            groupId: group.id,
          });
          return { success: false, error: groupError.message, code: groupError.code };
        }

        // Add creator membership
        const { error: memberError } = await supabase.from('group_members').insert({
          id: creatorMember.id,
          group_id: group.id,
          user_id: authUser.id,
          name: creatorMember.name || authUser.user_metadata?.full_name || authUser.user_metadata?.name || null,
          avatar_url: creatorMember.avatarUrl || authUser.user_metadata?.avatar_url || null,
          role: 'owner',
          created_at: creatorMember.createdAt || new Date().toISOString(),
        });

        if (memberError && memberError.code !== '23505') {
          console.warn('[SUPABASE GROUP SYNC] Warning inserting creator member:', memberError.message, memberError.code);
        }
      } else {
        // Group already exists in Supabase.
        // DO NOT re-insert or upsert the group row to preserve original ownership and avoid RLS 42501 violations.
        console.log('[SUPABASE GROUP SYNC] Group already exists. Preserving original owner:', existingGroup.created_by);
      }

      // Step 3: Insert new invite into Supabase
      const normalizedCode = invite.code.trim().toUpperCase();
      console.log('[SUPABASE GROUP SYNC] Inserting new invite into Supabase:', normalizedCode);

      const { data: insertedInvite, error: inviteError } = await supabase
        .from('group_invites')
        .insert({
          id: invite.id,
          group_id: group.id,
          code: normalizedCode,
          created_by: authUser.id,
          created_at: invite.createdAt || new Date().toISOString(),
          expires_at: invite.expiresAt || null,
          is_active: true,
        })
        .select('*')
        .maybeSingle();

      if (inviteError) {
        // If conflict (e.g. concurrent invite creation), attempt to fetch the active invite
        if (inviteError.code === '23505') {
          const fallbackInvite = await this.getActiveInviteForGroup(group.id);
          if (fallbackInvite) {
            return {
              success: true,
              invite: fallbackInvite,
            };
          }
        }

        console.error('[SUPABASE GROUP SYNC] Failed to insert invite in Supabase:', {
          code: inviteError.code,
          message: inviteError.message,
          groupId: group.id,
        });
        return { success: false, error: inviteError.message, code: inviteError.code };
      }

      const verified = insertedInvite || invite;
      console.log('[SUPABASE GROUP SYNC] Invite created successfully in Supabase:', verified.code);
      return {
        success: true,
        invite: {
          id: verified.id,
          groupId: verified.group_id || verified.groupId,
          code: verified.code,
          createdBy: verified.created_by || verified.createdBy,
          createdAt: verified.created_at || verified.createdAt,
          expiresAt: verified.expires_at || verified.expiresAt,
          isActive: verified.is_active !== undefined ? verified.is_active : verified.isActive,
        },
      };
    } catch (e: any) {
      console.error('[SUPABASE GROUP SYNC] Exception syncing group/invite:', {
        message: e?.message || e,
        code: e?.code,
      });
      return { success: false, error: e?.message || 'Network error syncing invite to backend.', code: e?.code };
    }
  },

  async revokeGroupInviteInSupabase(inviteId: string): Promise<void> {
    if (!isSupabaseConfigured()) return;
    try {
      await supabase.from('group_invites').update({ is_active: false }).eq('id', inviteId);
    } catch (e) {
      console.warn('[Supabase] Failed to revoke invite:', e);
    }
  },

  async createGroupInSupabase(group: any, members: any[]): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { success: true };
    try {
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData?.user;
      if (!authUser || !authUser.id) {
        return { success: false, error: 'User not authenticated in Supabase' };
      }

      // Check if group already exists
      const { data: existingGroup } = await supabase
        .from('groups')
        .select('id, created_by')
        .eq('id', group.id)
        .maybeSingle();

      if (existingGroup) {
        console.log('[SUPABASE GROUP] Group already exists in Supabase. Preserving owner:', existingGroup.created_by);
        return { success: true };
      }

      // Insert group with authenticated user as created_by
      const { error: groupError } = await supabase.from('groups').insert({
        id: group.id,
        name: group.name,
        icon: group.icon || '🏖',
        created_by: authUser.id,
        created_at: group.createdAt || new Date().toISOString(),
        updated_at: group.updatedAt || new Date().toISOString(),
      });

      if (groupError) {
        console.warn('[Supabase] Failed to insert group:', {
          code: groupError.code,
          message: groupError.message,
          groupId: group.id,
        });
        return { success: false, error: groupError.message };
      }

      // Insert creator membership
      for (const m of members) {
        if (m.userId === authUser.id || (!m.userId && m.friendId === null)) {
          const { error: memberError } = await supabase.from('group_members').insert({
            id: m.id,
            group_id: m.groupId || group.id,
            user_id: authUser.id,
            name: m.name || authUser.user_metadata?.full_name || authUser.user_metadata?.name || null,
            avatar_url: m.avatarUrl || authUser.user_metadata?.avatar_url || null,
            role: 'owner',
            created_at: m.createdAt || new Date().toISOString(),
          });
          if (memberError && memberError.code !== '23505') {
            console.warn('[Supabase] Warning inserting creator member:', memberError.message);
          }
        }
      }
      return { success: true };
    } catch (e: any) {
      console.warn('[Supabase] Failed to sync group creation:', e?.message || e);
      return { success: false, error: e?.message };
    }
  },

  async createGroupInviteInSupabase(invite: any): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { success: true };
    try {
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData?.user;
      if (!authUser) {
        return { success: false, error: 'User not authenticated in Supabase' };
      }

      const { error } = await supabase.from('group_invites').upsert({
        id: invite.id,
        group_id: invite.groupId,
        code: invite.code.trim().toUpperCase(),
        created_by: authUser.id,
        created_at: invite.createdAt,
        expires_at: invite.expiresAt,
        is_active: invite.isActive,
      });

      if (error) {
        console.warn('[Supabase] Failed to upsert group invite:', error.message);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (e: any) {
      console.warn('[Supabase] Failed to sync group invite:', e?.message || e);
      return { success: false, error: e?.message };
    }
  },

  async joinGroupInSupabase(groupId: string, member: any): Promise<{ success: boolean; message?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, message: 'Internet connection is required to join a group.' };
    }
    try {
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData?.user;
      if (!authUser) {
        return { success: false, message: 'Please sign in to join this group.' };
      }

      console.log('[SUPABASE JOIN] Inserting membership for user:', authUser.id, 'into group:', groupId);
      const { error } = await supabase.from('group_members').insert({
        id: member.id,
        group_id: groupId,
        user_id: authUser.id,
        name: member.name || null,
        avatar_url: member.avatarUrl || null,
        role: member.role || 'member',
        created_at: member.createdAt,
      });

      if (error) {
        if (error.code === '23505') {
          return { success: false, message: "You're already a member of this group." };
        }
        console.error('[SUPABASE JOIN] Membership insert error:', error.message, error.code);
        return { success: false, message: error.message };
      }

      // Verify membership in Supabase
      const { data: verifyData, error: verifyErr } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (verifyErr || !verifyData) {
        console.error('[SUPABASE JOIN] Membership verification query failed:', verifyErr?.message);
        return { success: false, message: 'Failed to verify membership in Supabase.' };
      }

      console.log('[SUPABASE JOIN] Membership verified in Supabase successfully!');
      return { success: true };
    } catch (e: any) {
      console.error('[SUPABASE JOIN] Exception joining group:', e);
      return { success: false, message: e?.message || 'Internet connection is required to join a group.' };
    }
  },

  async getGroupMembers(groupId: string): Promise<any[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId);

      if (error || !data) {
        console.warn('[SUPABASE GROUP] Failed to fetch members:', error?.message);
        return [];
      }

      const userIds = data.map((m: any) => m.user_id).filter(Boolean);
      let profileMap = new Map<string, any>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);
        if (profiles) {
          profileMap = new Map(profiles.map((p: any) => [p.id, p]));
        }
      }

      return data.map((m: any) => {
        const prof = m.user_id ? profileMap.get(m.user_id) : null;
        return {
          id: m.id,
          groupId: m.group_id,
          userId: m.user_id,
          friendId: null,
          name: m.name || prof?.full_name || 'Member',
          avatarUrl: m.avatar_url || prof?.avatar_url || null,
          role: m.role || 'member',
          createdAt: m.created_at,
        };
      });
    } catch (e) {
      console.error('[SUPABASE GROUP] Exception fetching group members:', e);
      return [];
    }
  },

  async getGroupDetails(groupId: string): Promise<{
    group: any | null;
    members: any[];
    expenses: any[] | null;
    settlements: any[] | null;
    activeInvite?: any | null;
  } | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      // 1. Group
      const { data: groupData, error: groupErr } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .maybeSingle();

      if (groupErr || !groupData) {
        console.warn('[SUPABASE GROUP] Failed to fetch group:', groupErr?.message);
        return null;
      }

      // 2. Members
      const members = await this.getGroupMembers(groupId);

      // 3. Expenses
      let expenses: any[] | null = null;
      if (isExpensesTableAvailable !== false) {
        const { data: expensesData, error: expErr } = await supabase
          .from('group_expenses')
          .select('*')
          .eq('group_id', groupId)
          .order('date', { ascending: false });

        if (expErr) {
          if (expErr.message?.includes('Could not find the table') || (expErr as any).code === 'PGRST205') {
            isExpensesTableAvailable = false;
            if (!hasLoggedMissingExpensesTable) {
              hasLoggedMissingExpensesTable = true;
              console.error(
                '[SUPABASE SCHEMA MISSING] Table "public.group_expenses" does not exist in Supabase schema cache. Please execute migration 07_group_collaboration_and_realtime.sql in your Supabase SQL Editor.'
              );
            }
          } else {
            console.warn('[SUPABASE GROUP] Failed to fetch group expenses:', expErr.message);
          }
        } else {
          isExpensesTableAvailable = true;
          // 4. Participants
          const expenseIds = (expensesData || []).map((e: any) => e.id);
          let participantsByExpense = new Map<string, any[]>();
          if (expenseIds.length > 0) {
            const { data: partData, error: partErr } = await supabase
              .from('group_expense_participants')
              .select('*')
              .in('group_expense_id', expenseIds);

            if (!partErr && partData) {
              for (const p of partData) {
                const list = participantsByExpense.get(p.group_expense_id) || [];
                list.push({
                  id: p.id,
                  groupExpenseId: p.group_expense_id,
                  memberId: p.member_id,
                  userId: p.user_id,
                  friendId: p.member_id,
                  shareAmount: Number(p.share_amount) || 0,
                });
                participantsByExpense.set(p.group_expense_id, list);
              }
            }
          }

          expenses = (expensesData || []).map((e: any) => ({
            id: e.id,
            groupId: e.group_id,
            description: e.description,
            amount: Number(e.amount) || 0,
            paidByFriendId: e.paid_by_member_id,
            paidByMemberId: e.paid_by_member_id,
            paidByUserId: e.paid_by_user_id,
            date: e.date,
            splitMethod: e.split_method || 'equal',
            createdAt: e.created_at,
            updatedAt: e.updated_at,
            participants: participantsByExpense.get(e.id) || [],
          }));
        }
      }

      // 5. Settlements
      let settlements: any[] | null = null;
      if (isSettlementsTableAvailable !== false) {
        const { data: setlData, error: setlErr } = await supabase
          .from('group_settlements')
          .select('*')
          .eq('group_id', groupId)
          .order('date', { ascending: false });

        if (setlErr) {
          if (setlErr.message?.includes('Could not find the table') || (setlErr as any).code === 'PGRST205') {
            isSettlementsTableAvailable = false;
            if (!hasLoggedMissingSettlementsTable) {
              hasLoggedMissingSettlementsTable = true;
              console.error(
                '[SUPABASE SCHEMA MISSING] Table "public.group_settlements" does not exist in Supabase schema cache. Please execute migration 07_group_collaboration_and_realtime.sql in your Supabase SQL Editor.'
              );
            }
          } else {
            console.warn('[SUPABASE GROUP] Failed to fetch group settlements:', setlErr.message);
          }
        } else {
          isSettlementsTableAvailable = true;
          settlements = (setlData || []).map((s: any) => ({
            id: s.id,
            groupId: s.group_id,
            fromFriendId: s.from_member_id,
            toFriendId: s.to_member_id,
            fromMemberId: s.from_member_id,
            fromUserId: s.from_user_id,
            toMemberId: s.to_member_id,
            toUserId: s.to_user_id,
            amount: Number(s.amount) || 0,
            date: s.date,
            createdAt: s.created_at,
          }));
        }
      }

      // 6. Active Invite
      const activeInvite = await this.getActiveInviteForGroup(groupId);

      return {
        group: {
          id: groupData.id,
          name: groupData.name,
          icon: groupData.icon,
          createdAt: groupData.created_at,
          updatedAt: groupData.updated_at,
          members,
          activeInvite,
        },
        members,
        expenses,
        settlements,
        activeInvite,
      };
    } catch (e) {
      console.error('[SUPABASE GROUP] Exception in getGroupDetails:', e);
      return null;
    }
  },

  async getUserGroups(): Promise<any[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData?.user;
      if (!authUser) return [];

      const { data: memberships, error: memErr } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', authUser.id);

      if (memErr || !memberships || memberships.length === 0) {
        return [];
      }

      const groupIds = Array.from(new Set(memberships.map((m: any) => m.group_id)));
      const { data: groups, error: grpErr } = await supabase
        .from('groups')
        .select('*')
        .in('id', groupIds);

      if (grpErr || !groups) {
        console.warn('[SUPABASE GROUP] Failed to fetch user groups:', grpErr?.message);
        return [];
      }

      return groups;
    } catch (e) {
      console.error('[SUPABASE GROUP] Exception fetching user groups:', e);
      return [];
    }
  },


  async createGroupExpenseInSupabase(
    expense: any,
    participants: any[]
  ): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { success: true };
    try {
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData?.user;
      if (!authUser) return { success: false, error: 'User not authenticated' };

      const { error: expErr } = await supabase.from('group_expenses').upsert({
        id: expense.id,
        group_id: expense.groupId,
        description: expense.description,
        amount: expense.amount,
        paid_by_member_id: expense.paidByMemberId || expense.paidByFriendId || null,
        paid_by_user_id: expense.paidByUserId || null,
        date: expense.date,
        split_method: expense.splitMethod || 'equal',
        created_by: authUser.id,
        created_at: expense.createdAt,
        updated_at: expense.updatedAt,
      });

      if (expErr) {
        console.error('[SUPABASE GROUP] Failed to save group expense:', expErr.message);
        return { success: false, error: expErr.message };
      }

      if (participants.length > 0) {
        await supabase
          .from('group_expense_participants')
          .delete()
          .eq('group_expense_id', expense.id);

        const partRows = participants.map((p) => ({
          id: p.id,
          group_expense_id: expense.id,
          group_id: expense.groupId,
          member_id: p.memberId || p.friendId || null,
          user_id: p.userId || null,
          share_amount: p.shareAmount,
        }));

        const { error: partErr } = await supabase
          .from('group_expense_participants')
          .insert(partRows);

        if (partErr) {
          console.error('[SUPABASE GROUP] Failed to save expense participants:', partErr.message);
          return { success: false, error: partErr.message };
        }
      }

      return { success: true };
    } catch (e: any) {
      console.error('[SUPABASE GROUP] Exception creating expense:', e);
      return { success: false, error: e?.message };
    }
  },

  async updateGroupExpenseInSupabase(
    expenseId: string,
    groupId: string,
    updates: any,
    participants: any[]
  ): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { success: true };
    try {
      const expensePayload: any = {
        updated_at: new Date().toISOString(),
      };
      if (updates.description !== undefined) expensePayload.description = updates.description;
      if (updates.amount !== undefined) expensePayload.amount = updates.amount;
      if (updates.date !== undefined) expensePayload.date = updates.date;
      if (updates.paidByFriendId !== undefined || updates.paidByMemberId !== undefined) {
        expensePayload.paid_by_member_id = updates.paidByMemberId || updates.paidByFriendId || null;
      }
      if (updates.paidByUserId !== undefined) expensePayload.paid_by_user_id = updates.paidByUserId;
      if (updates.splitMethod !== undefined) expensePayload.split_method = updates.splitMethod;

      const { error: updateErr } = await supabase
        .from('group_expenses')
        .update(expensePayload)
        .eq('id', expenseId);

      if (updateErr) {
        console.error('[SUPABASE GROUP] Failed to update group expense:', updateErr.message);
        return { success: false, error: updateErr.message };
      }

      if (participants.length > 0) {
        await supabase
          .from('group_expense_participants')
          .delete()
          .eq('group_expense_id', expenseId);

        const partRows = participants.map((p) => ({
          id: p.id,
          group_expense_id: expenseId,
          group_id: groupId,
          member_id: p.memberId || p.friendId || null,
          user_id: p.userId || null,
          share_amount: p.shareAmount,
        }));

        const { error: partErr } = await supabase
          .from('group_expense_participants')
          .insert(partRows);

        if (partErr) {
          console.error('[SUPABASE GROUP] Failed to update expense participants:', partErr.message);
        }
      }

      return { success: true };
    } catch (e: any) {
      console.error('[SUPABASE GROUP] Exception updating expense:', e);
      return { success: false, error: e?.message };
    }
  },

  async deleteGroupExpenseInSupabase(expenseId: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { success: true };
    try {
      const { error } = await supabase
        .from('group_expenses')
        .delete()
        .eq('id', expenseId);

      if (error) {
        console.error('[SUPABASE GROUP] Failed to delete group expense:', error.message);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (e: any) {
      console.error('[SUPABASE GROUP] Exception deleting expense:', e);
      return { success: false, error: e?.message };
    }
  },

  async createGroupSettlementInSupabase(settlement: any): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { success: true };
    try {
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData?.user;
      if (!authUser) return { success: false, error: 'User not authenticated' };

      const { error } = await supabase.from('group_settlements').upsert({
        id: settlement.id,
        group_id: settlement.groupId,
        from_member_id: settlement.fromMemberId || settlement.fromFriendId || null,
        from_user_id: settlement.fromUserId || null,
        to_member_id: settlement.toMemberId || settlement.toFriendId || null,
        to_user_id: settlement.toUserId || null,
        amount: settlement.amount,
        date: settlement.date,
        created_by: authUser.id,
        created_at: settlement.createdAt,
      });

      if (error) {
        console.error('[SUPABASE GROUP] Failed to save group settlement:', error.message);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (e: any) {
      console.error('[SUPABASE GROUP] Exception creating settlement:', e);
      return { success: false, error: e?.message };
    }
  },

  async deleteGroupSettlementInSupabase(settlementId: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { success: true };
    try {
      const { error } = await supabase
        .from('group_settlements')
        .delete()
        .eq('id', settlementId);

      if (error) {
        console.error('[SUPABASE GROUP] Failed to delete group settlement:', error.message);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (e: any) {
      console.error('[SUPABASE GROUP] Exception deleting settlement:', e);
      return { success: false, error: e?.message };
    }
  },
};

