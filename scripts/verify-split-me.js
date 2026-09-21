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
    if (newMeSelected) {
      // Current payer is still participating: keep current payer
      return { paidByType: 'me', paidByFriendId: null };
    }
    // Current payer is no longer participating:
    // choose Me if Me is selected (not the case here since newMeSelected is false)
    // otherwise choose the first selected friend
    // otherwise payer = null
    if (newFriendIds.length > 0) {
      return { paidByType: 'friend', paidByFriendId: newFriendIds[0] };
    } else {
      return { paidByType: null, paidByFriendId: null };
    }
  } else if (paidByType === 'friend') {
    if (paidByFriendId && newFriendIds.includes(paidByFriendId)) {
      // Current payer friend is still participating: keep current payer
      return { paidByType: 'friend', paidByFriendId };
    }
    // Payer friend is no longer participating:
    if (newMeSelected) {
      return { paidByType: 'me', paidByFriendId: null };
    } else if (newFriendIds.length > 0) {
      return { paidByType: 'friend', paidByFriendId: newFriendIds[0] };
    } else {
      return { paidByType: null, paidByFriendId: null };
    }
  }
  return { paidByType, paidByFriendId };
}

// 1. Payer is Me, Me is unselected -> Payer switches to first selected friend
const p1 = syncPayer('me', null, false, ['f1', 'f2']);
assert(p1.paidByType === 'friend' && p1.paidByFriendId === 'f1', 'When Me unselected, payer switches to first selected friend');

// 2. Payer is Me, Me remains selected when a friend is added/removed -> Payer stays Me
const p2 = syncPayer('me', null, true, ['f1', 'f2']);
assert(p2.paidByType === 'me' && p2.paidByFriendId === null, 'When Me remains selected, payer stays Me');

// 3. Payer is Friend 1, Friend 1 remains selected -> Payer stays Friend 1 (even if Me toggled)
const p3 = syncPayer('friend', 'f1', false, ['f1', 'f2']);
assert(p3.paidByType === 'friend' && p3.paidByFriendId === 'f1', 'When Friend 1 pays and Me is unselected, payer stays Friend 1');

const p4 = syncPayer('friend', 'f1', true, ['f1', 'f2']);
assert(p4.paidByType === 'friend' && p4.paidByFriendId === 'f1', 'When Friend 1 pays and Me is re-selected, payer stays Friend 1');

// 4. Payer is Friend 1, Friend 1 is removed, Me is selected -> Payer switches to Me
const p5 = syncPayer('friend', 'f1', true, ['f2']);
assert(p5.paidByType === 'me' && p5.paidByFriendId === null, 'When payer Friend 1 is removed and Me is selected, payer switches to Me');

// 5. Payer is Friend 1, Friend 1 is removed, Me is unselected -> Payer switches to first remaining friend (f2)
const p6 = syncPayer('friend', 'f1', false, ['f2']);
assert(p6.paidByType === 'friend' && p6.paidByFriendId === 'f2', 'When payer Friend 1 is removed and Me is unselected, payer switches to next selected friend');

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

const splitExpenseWithoutMe = {
  paidByType: 'friend',
  paidByFriendId: 'f1',
  participants: [
    { friendId: 'f1', name: 'Friend 1', amount: 150, isPaid: true },
    { friendId: 'f2', name: 'Friend 2', amount: 150, isPaid: false },
  ],
};

const userBalanceWithF1 = getFriendBalanceForUser([splitExpenseWithoutMe], 'f1');
assert(userBalanceWithF1 === 0, 'When Me is unselected and Friend 1 pays, user owes 0 to Friend 1 (no fake debt)');

console.log(`\n========================================`);
console.log(`Results: ${passedTests}/${totalTests} tests passed`);
console.log(`========================================`);
