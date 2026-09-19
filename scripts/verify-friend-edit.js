const assert = require('assert');

// 1. Storage simulation (Web localStorage and SQLite repo behavioral model)
class MockRepository {
  constructor() {
    this.friends = [];
    this.splitExpenses = [];
    this.splitParticipants = [];
  }

  addFriend(friend) {
    this.friends.push({ ...friend });
  }

  getFriends() {
    return [...this.friends];
  }

  updateFriend(id, data) {
    this.friends = this.friends.map((f) => (f.id === id ? { ...f, ...data } : f));
  }

  addSplitExpense(split, participants) {
    this.splitExpenses.push({ ...split });
    this.splitParticipants.push(...participants.map((p) => ({ ...p })));
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

function computeFriendBalance(friendId, splitExpenses) {
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

console.log('=== RUNNING FRIEND EDIT VERIFICATION TESTS ===\n');

// ----------------------------------------------------
// TEST 1: Friend Profile Update & ID Immutability
// ----------------------------------------------------
console.log('--- TEST 1: Friend ID Immutability & Profile Update ---');
{
  const repo = new MockRepository();
  const originalFriend = {
    id: 'friend-abc123',
    name: 'Rahul',
    phone: null,
    avatarColor: '#4ECDC4',
    createdAt: '2026-09-19T10:00:00.000Z',
  };
  repo.addFriend(originalFriend);

  // Edit friend
  const editedName = '  Rahul Sharma  '.trim();
  const editedPhone = '+91 9876543210'.trim();
  const editedColor = '#FF6B6B';

  repo.updateFriend('friend-abc123', {
    name: editedName,
    phone: editedPhone,
    avatarColor: editedColor,
  });

  const updated = repo.getFriends().find((f) => f.id === 'friend-abc123');
  assert.strictEqual(updated.id, 'friend-abc123', 'Friend ID MUST NOT change');
  assert.strictEqual(updated.name, 'Rahul Sharma', 'Name should be updated and trimmed');
  assert.strictEqual(updated.phone, '+91 9876543210', 'Phone should be updated');
  assert.strictEqual(updated.avatarColor, '#FF6B6B', 'Avatar color should be updated');
  console.log('✓ TEST 1 PASSED: Friend ID is immutable and profile fields updated correctly');
}

// ----------------------------------------------------
// TEST 2: Whitespace Trimming & Validation
// ----------------------------------------------------
console.log('\n--- TEST 2: Name Validation & Whitespace Trimming ---');
{
  function validateFriendInput(name, phone) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { valid: false, error: 'Name is required' };
    }
    return {
      valid: true,
      data: {
        name: trimmedName,
        phone: phone ? phone.trim() || null : null,
      },
    };
  }

  assert.strictEqual(validateFriendInput('', '+91 123').valid, false);
  assert.strictEqual(validateFriendInput('   ', '+91 123').valid, false);
  assert.strictEqual(validateFriendInput('\t\n', '+91 123').valid, false);

  const res = validateFriendInput('  Rahul Sharma  ', '  +91 98765 43210  ');
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.data.name, 'Rahul Sharma');
  assert.strictEqual(res.data.phone, '+91 98765 43210');

  // Optional contact
  const resNoPhone = validateFriendInput('Rahul Sharma', '   ');
  assert.strictEqual(resNoPhone.valid, true);
  assert.strictEqual(resNoPhone.data.phone, null);
  console.log('✓ TEST 2 PASSED: Whitespace-only names rejected, valid names trimmed, optional phone handled');
}

// ----------------------------------------------------
// TEST 3: Duplicate Name Non-Collision
// ----------------------------------------------------
console.log('\n--- TEST 3: Duplicate Name Non-Collision ---');
{
  const repo = new MockRepository();
  repo.addFriend({
    id: 'friend-1',
    name: 'Rahul',
    phone: null,
    avatarColor: '#4ECDC4',
    createdAt: '2026-09-19T10:00:00.000Z',
  });
  repo.addFriend({
    id: 'friend-2',
    name: 'Rahul',
    phone: '+91 1111111111',
    avatarColor: '#FF6B6B',
    createdAt: '2026-09-19T10:00:00.000Z',
  });

  // Edit Friend 1 only
  repo.updateFriend('friend-1', { name: 'Rahul Sharma' });

  const f1 = repo.getFriends().find((f) => f.id === 'friend-1');
  const f2 = repo.getFriends().find((f) => f.id === 'friend-2');

  assert.strictEqual(f1.name, 'Rahul Sharma');
  assert.strictEqual(f2.name, 'Rahul');
  assert.strictEqual(f2.phone, '+91 1111111111');
  console.log('✓ TEST 3 PASSED: Friends with identical names maintain separate identity and are not merged');
}

