import type {
  Account,
  Category,
  Transaction,
  Friend,
  SplitExpense,
  SplitParticipant,
  SplitStatus,
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
}
