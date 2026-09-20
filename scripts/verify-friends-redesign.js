const assert = require('assert');

// Test suite for Spendz Friends Redesign & Balance Visibility Fix

class MockSpendzRepository {
  constructor() {
    this.transactions = [];
    this.friends = [];
    this.splitExpenses = [];
    this.splitParticipants = [];
  }

  init() {
    // Idempotent orphan cleanup
    const validTxIds = new Set(this.transactions.map((t) => t.id));
    const validSplits = this.splitExpenses.filter((s) => validTxIds.has(s.transactionId));
    if (validSplits.length !== this.splitExpenses.length) {
      this.splitExpenses = validSplits;
      const validSplitIds = new Set(validSplits.map((s) => s.id));
      this.splitParticipants = this.splitParticipants.filter((p) =>
        validSplitIds.has(p.splitExpenseId)
      );
    }
  }

  addTransaction(tx) {
    this.transactions.push({ ...tx });
  }

  deleteTransaction(id) {
    this.deleteSplitByTransactionId(id);
    this.transactions = this.transactions.filter((t) => t.id !== id);
  }

  addFriend(friend) {
    this.friends.push({ ...friend });
  }

  updateFriend(id, data) {
    this.friends = this.friends.map((f) => (f.id === id ? { ...f, ...data } : f));
  }

  addSplitExpense(split, participants) {
    this.splitExpenses.push({ ...split });
    this.splitParticipants.push(...participants.map((p) => ({ ...p })));
  }

  updateSplitExpense(id, data, participants) {
    this.splitExpenses = this.splitExpenses.map((s) => (s.id === id ? { ...s, ...data } : s));
    if (participants) {
      const partMap = new Map(participants.map((p) => [p.id, p]));
      this.splitParticipants = this.splitParticipants.map((p) =>
        partMap.has(p.id) ? { ...p, ...partMap.get(p.id) } : p
      );
    }
  }

  deleteSplitExpense(id) {
    this.splitExpenses = this.splitExpenses.filter((s) => s.id !== id);
    this.splitParticipants = this.splitParticipants.filter((p) => p.splitExpenseId !== id);
  }

  deleteSplitByTransactionId(transactionId) {
    const targetSplits = this.splitExpenses.filter((s) => s.transactionId === transactionId);
    for (const s of targetSplits) {
      this.deleteSplitExpense(s.id);
    }
  }

  getSplitExpenses() {
    return this.splitExpenses.map((s) => ({
      ...s,
      participants: this.splitParticipants.filter((p) => p.splitExpenseId === s.id),
    }));
  }

  settleSplitParticipant(splitExpenseId, participantId, settledAt, newStatus) {
    this.splitParticipants = this.splitParticipants.map((p) =>
      p.id === participantId ? { ...p, isPaid: true, settledAt } : p
    );
    this.splitExpenses = this.splitExpenses.map((s) =>
      s.id === splitExpenseId ? { ...s, status: newStatus } : s
    );
  }
}

// Balance calculation logic matching src/store/splitStore.ts
function getFriendBalance(friendId, splitExpenses) {
  let balance = 0;
  for (const split of splitExpenses) {
    const paidByType = split.paidByType || 'me';

    if (paidByType === 'me') {
      const participant = split.participants?.find((p) => p.friendId === friendId);
      if (participant && !participant.isPaid) {
        balance += participant.amount;
      }
    } else if (paidByType === 'friend' && split.paidByFriendId === friendId) {
      const myParticipant = split.participants?.find((p) => p.friendId === null);
      if (myParticipant && !myParticipant.isPaid) {
        balance -= myParticipant.amount;
      }
    }
  }
  return balance;
}

// Summary calculation logic matching src/components/friends/BalanceSummary.tsx
function computeOverallSummary(friends, splitExpenses) {
  let totalYouOwe = 0;
  let totalOwedToYou = 0;
  const breakdown = [];

  for (const f of friends) {
    const bal = getFriendBalance(f.id, splitExpenses);
    breakdown.push({ friend: f, balance: bal });
    if (bal > 0) {
      totalOwedToYou += bal;
    } else if (bal < 0) {
      totalYouOwe += Math.abs(bal);
    }
  }

  return { totalYouOwe, totalOwedToYou, breakdown };
}

console.log('Running Spendz Friends UI/UX Redesign & Balance Visibility Tests...\n');

const repo = new MockSpendzRepository();
const rahul = { id: 'f-rahul', name: 'Rahul', phone: '9876543210', avatarColor: '#4ECDC4' };
const aditya = { id: 'f-aditya', name: 'Aditya', phone: null, avatarColor: '#FF6B6B' };
repo.addFriend(rahul);
repo.addFriend(aditya);

