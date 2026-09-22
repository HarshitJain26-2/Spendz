function calculateEqualSplit(totalAmount, participantCount) {
  if (participantCount <= 0) return [];
  const baseAmount = Math.floor((totalAmount * 100) / participantCount) / 100;
  const remainder = Math.round((totalAmount - baseAmount * participantCount) * 100);
  return Array.from({ length: participantCount }, (_, i) =>
    i < remainder ? baseAmount + 0.01 : baseAmount
  );
}

let passedTests = 0;
let totalTests = 0;

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

console.log('--- Testing Equal Split Denominator ---');
// 1. You + 2 friends (total 3)
const splitWithMe = calculateEqualSplit(300, 3);
assert(splitWithMe.length === 3 && splitWithMe.every(s => s === 100), 'Split of 300 between 3 participants equals 100 each');

// 2. Me unselected + 2 friends (total 2)
const splitWithoutMe = calculateEqualSplit(300, 2);
assert(splitWithoutMe.length === 2 && splitWithoutMe.every(s => s === 150), 'Split of 300 between 2 participants (without Me) equals 150 each');

console.log('\n--- Testing Valid Participant States ---');
function validateParticipants(isMeSelected, selectedFriendIds) {
  const totalParticipants = (isMeSelected ? 1 : 0) + selectedFriendIds.length;
  if (totalParticipants === 0) return { valid: false, reason: 'Select at least one participant.' };
  if (isMeSelected && selectedFriendIds.length === 0) return { valid: false, reason: 'Please select at least one friend to split with.' };
  return { valid: true };
}

assert(validateParticipants(true, ['f1']).valid === true, '✓ You + 1 friend -> valid');
assert(validateParticipants(true, ['f1', 'f2']).valid === true, '✓ You + 2 friends -> valid');
assert(validateParticipants(false, ['f1']).valid === true, '□ You + 1 friend -> valid');
assert(validateParticipants(false, ['f1', 'f2']).valid === true, '□ You + 2 friends -> valid');
assert(validateParticipants(true, []).valid === false, '✓ You + no friends -> invalid');
assert(validateParticipants(false, []).valid === false, '□ You + no friends -> invalid');

console.log('\n--- Testing Payer Synchronization ---');
function syncPayer(currentPayerType, currentPayerFriendId, newMeSelected, newFriendIds) {
  let paidByType = currentPayerType;
  let paidByFriendId = currentPayerFriendId;

  if (paidByType === 'me') {
    return { paidByType: 'me', paidByFriendId: null };
  } else if (paidByType === 'friend') {
    if (paidByFriendId && newFriendIds.includes(paidByFriendId)) {
      return { paidByType: 'friend', paidByFriendId };
    }
    return { paidByType: 'me', paidByFriendId: null };
  }
  return { paidByType, paidByFriendId };
}

// 1. Payer is Me, Me is unselected -> Payer stays Me (user can always pay for friends)
const p1 = syncPayer('me', null, false, ['f1', 'f2']);
assert(p1.paidByType === 'me' && p1.paidByFriendId === null, 'When Me is unselected, payer stays Me (user can pay for friends)');

// 2. Payer is Me, Me remains selected -> Payer stays Me
const p2 = syncPayer('me', null, true, ['f1', 'f2']);
assert(p2.paidByType === 'me' && p2.paidByFriendId === null, 'When Me remains selected, payer stays Me');

// 3. Payer is Friend 1, Friend 1 remains selected -> Payer stays Friend 1
const p3 = syncPayer('friend', 'f1', false, ['f1', 'f2']);
assert(p3.paidByType === 'friend' && p3.paidByFriendId === 'f1', 'When Friend 1 pays, payer stays Friend 1');

// 4. Payer is Friend 1, Friend 1 is removed -> Payer falls back to Me
const p4 = syncPayer('friend', 'f1', true, ['f2']);
assert(p4.paidByType === 'me' && p4.paidByFriendId === null, 'When payer Friend 1 is removed, payer falls back to Me');

console.log('\n--- Testing Custom Split Sum ---');
function calcCustomTotal(isMeSelected, selectedFriendIds, customAmounts) {
  let sum = 0;
  if (isMeSelected) {
    sum += parseFloat(customAmounts['you']) || 0;
  }
  for (const fId of selectedFriendIds) {
    sum += parseFloat(customAmounts[fId]) || 0;
  }
  return sum;
}

const amounts = { you: '100', f1: '150', f2: '200' };
assert(calcCustomTotal(true, ['f1', 'f2'], amounts) === 450, 'Custom total with Me includes you: 100 + 150 + 200 = 450');
assert(calcCustomTotal(false, ['f1', 'f2'], amounts) === 350, 'Custom total without Me excludes you: 150 + 200 = 350');

console.log('\n--- Testing Participant Persistence & Balance Rules ---');
// Participant record simulation
function buildParticipants(isMeSelected, selectedFriendIds, totalAmount, isFriendPaid, paidByFriendId) {
  const participants = [];
  const count = (isMeSelected ? 1 : 0) + selectedFriendIds.length;
  const shares = calculateEqualSplit(totalAmount, count);
  let idx = 0;
  if (isMeSelected) {
    participants.push({ friendId: null, name: 'You', amount: shares[idx++] });
  }
  for (const fId of selectedFriendIds) {
    participants.push({ friendId: fId, name: fId, amount: shares[idx++] });
  }
  return participants;
}

const partsWithoutMe = buildParticipants(false, ['f1', 'f2'], 300, true, 'f1');
assert(!partsWithoutMe.some(p => p.friendId === null), 'When Me is unselected, no participant record with friendId === null exists');
assert(partsWithoutMe.length === 2, 'Only friends f1 and f2 are in participant list');

// Friend balance simulation
function getFriendBalanceForUser(splits, friendId) {
  let balance = 0;
  for (const split of splits) {
    if (split.paidByType === 'me') {
      const part = split.participants.find(p => p.friendId === friendId);
      if (part && !part.isPaid) balance += part.amount;
    } else if (split.paidByType === 'friend' && split.paidByFriendId === friendId) {
      const myPart = split.participants.find(p => p.friendId === null);
      if (myPart && !myPart.isPaid) balance -= myPart.amount;
    }
  }
  return balance;
}

// Case A: Friend 1 paid, Me is unselected -> User owes 0
const splitFriendPaid = {
  paidByType: 'friend',
  paidByFriendId: 'f1',
  participants: [
    { friendId: 'f1', name: 'Friend 1', amount: 150, isPaid: true },
    { friendId: 'f2', name: 'Friend 2', amount: 150, isPaid: false },
  ],
};
const userBalanceF1 = getFriendBalanceForUser([splitFriendPaid], 'f1');
assert(userBalanceF1 === 0, 'When Me is unselected and Friend 1 pays, user owes 0 to Friend 1');

// Case B: Me paid, Me is unselected -> Friend 1 owes User 150
const splitMePaid = {
  paidByType: 'me',
  paidByFriendId: null,
  participants: [
    { friendId: 'f1', name: 'Friend 1', amount: 150, isPaid: false },
    { friendId: 'f2', name: 'Friend 2', amount: 150, isPaid: false },
  ],
};
const userBalanceFromF1 = getFriendBalanceForUser([splitMePaid], 'f1');
assert(userBalanceFromF1 === 150, 'When Me is unselected and Me pays, Friend 1 owes user 150');

console.log(`\n========================================`);
console.log(`Results: ${passedTests}/${totalTests} tests passed`);
console.log(`========================================`);
