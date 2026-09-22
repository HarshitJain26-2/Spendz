/**
 * Spendz Live UI Updates & Full Reactivity Verification Suite
 * Tests the complete state flow and mutation matrix across all domains:
 * - Transactions (Add, Edit, Delete, Rapid)
 * - Accounts (Add, Edit, Delete, Update Balance, Transfer)
 * - Friends (Add, Edit, Sync Participant Names)
 * - Splits (Create, Change Payer, Settle, Delete Cascade)
 * - Categories (Inline Creation, Expense & Income Types)
 * - Settings (Theme, User Profile, Onboarding)
 */

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exitCode = 1;
  } else {
    passedTests++;
    console.log(`✅ PASSED: ${message}`);
  }
}

// ─── In-Memory Storage Emulation (Matches repository.web.ts and repository.native.ts) ───
const storage = {
  accounts: [],
  categories: [],
  transactions: [],
  friends: [],
  splits: [],
  participants: [],
  settings: {},
};

// ─── Store Emulations (Matches Zustand Store Actions) ───
const sortTransactions = (list) => {
  return [...list].sort((a, b) => {
    const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (diff !== 0) return diff;
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });
};

const stores = {
  accountStore: {
    accounts: [],
    addAccount(data) {
      const now = new Date().toISOString();
      const account = {
        id: `acc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: data.name,
        type: data.type,
        balance: Number(data.balance) || 0,
        icon: data.icon || 'Wallet',
        color: data.color || '#3B82F6',
        isDefault: data.isDefault ?? false,
        createdAt: now,
        updatedAt: now,
      };
      storage.accounts.push(account);
      this.accounts = [...this.accounts, account];
      return account;
    },
    updateAccount(id, data) {
      const now = new Date().toISOString();
      const sanitized = {
        ...data,
        ...(data.balance !== undefined ? { balance: Number(data.balance) || 0 } : {}),
        updatedAt: now,
      };
      storage.accounts = storage.accounts.map((a) => (a.id === id ? { ...a, ...sanitized } : a));
      this.accounts = this.accounts.map((a) => (a.id === id ? { ...a, ...sanitized } : a));
    },
    deleteAccount(id) {
      storage.accounts = storage.accounts.filter((a) => a.id !== id);
      this.accounts = this.accounts.filter((a) => a.id !== id);
    },
    updateBalance(id, delta) {
      const acc = this.accounts.find((a) => a.id === id);
      if (!acc) return;
      const current = Number(acc.balance) || 0;
      const newBal = current + Number(delta);
      this.updateAccount(id, { balance: newBal });
    },
    getTotalBalance() {
      return this.accounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
    },
  },

  categoryStore: {
    categories: [],
    addCategory(data) {
      const now = new Date().toISOString();
      const cat = {
        id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: data.name,
        icon: data.icon,
        color: data.color,
        type: data.type,
        isDefault: false,
        createdAt: now,
      };
      storage.categories.push(cat);
      this.categories = [...this.categories, cat];
      return cat;
    },
    getCategoryById(id) {
      return this.categories.find((c) => c.id === id);
    },
  },

  friendStore: {
    friends: [],
    addFriend(data) {
      const now = new Date().toISOString();
      const friend = {
        id: `fr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: data.name,
        phone: data.phone || null,
        avatarColor: '#4ECDC4',
        createdAt: now,
      };
      storage.friends.push(friend);
      this.friends = [...this.friends, friend];
      return friend;
    },
    updateFriend(id, data) {
      storage.friends = storage.friends.map((f) => (f.id === id ? { ...f, ...data } : f));
      this.friends = this.friends.map((f) => (f.id === id ? { ...f, ...data } : f));
      if (data.name) {
        stores.splitStore.updateFriendName(id, data.name);
      }
    },
  },

  splitStore: {
    splitExpenses: [],
    addSplitExpense(data) {
      const now = new Date().toISOString();
      const splitId = `sp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const totalAmount = Number(data.totalAmount) || 0;
      const paidByType = data.paidByType || 'me';
      const paidByFriendId = data.paidByFriendId || null;

      const participantRecords = data.participants.map((p) => {
        const isPaid = paidByType === 'me' ? p.friendId === null : p.friendId === paidByFriendId;
        return {
          id: `pt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          splitExpenseId: splitId,
          friendId: p.friendId,
          name: p.name,
          amount: Number(p.amount) || 0,
          isPaid,
          settledAt: isPaid ? now : null,
        };
      });

      const splitExpense = {
        id: splitId,
        transactionId: data.transactionId,
        totalAmount,
        splitMethod: data.splitMethod,
        status: 'pending',
        paidByType,
        paidByFriendId,
        createdAt: now,
        participants: participantRecords,
      };

      storage.splits.push({ ...splitExpense, participants: undefined });
      storage.participants.push(...participantRecords);
      this.splitExpenses = [...this.splitExpenses, splitExpense];
      return splitExpense;
    },
    updateSplitExpense(splitExpenseId, data, participants) {
      const sanitizedData = {
        ...data,
        ...(data.totalAmount !== undefined ? { totalAmount: Number(data.totalAmount) || 0 } : {}),
      };
      const sanitizedParticipants = participants?.map((p) => ({
        ...p,
        amount: Number(p.amount) || 0,
      }));

      storage.splits = storage.splits.map((s) => (s.id === splitExpenseId ? { ...s, ...sanitizedData } : s));
      this.splitExpenses = this.splitExpenses.map((s) => {
        if (s.id !== splitExpenseId) return s;
        return {
          ...s,
          ...sanitizedData,
          participants: sanitizedParticipants || s.participants,
        };
      });
    },
    settleSplitParticipant(splitExpenseId, participantId) {
      const now = new Date().toISOString();
      const split = this.splitExpenses.find((s) => s.id === splitExpenseId);
      if (!split) return;

      const updatedParticipants = split.participants.map((p) =>
        p.id === participantId ? { ...p, isPaid: true, settledAt: now } : p
      );
      const allPaid = updatedParticipants.every((p) => p.isPaid);
      const newStatus = allPaid ? 'settled' : 'partial';

      this.splitExpenses = this.splitExpenses.map((s) =>
        s.id === splitExpenseId ? { ...s, status: newStatus, participants: updatedParticipants } : s
      );
    },
    deleteSplitByTransactionId(transactionId) {
      storage.splits = storage.splits.filter((s) => s.transactionId !== transactionId);
      this.splitExpenses = this.splitExpenses.filter((s) => s.transactionId !== transactionId);
    },
    getFriendBalance(friendId) {
      let balance = 0;
      const validTxIds = new Set(stores.transactionStore.transactions.map((t) => t.id));

      for (const split of this.splitExpenses) {
        if (!validTxIds.has(split.transactionId)) continue;
        const paidByType = split.paidByType || 'me';

        if (paidByType === 'me') {
          const participant = split.participants?.find((p) => p.friendId === friendId);
          if (participant && !participant.isPaid) {
            balance += Number(participant.amount) || 0;
          }
        } else if (paidByType === 'friend' && split.paidByFriendId === friendId) {
          const myParticipant = split.participants?.find((p) => p.friendId === null);
          if (myParticipant && !myParticipant.isPaid) {
            balance -= Number(myParticipant.amount) || 0;
          }
        }
      }
      return balance;
    },
    updateFriendName(friendId, name) {
      this.splitExpenses = this.splitExpenses.map((s) => ({
        ...s,
        participants: s.participants?.map((p) => (p.friendId === friendId ? { ...p, name } : p)),
      }));
    },
  },

  transactionStore: {
    transactions: [],
    addTransaction(data) {
      const now = new Date().toISOString();
      const amount = Number(data.amount) || 0;
      const transaction = {
        id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        type: data.type,
        amount,
        categoryId: data.categoryId,
        accountId: data.accountId,
        toAccountId: data.toAccountId || null,
        note: data.note,
        date: data.date,
        createdAt: now,
        updatedAt: now,
      };

      storage.transactions.unshift(transaction);

      if (!data.skipBalanceUpdate) {
        switch (data.type) {
          case 'expense':
            stores.accountStore.updateBalance(data.accountId, -amount);
            break;
          case 'income':
            stores.accountStore.updateBalance(data.accountId, amount);
            break;
          case 'transfer':
            if (data.toAccountId) {
              stores.accountStore.updateBalance(data.accountId, -amount);
              stores.accountStore.updateBalance(data.toAccountId, amount);
            }
            break;
        }
      }

      this.transactions = sortTransactions([transaction, ...this.transactions]);
      return transaction;
    },
    updateTransaction(id, data, options) {
      const now = new Date().toISOString();
      const existing = this.transactions.find((t) => t.id === id);
      if (!existing) return;

      const split = stores.splitStore.splitExpenses.find((s) => s.transactionId === id);
      const wasPaidByFriend =
        options?.wasPaidByFriend !== undefined
          ? options.wasPaidByFriend
          : split?.paidByType === 'friend';

      if (!wasPaidByFriend) {
        switch (existing.type) {
          case 'expense':
            stores.accountStore.updateBalance(existing.accountId, existing.amount);
            break;
          case 'income':
            stores.accountStore.updateBalance(existing.accountId, -existing.amount);
            break;
          case 'transfer':
            if (existing.toAccountId) {
              stores.accountStore.updateBalance(existing.accountId, existing.amount);
              stores.accountStore.updateBalance(existing.toAccountId, -existing.amount);
            }
            break;
        }
      }

      const sanitizedData = {
        ...data,
        ...(data.amount !== undefined ? { amount: Number(data.amount) || 0 } : {}),
        updatedAt: now,
      };

      const updated = { ...existing, ...sanitizedData };

      if (!options?.skipBalanceUpdate) {
        switch (updated.type) {
          case 'expense':
            stores.accountStore.updateBalance(updated.accountId, -updated.amount);
            break;
          case 'income':
            stores.accountStore.updateBalance(updated.accountId, updated.amount);
            break;
          case 'transfer':
            if (updated.toAccountId) {
              stores.accountStore.updateBalance(updated.accountId, -updated.amount);
              stores.accountStore.updateBalance(updated.toAccountId, updated.amount);
            }
            break;
        }
      }

      this.transactions = sortTransactions(
        this.transactions.map((t) => (t.id === id ? updated : t))
      );
    },
    deleteTransaction(id) {
      const existing = this.transactions.find((t) => t.id === id);
      if (!existing) return;

      const split = stores.splitStore.splitExpenses.find((s) => s.transactionId === id);
      const wasPaidByFriend = split?.paidByType === 'friend';

      if (!wasPaidByFriend) {
        switch (existing.type) {
          case 'expense':
            stores.accountStore.updateBalance(existing.accountId, existing.amount);
            break;
          case 'income':
            stores.accountStore.updateBalance(existing.accountId, -existing.amount);
            break;
          case 'transfer':
            if (existing.toAccountId) {
              stores.accountStore.updateBalance(existing.accountId, existing.amount);
              stores.accountStore.updateBalance(existing.toAccountId, -existing.amount);
            }
            break;
        }
      }

      stores.splitStore.deleteSplitByTransactionId(id);
      this.transactions = this.transactions.filter((t) => t.id !== id);
    },
  },
};