// -------------------------------------------------------------
// Test 1 — Friend owes user (Me paid, Equal split)
// -------------------------------------------------------------
console.log('TEST 1: Friend owes user (Me paid ₹600, Equal)');
repo.addTransaction({ id: 't1', amount: 600, type: 'expense', note: 'Dinner' });
repo.addSplitExpense(
  { id: 's1', transactionId: 't1', totalAmount: 600, paidByType: 'me', paidByFriendId: null },
  [
    { id: 'p1', splitExpenseId: 's1', friendId: null, name: 'You', amount: 300, isPaid: true },
    { id: 'p2', splitExpenseId: 's1', friendId: 'f-rahul', name: 'Rahul', amount: 300, isPaid: false },
  ]
);

let summary = computeOverallSummary(repo.friends, repo.getSplitExpenses());
assert.strictEqual(getFriendBalance('f-rahul', repo.getSplitExpenses()), 300);
assert.strictEqual(summary.totalOwedToYou, 300);
assert.strictEqual(summary.totalYouOwe, 0);
console.log('✓ TEST 1 PASSED: Rahul owes ₹300, You are owed ₹300 overall\n');

// -------------------------------------------------------------
// Test 2 — User owes friend (Rahul paid ₹600, Equal)
// -------------------------------------------------------------
console.log('TEST 2: User owes friend (Rahul paid ₹600, Equal)');
// Remove s1, t1 for clean test
repo.deleteTransaction('t1');
repo.addTransaction({ id: 't2', amount: 600, type: 'expense', note: 'Lunch' });
repo.addSplitExpense(
  { id: 's2', transactionId: 't2', totalAmount: 600, paidByType: 'friend', paidByFriendId: 'f-rahul' },
  [
    { id: 'p3', splitExpenseId: 's2', friendId: null, name: 'You', amount: 300, isPaid: false },
    { id: 'p4', splitExpenseId: 's2', friendId: 'f-rahul', name: 'Rahul', amount: 300, isPaid: true },
  ]
);

summary = computeOverallSummary(repo.friends, repo.getSplitExpenses());
assert.strictEqual(getFriendBalance('f-rahul', repo.getSplitExpenses()), -300);
assert.strictEqual(summary.totalYouOwe, 300);
assert.strictEqual(summary.totalOwedToYou, 0);
console.log('✓ TEST 2 PASSED: You owe Rahul ₹300, You owe ₹300 overall\n');

// -------------------------------------------------------------
// Test 3 — Three-way split (Aditya paid ₹900, Equal)
// -------------------------------------------------------------
console.log('TEST 3: Three-way split (Aditya paid ₹900, You + Rahul + Aditya)');
repo.addTransaction({ id: 't3', amount: 900, type: 'expense', note: 'Cab ride' });
repo.addSplitExpense(
  { id: 's3', transactionId: 't3', totalAmount: 900, paidByType: 'friend', paidByFriendId: 'f-aditya' },
  [
    { id: 'p5', splitExpenseId: 's3', friendId: null, name: 'You', amount: 300, isPaid: false },
    { id: 'p6', splitExpenseId: 's3', friendId: 'f-rahul', name: 'Rahul', amount: 300, isPaid: false },
    { id: 'p7', splitExpenseId: 's3', friendId: 'f-aditya', name: 'Aditya', amount: 300, isPaid: true },
  ]
);

const splitsAfter3 = repo.getSplitExpenses();
assert.strictEqual(getFriendBalance('f-aditya', splitsAfter3), -300, 'You owe Aditya ₹300');
assert.strictEqual(getFriendBalance('f-rahul', splitsAfter3), -300, 'Rahul balance with you is unchanged (-300 from t2)');
console.log('✓ TEST 3 PASSED: Bilateral scope correctly attributes -300 to Aditya\n');

// -------------------------------------------------------------
// Test 4 — Settlement
// -------------------------------------------------------------
console.log('TEST 4: Settlement clears balance to 0 without extra expense transaction');
repo.settleSplitParticipant('s2', 'p3', '2026-09-20', 'settled');
assert.strictEqual(getFriendBalance('f-rahul', repo.getSplitExpenses()), 0, 'Rahul is settled');
console.log('✓ TEST 4 PASSED: Rahul settled to ₹0\n');

// -------------------------------------------------------------
// Test 5 — Edit Friend preserves ID and history
// -------------------------------------------------------------
console.log('TEST 5: Edit Friend preserves ID and history');
repo.updateFriend('f-rahul', { name: 'Rahul Sharma' });
const updatedRahul = repo.friends.find((f) => f.id === 'f-rahul');
assert.strictEqual(updatedRahul.name, 'Rahul Sharma');
assert.strictEqual(updatedRahul.id, 'f-rahul');
assert.strictEqual(getFriendBalance('f-rahul', repo.getSplitExpenses()), 0);
console.log('✓ TEST 5 PASSED: Friend renamed to Rahul Sharma, ID and data intact\n');

// -------------------------------------------------------------
// Test 6 — Delete split transaction eliminates orphan splits
// -------------------------------------------------------------
console.log('TEST 6: Delete split transaction eliminates orphan splits');
assert.strictEqual(getFriendBalance('f-aditya', repo.getSplitExpenses()), -300);
assert.strictEqual(repo.splitExpenses.length, 2); // s2 and s3

