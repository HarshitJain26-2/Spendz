import type {
  Account,
  Category,
  Transaction,
  Friend,
  SplitExpense,
  SplitParticipant,
  SplitStatus,
  Group,
  GroupMember,
  GroupInvite,
  GroupExpense,
  GroupExpenseParticipant,
  GroupSettlement,
} from '@/types';

export interface DatabaseRepository {
  init(): Promise<void>;
  seedDefaultCategories(): void;

  // Accounts
  getAccounts(): Account[];
  addAccount(account: Account): void;
  updateAccount(id: string, data: Partial<Account>): void;
  deleteAccount(id: string): void;

  // Categories
  getCategories(): Category[];
  addCategory(category: Category): void;
  updateCategory(id: string, data: Partial<Category>): void;
  deleteCategory(id: string): void;

  // Transactions
  getTransactions(): Transaction[];
  addTransaction(transaction: Transaction): void;
  updateTransaction(id: string, data: Partial<Transaction>): void;
  deleteTransaction(id: string): void;

  // Friends
  getFriends(): Friend[];
  addFriend(friend: Friend): void;
  updateFriend(id: string, data: Partial<Friend>): void;
  deleteFriend(id: string): void;

  // Splits
  getSplitExpenses(): SplitExpense[];
  addSplitExpense(
    split: Omit<SplitExpense, 'participants'>,
    participants: SplitParticipant[]
  ): void;
  updateSplitExpense(
    id: string,
    data: Partial<Omit<SplitExpense, 'participants'>>,
    participants?: SplitParticipant[]
  ): void;
  settleSplitParticipant(
    splitExpenseId: string,
    participantId: string,
    settledAt: string,
    newStatus: SplitStatus
  ): void;
  deleteSplitExpense(id: string): void;
  deleteSplitByTransactionId(transactionId: string): void;

  // Groups
  getGroups(): Group[];
  addGroup(group: Group, members: GroupMember[]): void;
  updateGroup(id: string, data: Partial<Group>): void;
  deleteGroup(id: string): void;
  addGroupMember(member: GroupMember): void;
  removeGroupMember(groupId: string, friendId: string | null): void;
  getGroupMembers(groupId: string): GroupMember[];
  joinGroup(groupId: string, member: GroupMember, groupToInsert?: Group): { success: boolean; message?: string };

  // Group Invites
  createGroupInvite(invite: GroupInvite): void;
  getInviteByCode(code: string): GroupInvite | null;
  getInvitesByGroupId(groupId: string): GroupInvite[];
  getActiveInviteByGroupId(groupId: string): GroupInvite | null;
  revokeGroupInvite(inviteId: string): void;

  // Group Expenses
  getGroupExpenses(groupId?: string): GroupExpense[];
  addGroupExpense(
    expense: Omit<GroupExpense, 'participants'>,
    participants: GroupExpenseParticipant[]
  ): void;
  updateGroupExpense(
    id: string,
    data: Partial<Omit<GroupExpense, 'participants'>>,
    participants?: GroupExpenseParticipant[]
  ): void;
  deleteGroupExpense(id: string): void;

  // Group Settlements
  getGroupSettlements(groupId?: string): GroupSettlement[];
  addGroupSettlement(settlement: GroupSettlement): void;
  deleteGroupSettlement(id: string): void;

  // Settings
  getSetting(key: string): string | null;
  setSetting(key: string, value: string): void;
  getAppSettings(): {
    hasOnboarded: boolean;
    themeMode: import('@/types').ThemeMode;
    userProfile: import('@/types').UserProfile;
  };
  saveAppSettings(settings: Partial<{
    hasOnboarded: boolean;
    themeMode: import('@/types').ThemeMode;
    userProfile: Partial<import('@/types').UserProfile>;
  }>): void;
}