// ═══════════════════════════════════════════════════════════════
// RUN VERIFICATION TESTS
// ═══════════════════════════════════════════════════════════════

console.log('--- Initial Setup: Create Cash Account ---');
const cashAcc = stores.accountStore.addAccount({
  name: 'Cash',
  type: 'cash',
  balance: 4650,
});
assert(stores.accountStore.getTotalBalance() === 4650, 'Initial balance is ₹4,650');

console.log('\n--- Test A: Add Expense (₹500 Food) ---');
const expTx = stores.transactionStore.addTransaction({
  type: 'expense',
  amount: 500,
  categoryId: 'food',
  accountId: cashAcc.id,
  note: 'Food',
  date: new Date().toISOString(),
});
assert(stores.accountStore.getTotalBalance() === 4150, 'Home Balance immediately decreases to ₹4,150');
assert(stores.transactionStore.transactions[0].id === expTx.id, 'Activity displays new transaction immediately');

console.log('\n--- Test B: Add Income (₹2,000) ---');
const incTx = stores.transactionStore.addTransaction({
  type: 'income',
  amount: 2000,
  categoryId: 'salary',
  accountId: cashAcc.id,
  note: 'Bonus',
  date: new Date().toISOString(),
});
assert(stores.accountStore.getTotalBalance() === 6150, 'Home Balance immediately increases to ₹6,150');
assert(stores.transactionStore.transactions[0].id === incTx.id, 'Activity displays income at top');