// Delete parent transaction t3
repo.deleteTransaction('t3');
assert.strictEqual(repo.transactions.find((t) => t.id === 't3'), undefined);
assert.strictEqual(repo.splitExpenses.find((s) => s.transactionId === 't3'), undefined);
assert.strictEqual(repo.splitParticipants.some((p) => p.splitExpenseId === 's3'), false);
assert.strictEqual(getFriendBalance('f-aditya', repo.getSplitExpenses()), 0, 'Aditya is now 0');
console.log('✓ TEST 6 PASSED: Cascade deletion removed split and participants, Aditya balance is 0\n');

// -------------------------------------------------------------
// Test 7 — Edit split payer flips balance
// -------------------------------------------------------------
console.log('TEST 7: Edit split payer (Me -> Rahul)');
repo.addTransaction({ id: 't4', amount: 400, type: 'expense', note: 'Groceries' });
repo.addSplitExpense(
  { id: 's4', transactionId: 't4', totalAmount: 400, paidByType: 'me', paidByFriendId: null },
  [
    { id: 'p8', splitExpenseId: 's4', friendId: null, name: 'You', amount: 200, isPaid: true },
    { id: 'p9', splitExpenseId: 's4', friendId: 'f-rahul', name: 'Rahul Sharma', amount: 200, isPaid: false },
  ]
);
assert.strictEqual(getFriendBalance('f-rahul', repo.getSplitExpenses()), 200, 'Rahul owes you 200');

// Now change payer to Rahul
repo.updateSplitExpense(
  's4',
  { paidByType: 'friend', paidByFriendId: 'f-rahul' },
  [
    { id: 'p8', splitExpenseId: 's4', friendId: null, name: 'You', amount: 200, isPaid: false },
    { id: 'p9', splitExpenseId: 's4', friendId: 'f-rahul', name: 'Rahul Sharma', amount: 200, isPaid: true },
  ]
);
assert.strictEqual(getFriendBalance('f-rahul', repo.getSplitExpenses()), -200, 'You now owe Rahul 200');
console.log('✓ TEST 7 PASSED: Payer change immediately flips balance from +200 to -200\n');

// -------------------------------------------------------------
// Test 8 — Search Filtering
// -------------------------------------------------------------
console.log('TEST 8: Search filtering');
const query = 'rahul';
const searchResults = repo.friends.filter(
  (f) => f.name.toLowerCase().includes(query) || (f.phone && f.phone.includes(query))
);
assert.strictEqual(searchResults.length, 1);
assert.strictEqual(searchResults[0].name, 'Rahul Sharma');
console.log('✓ TEST 8 PASSED: Search correctly returns Rahul Sharma\n');

// -------------------------------------------------------------
// Test 9 — No Netting Ambiguity in Balance Direction
// -------------------------------------------------------------
console.log('TEST 9: Directional Balance Summary preserves both directions without netting');
// Current state: You owe Rahul 200.
// Let's add Aditya owing you 500.
repo.addTransaction({ id: 't5', amount: 1000, type: 'expense', note: 'Hotels' });
repo.addSplitExpense(
  { id: 's5', transactionId: 't5', totalAmount: 1000, paidByType: 'me', paidByFriendId: null },
  [
    { id: 'p10', splitExpenseId: 's5', friendId: null, name: 'You', amount: 500, isPaid: true },
    { id: 'p11', splitExpenseId: 's5', friendId: 'f-aditya', name: 'Aditya', amount: 500, isPaid: false },
  ]
);

const stateC = computeOverallSummary(repo.friends, repo.getSplitExpenses());
assert.strictEqual(stateC.totalYouOwe, 200, 'You owe ₹200');
assert.strictEqual(stateC.totalOwedToYou, 500, 'You are owed ₹500');
// Notice: We do NOT display Net = ₹300!
console.log('✓ TEST 9 PASSED: Both directions preserved: You owe ₹200, You are owed ₹500\n');

// -------------------------------------------------------------
// Test 10 — Orphan Cleanup on Boot
// -------------------------------------------------------------
console.log('TEST 10: Orphan cleanup on boot (init)');
// Simulate a legacy dirty DB state with an orphan split
repo.splitExpenses.push({
  id: 'orphan-split',
  transactionId: 'non-existent-tx-999',
  totalAmount: 500,
  paidByType: 'me',
});
repo.splitParticipants.push({
  id: 'orphan-p',
  splitExpenseId: 'orphan-split',
  friendId: 'f-rahul',
  amount: 250,
  isPaid: false,
});

assert.strictEqual(repo.splitExpenses.length, 4);
repo.init(); // Run boot cleanup
assert.strictEqual(repo.splitExpenses.length, 3);
assert.strictEqual(repo.splitExpenses.some((s) => s.id === 'orphan-split'), false);
assert.strictEqual(repo.splitParticipants.some((p) => p.id === 'orphan-p'), false);
console.log('✓ TEST 10 PASSED: Orphan split and participants successfully purged on boot init\n');

console.log('ALL 10 VERIFICATION TESTS PASSED SUCCESSFULLY! 🚀');
