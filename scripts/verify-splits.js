// Direct unit test of calculation and split logic for Spendz
const assert = require('assert');

function calculateEqualSplit(totalAmount, participantCount) {
  if (participantCount <= 0) return [];
  const baseAmount = Math.floor((totalAmount * 100) / participantCount) / 100;
  const remainder = Math.round((totalAmount - baseAmount * participantCount) * 100);
  return Array.from({ length: participantCount }, (_, i) =>
    i < remainder ? baseAmount + 0.01 : baseAmount
  );
}

function computeFriendBalance(friendId, splitExpenses) {
  let balance = 0;
  for (const split of splitExpenses) {
    const paidByType = split.paidByType || 'me';

    if (paidByType === 'me') {
      const participant = split.participants?.find(
        (p) => p.friendId === friendId
      );
      if (participant && !participant.isPaid) {
        balance += participant.amount;
      }
    } else if (paidByType === 'friend' && split.paidByFriendId === friendId) {
      const myParticipant = split.participants?.find(
        (p) => p.friendId === null
      );
      if (myParticipant && !myParticipant.isPaid) {
        balance -= myParticipant.amount;
      }
    }
  }
  return balance;
}

console.log('--- TEST 1: Me paid, 2 friends (Equal split) ---');
{
  const total = 1500;
  const shares = calculateEqualSplit(total, 3);
  assert.strictEqual(shares[0] + shares[1] + shares[2], 1500);
  assert.strictEqual(shares[0], 500);

  const splits = [{
    id: 's1',
    paidByType: 'me',
    paidByFriendId: null,
    participants: [
      { friendId: null, name: 'You', amount: 500, isPaid: true },
      { friendId: 'f1', name: 'Alice', amount: 500, isPaid: false },
      { friendId: 'f2', name: 'Bob', amount: 500, isPaid: false },
    ]
  }];

  assert.strictEqual(computeFriendBalance('f1', splits), 500, 'Alice owes you 500');
  assert.strictEqual(computeFriendBalance('f2', splits), 500, 'Bob owes you 500');
  console.log('✓ TEST 1 PASSED: Alice and Bob each owe 500');
}

console.log('--- TEST 2: Friend paid (Equal split) ---');
{
  const total = 1000;
  const shares = calculateEqualSplit(total, 2);
  const splits = [{
    id: 's2',
    paidByType: 'friend',
    paidByFriendId: 'f1',
    participants: [
      { friendId: null, name: 'You', amount: 500, isPaid: false },
      { friendId: 'f1', name: 'Alice', amount: 500, isPaid: true },
    ]
  }];

  assert.strictEqual(computeFriendBalance('f1', splits), -500, 'You owe Alice 500');
  console.log('✓ TEST 2 PASSED: You owe Alice 500, zero account deduction for you');
}

console.log('--- TEST 3: 3-person Friend-paid split ---');
{
  const total = 3000;
  const shares = calculateEqualSplit(total, 3);
  const splits = [{
    id: 's3',
    paidByType: 'friend',
    paidByFriendId: 'f1', // Alice paid
    participants: [
      { friendId: null, name: 'You', amount: 1000, isPaid: false },
      { friendId: 'f1', name: 'Alice', amount: 1000, isPaid: true },
      { friendId: 'f2', name: 'Bob', amount: 1000, isPaid: false },
    ]
  }];

  assert.strictEqual(computeFriendBalance('f1', splits), -1000, 'You owe Alice 1000');
  assert.strictEqual(computeFriendBalance('f2', splits), 0, 'You do not owe Bob');
  console.log('✓ TEST 3 PASSED: 3-person friend-paid split correctly attributes -1000 to Alice');
}

console.log('--- TEST 4: Custom Friend-paid split ---');
{
  const splits = [{
    id: 's4',
    paidByType: 'friend',
    paidByFriendId: 'f1',
    participants: [
      { friendId: null, name: 'You', amount: 300, isPaid: false },
      { friendId: 'f1', name: 'Alice', amount: 700, isPaid: true },
    ]
  }];

  assert.strictEqual(computeFriendBalance('f1', splits), -300, 'You owe Alice 300');
  console.log('✓ TEST 4 PASSED: Custom split correctly records user debt of 300');
}

console.log('--- TEST 5: Settlement ---');
{
  const splits = [{
    id: 's5',
    paidByType: 'friend',
    paidByFriendId: 'f1',
    participants: [
      { friendId: null, name: 'You', amount: 300, isPaid: false },
      { friendId: 'f1', name: 'Alice', amount: 700, isPaid: true },
    ]
  }];

  // Settle user participant
  splits[0].participants[0].isPaid = true;
  splits[0].status = 'settled';

  assert.strictEqual(computeFriendBalance('f1', splits), 0, 'Alice is completely settled up');
  console.log('✓ TEST 5 PASSED: Settlement clears balance to 0');
}

console.log('\nALL 5 SPLIT EXPENSE VERIFICATION TESTS PASSED SUCCESSFULLY!');