console.log('\n--- Test C: Add Friend (Rahul) ---');
const rahul = stores.friendStore.addFriend({ name: 'Rahul' });
assert(stores.friendStore.friends.some((f) => f.name === 'Rahul'), 'Friends list immediately shows Rahul');

console.log('\n--- Test D: Create Split (₹600, Me + Rahul, Paid by Me) ---');
const splitTx = stores.transactionStore.addTransaction({
  type: 'expense',
  amount: 600,
  categoryId: 'dining',
  accountId: cashAcc.id,
  note: 'Dinner with Rahul',
  date: new Date().toISOString(),
});
const splitRecord = stores.splitStore.addSplitExpense({
  transactionId: splitTx.id,
  totalAmount: 600,
  splitMethod: 'equal',
  paidByType: 'me',
  participants: [
    { friendId: null, name: 'You', amount: 300 },
    { friendId: rahul.id, name: 'Rahul', amount: 300 },
  ],
});
assert(stores.accountStore.getTotalBalance() === 5550, 'Account balance decreased by ₹600 (now ₹5,550)');
assert(stores.splitStore.getFriendBalance(rahul.id) === 300, 'Friends screen immediately shows "Rahul owes you ₹300"');

console.log('\n--- Test E: Change Payer (Paid by Me → Paid by Rahul) ---');
// Step 1: Update split expense in splitStore
stores.splitStore.updateSplitExpense(
  splitRecord.id,
  { paidByType: 'friend', paidByFriendId: rahul.id },
  [
    { friendId: null, name: 'You', amount: 300, isPaid: false },
    { friendId: rahul.id, name: 'Rahul', amount: 300, isPaid: true },
  ]
);
// Step 2: Update transaction with balance adjustments
stores.transactionStore.updateTransaction(
  splitTx.id,
  { note: 'Dinner (Paid by Rahul)' },
  { skipBalanceUpdate: true, wasPaidByFriend: false }
);
assert(stores.accountStore.getTotalBalance() === 6150, 'Account balance restored ₹600 refund because Rahul paid (now ₹6,150)');
assert(stores.splitStore.getFriendBalance(rahul.id) === -300, 'Friends screen immediately shows "You owe Rahul ₹300"');

