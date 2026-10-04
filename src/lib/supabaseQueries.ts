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
};