// ----------------------------------------------------
// TEST 4: Split History & Balance Preservation (User Paid)
// ----------------------------------------------------
console.log('\n--- TEST 4: Split History & Balance Preservation (Me Paid) ---');
{
  const repo = new MockRepository();
  const friendId = 'friend-abc123';
  repo.addFriend({
    id: friendId,
    name: 'Rahul',
    phone: null,
    avatarColor: '#4ECDC4',
    createdAt: '2026-09-19T10:00:00.000Z',
  });

  // Me paid ₹600 for dinner with Rahul
  repo.addSplitExpense(
    {
      id: 'split-1',
      transactionId: 'tx-1',
      totalAmount: 600,
      splitMethod: 'equal',
      status: 'pending',
      paidByType: 'me',
      paidByFriendId: null,
      createdAt: '2026-09-19T10:00:00.000Z',
    },
    [
      { id: 'p-1', splitExpenseId: 'split-1', friendId: null, name: 'You', amount: 300, isPaid: true, settledAt: '2026-09-19' },
      { id: 'p-2', splitExpenseId: 'split-1', friendId: friendId, name: 'Rahul', amount: 300, isPaid: false, settledAt: null },
    ]
  );

  const balanceBefore = computeFriendBalance(friendId, repo.getSplitExpenses());
  assert.strictEqual(balanceBefore, 300, 'Rahul owes me ₹300 before edit');

  // Edit Rahul -> Rahul Sharma
  repo.updateFriend(friendId, { name: 'Rahul Sharma', phone: '+91 9876543210' });

  const splitsAfter = repo.getSplitExpenses();
  const balanceAfter = computeFriendBalance(friendId, splitsAfter);
  assert.strictEqual(balanceAfter, 300, 'Balance must remain exactly ₹300 after edit');
  assert.strictEqual(splitsAfter[0].participants.length, 2, 'Split participants preserved');
  assert.strictEqual(splitsAfter[0].participants[1].friendId, friendId, 'Participant friendId unchanged');
  console.log('✓ TEST 4 PASSED: Balance remains ₹300 and split history remains intact after renaming');
}

// ----------------------------------------------------
// TEST 5: Split History & Balance Preservation (Friend Paid)
// ----------------------------------------------------
console.log('\n--- TEST 5: Friend-Paid Split Regression ---');
{
  const repo = new MockRepository();
  const friendId = 'friend-abc123';
  repo.addFriend({
    id: friendId,
    name: 'Rahul',
    phone: null,
    avatarColor: '#4ECDC4',
    createdAt: '2026-09-19T10:00:00.000Z',
  });

  // Rahul paid ₹600 for dinner
  repo.addSplitExpense(
    {
      id: 'split-2',
      transactionId: 'tx-2',
      totalAmount: 600,
      splitMethod: 'equal',
      status: 'pending',
      paidByType: 'friend',
      paidByFriendId: friendId,
      createdAt: '2026-09-19T10:00:00.000Z',
    },
    [
      { id: 'p-3', splitExpenseId: 'split-2', friendId: null, name: 'You', amount: 300, isPaid: false, settledAt: null },
      { id: 'p-4', splitExpenseId: 'split-2', friendId: friendId, name: 'Rahul', amount: 300, isPaid: true, settledAt: '2026-09-19' },
    ]
  );

  const balanceBefore = computeFriendBalance(friendId, repo.getSplitExpenses());
  assert.strictEqual(balanceBefore, -300, 'I owe Rahul ₹300 before edit');

  // Edit Rahul -> Rahul Sharma
  repo.updateFriend(friendId, { name: 'Rahul Sharma' });

  const splitsAfter = repo.getSplitExpenses();
  const balanceAfter = computeFriendBalance(friendId, splitsAfter);
  assert.strictEqual(balanceAfter, -300, 'I owe Rahul Sharma ₹300 after edit');
  assert.strictEqual(splitsAfter[0].paidByFriendId, friendId, 'paidByFriendId unchanged');
  console.log('✓ TEST 5 PASSED: Friend-paid split balance remains -₹300 with zero accounting deviation');
}

// ----------------------------------------------------
// TEST 6: Settlement Regression
// ----------------------------------------------------
console.log('\n--- TEST 6: Settlement Regression with Renamed Friend ---');
{
  const repo = new MockRepository();
  const friendId = 'friend-abc123';
  repo.addFriend({
    id: friendId,
    name: 'Rahul',
    phone: null,
    avatarColor: '#4ECDC4',
    createdAt: '2026-09-19T10:00:00.000Z',
  });

  // I owe Rahul ₹300
  repo.addSplitExpense(
    {
      id: 'split-3',
      transactionId: 'tx-3',
      totalAmount: 600,
      splitMethod: 'equal',
      status: 'pending',
      paidByType: 'friend',
      paidByFriendId: friendId,
      createdAt: '2026-09-19T10:00:00.000Z',
    },
    [
      { id: 'p-5', splitExpenseId: 'split-3', friendId: null, name: 'You', amount: 300, isPaid: false, settledAt: null },
      { id: 'p-6', splitExpenseId: 'split-3', friendId: friendId, name: 'Rahul', amount: 300, isPaid: true, settledAt: '2026-09-19' },
    ]
  );

  // Edit Rahul -> Rahul Sharma
  repo.updateFriend(friendId, { name: 'Rahul Sharma' });

  // Settle up
  repo.settleSplitParticipant('split-3', 'p-5', '2026-09-19T12:00:00.000Z', 'settled');

  const splitsAfter = repo.getSplitExpenses();
  const balanceAfter = computeFriendBalance(friendId, splitsAfter);
  assert.strictEqual(balanceAfter, 0, 'Debt must become ₹0 after settlement');
  assert.strictEqual(splitsAfter[0].status, 'settled', 'Split marked as settled');
  console.log('✓ TEST 6 PASSED: Settlement functions cleanly on edited friend, reducing balance to ₹0');
}

console.log('\n=============================================');
console.log('ALL 6 FRIEND EDIT VERIFICATION TESTS PASSED!');
console.log('=============================================\n');