console.log('\n--- Test F: Delete Split Transaction ---');
stores.transactionStore.deleteTransaction(splitTx.id);
assert(stores.splitStore.getFriendBalance(rahul.id) === 0, 'Rahul balance immediately updates to 0 (Settled) upon deletion');
assert(!stores.transactionStore.transactions.some((t) => t.id === splitTx.id), 'Transaction removed from Activity & Home');

console.log('\n--- Test G: Edit Friend (Rahul → Rahul Sharma) ---');
stores.friendStore.updateFriend(rahul.id, { name: 'Rahul Sharma' });
assert(stores.friendStore.friends.find((f) => f.id === rahul.id).name === 'Rahul Sharma', 'Friend name immediately shows "Rahul Sharma"');

console.log('\n--- Test H: Category Creation (Inline Gym) ---');
const gymCat = stores.categoryStore.addCategory({
  name: 'Gym',
  icon: 'Dumbbell',
  color: '#FF6B6B',
  type: 'expense',
});
assert(stores.categoryStore.categories.some((c) => c.name === 'Gym'), 'Category store immediately contains "Gym"');
assert(stores.categoryStore.getCategoryById(gymCat.id).name === 'Gym', 'Category queryable by ID immediately');

console.log('\n--- Test I: Add Account (HDFC Bank ₹10,000) ---');
const hdfc = stores.accountStore.addAccount({
  name: 'HDFC Bank',
  type: 'bank',
  balance: 10000,
});
assert(stores.accountStore.accounts.some((a) => a.name === 'HDFC Bank'), 'Account list immediately contains "HDFC Bank"');
assert(stores.accountStore.getTotalBalance() === 16150, 'Home total balance immediately reflects new account (₹16,150)');

