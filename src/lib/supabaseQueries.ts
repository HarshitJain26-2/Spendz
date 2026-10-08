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

/**
 * Service providing typed queries and synchronization between the Spendz app and Supabase.
 */
export const SupabaseQueries = {
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

  async syncGroupAndInviteToSupabase(
    group: any,
    creatorMember: any,
    invite: any
  ): Promise<{ success: boolean; invite?: any; error?: string }> {
    if (!isSupabaseConfigured()) return { success: true, invite };
    try {
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData?.user;
      if (!authUser || !authUser.id) {
        return { success: false, error: 'You must be signed in to share group invites.' };
      }

      // Maintain stable ownership (Section 14): check if group exists in Supabase
      const { data: existingGroup, error: checkError } = await supabase
        .from('groups')
        .select('id, created_by')
        .eq('id', group.id)
        .maybeSingle();

      if (checkError) {
        console.warn('[SUPABASE GROUP SYNC] Note on checking existing group:', checkError.message);
      }

      // Preserve existing owner if already set; otherwise map to authenticated user
      const ownerId = existingGroup?.created_by || authUser.id;

      console.log('[SUPABASE GROUP SYNC]', {
        'auth user': authUser.id,
        'group id': group.id,
        'created_by': ownerId,
      });

      // 1. Ensure group exists in Supabase
      const { error: groupError } = await supabase.from('groups').upsert(
        {
          id: group.id,
          name: group.name,
          icon: group.icon || '🏖',
          created_by: ownerId,
          created_at: group.createdAt || new Date().toISOString(),
          updated_at: group.updatedAt || new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      if (groupError) {
        console.error('[SUPABASE GROUP SYNC] Failed to upsert group:', groupError.message);
        return { success: false, error: groupError.message };
      }

      // 2. Ensure creator membership exists in Supabase
      const { error: memberError } = await supabase.from('group_members').upsert(
        {
          id: creatorMember.id,
          group_id: group.id,
          user_id: authUser.id,
          name: creatorMember.name || null,
          avatar_url: creatorMember.avatarUrl || null,
          role: 'admin',
          created_at: creatorMember.createdAt,
        },
        { onConflict: 'group_id, user_id' }
      );

      if (memberError) {
        console.warn('[SUPABASE SYNC] Warning upserting creator member:', memberError.message);
      }

      // 3. Check if an active invite already exists for this group in Supabase
      const { data: existingActive } = await supabase
        .from('group_invites')
        .select('*')
        .eq('group_id', group.id)
        .eq('is_active', true)
        .maybeSingle();

      if (existingActive) {
        console.log('[SUPABASE SYNC] Active invite already exists in Supabase:', existingActive.code);
        return {
          success: true,
          invite: {
            id: existingActive.id,
            groupId: existingActive.group_id,
            code: existingActive.code,
            createdBy: existingActive.created_by,
            createdAt: existingActive.created_at,
            expiresAt: existingActive.expires_at,
            isActive: existingActive.is_active,
          },
        };
      }

      // 4. Insert new invite into Supabase
      const normalizedCode = invite.code.trim().toUpperCase();
      console.log('[SUPABASE SYNC] Inserting new invite into Supabase:', normalizedCode);
      const { error: inviteError } = await supabase.from('group_invites').insert({
        id: invite.id,
        group_id: group.id,
        code: normalizedCode,
        created_by: authUser.id,
        created_at: invite.createdAt,
        expires_at: invite.expiresAt,
        is_active: true,
      });

      if (inviteError) {
        console.error('[SUPABASE SYNC] Failed to insert invite in Supabase:', inviteError.message);
        return { success: false, error: inviteError.message };
      }

      // 5. Verify the invite exists in Supabase
      const { data: verifiedInvite, error: verifyErr } = await supabase
        .from('group_invites')
        .select('*')
        .eq('id', invite.id)
        .maybeSingle();

      if (verifyErr || !verifiedInvite) {
        console.error('[SUPABASE SYNC] Failed to verify invite in Supabase:', verifyErr?.message);
        return { success: false, error: 'Failed to verify invite in database.' };
      }

      console.log('[SUPABASE SYNC] Invite successfully verified in Supabase:', verifiedInvite.code);
      return {
        success: true,
        invite: {
          id: verifiedInvite.id,
          groupId: verifiedInvite.group_id,
          code: verifiedInvite.code,
          createdBy: verifiedInvite.created_by,
          createdAt: verifiedInvite.created_at,
          expiresAt: verifiedInvite.expires_at,
          isActive: verifiedInvite.is_active,
        },
      };
    } catch (e: any) {
      console.error('[SUPABASE SYNC] Exception syncing group/invite:', e?.message || e);
      return { success: false, error: e?.message || 'Network error syncing invite to backend.' };
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

      // Preserve existing owner if already set; otherwise map to authenticated user
      const { data: existingGroup } = await supabase
        .from('groups')
        .select('id, created_by')
        .eq('id', group.id)
        .maybeSingle();

      const ownerId = existingGroup?.created_by || authUser.id;

      // Insert group
      const { error: groupError } = await supabase.from('groups').upsert(
        {
          id: group.id,
          name: group.name,
          icon: group.icon,
          created_by: ownerId,
          created_at: group.createdAt,
          updated_at: group.updatedAt,
        },
        { onConflict: 'id' }
      );

      if (groupError) {
        console.warn('[Supabase] Failed to upsert group:', groupError.message);
        return { success: false, error: groupError.message };
      }

      // Insert creator membership
      for (const m of members) {
        if (m.userId === authUser.id || (!m.userId && m.friendId === null)) {
          const { error: memberError } = await supabase.from('group_members').upsert(
            {
              id: m.id,
              group_id: m.groupId,
              user_id: authUser.id,
              name: m.name || null,
              avatar_url: m.avatarUrl || null,
              role: m.role || 'admin',
              created_at: m.createdAt,
            },
            { onConflict: 'group_id, user_id' }
          );
          if (memberError) {
            console.warn('[Supabase] Failed to upsert creator member:', memberError.message);
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
};