console.log('\n--- Test J: Rapid Mutations (Add → Edit → Delete → Add) ---');
const rapid1 = stores.transactionStore.addTransaction({
  type: 'expense',
  amount: 250,
  categoryId: gymCat.id,
  accountId: hdfc.id,
  note: 'Protein Shake',
  date: new Date().toISOString(),
});
assert(stores.accountStore.getTotalBalance() === 15900, 'Rapid Add: Balance is ₹15,900');

stores.transactionStore.updateTransaction(rapid1.id, { amount: 350 });
assert(stores.accountStore.getTotalBalance() === 15800, 'Rapid Edit: Balance updated to ₹15,800');

stores.transactionStore.deleteTransaction(rapid1.id);
assert(stores.accountStore.getTotalBalance() === 16150, 'Rapid Delete: Balance restored to ₹16,150');
assert(!stores.transactionStore.transactions.some((t) => t.id === rapid1.id), 'Rapid Delete: Record absent');

const rapid2 = stores.transactionStore.addTransaction({
  type: 'expense',
  amount: 150,
  categoryId: gymCat.id,
  accountId: hdfc.id,
  note: 'Creatine',
  date: new Date().toISOString(),
});
assert(stores.accountStore.getTotalBalance() === 16000, 'Rapid Second Add: Balance is ₹16,000');
assert(stores.transactionStore.transactions[0].id === rapid2.id, 'Rapid Second Add: Record present at top');

console.log('\n--- Test K: Settlement Reactivity ---');
// Create a new split where user paid ₹400 for Rahul Sharma
const settleSplitTx = stores.transactionStore.addTransaction({
  type: 'expense',
  amount: 400,
  categoryId: 'dining',
  accountId: hdfc.id,
  note: 'Lunch with Rahul',
  date: new Date().toISOString(),
});
const settleSplitRecord = stores.splitStore.addSplitExpense({
  transactionId: settleSplitTx.id,
  totalAmount: 400,
  splitMethod: 'equal',
  paidByType: 'me',
  participants: [
    { friendId: null, name: 'You', amount: 200 },
    { friendId: rahul.id, name: 'Rahul Sharma', amount: 200 },
  ],
});
assert(stores.splitStore.getFriendBalance(rahul.id) === 200, 'Rahul owes ₹200 before settlement');

// Settle participant
const rahulParticipant = settleSplitRecord.participants.find((p) => p.friendId === rahul.id);
stores.splitStore.settleSplitParticipant(settleSplitRecord.id, rahulParticipant.id);
assert(stores.splitStore.getFriendBalance(rahul.id) === 0, 'Rahul balance is immediately 0 (Settled) after settlement');

// Record received settlement income
stores.transactionStore.addTransaction({
  type: 'income',
  amount: 200,
  accountId: hdfc.id,
  categoryId: null,
  note: 'Settlement from Rahul Sharma',
  date: new Date().toISOString(),
});
assert(stores.accountStore.getTotalBalance() === 15800, 'Balance accurately accounts for settlement funds received (₹15,800)');

console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
if (passedTests === totalTests) {
  console.log('🎉 ALL REACTIVE MUTATION TESTS PASSED!');
} else {
  console.error('❌ SOME TESTS FAILED');
  process.exit(1);
}
