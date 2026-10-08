const assert = require('assert');

// Test simulation of calculateGroupSummary and calculateGroupMemberBalances exactly as implemented
function calculateGroupSummary(expenses, settlements = []) {
  let totalExpenseAmount = 0;
  let totalYouPaid = 0;
  let yourShare = 0;

  for (const exp of expenses) {
    const amt = Number(exp.amount) || 0;
    totalExpenseAmount += amt;

    if (exp.paidByFriendId === null) {
      totalYouPaid += amt;
    }

    const myParticipant = exp.participants?.find((p) => p.friendId === null);
    if (myParticipant) {
      yourShare += Number(myParticipant.shareAmount) || 0;
    }
  }

  let settlementsPaidByMe = 0;
  let settlementsReceivedByMe = 0;

  for (const setl of settlements) {
    const amt = Number(setl.amount) || 0;
    if (setl.fromFriendId === null) {
      settlementsPaidByMe += amt;
    }
    if (setl.toFriendId === null) {
      settlementsReceivedByMe += amt;
    }
  }

  const netBalance =
    Math.round(((totalYouPaid + settlementsPaidByMe) - (yourShare + settlementsReceivedByMe)) * 100) / 100;

  return {
    totalExpenseAmount: Math.round(totalExpenseAmount * 100) / 100,
    totalYouPaid: Math.round(totalYouPaid * 100) / 100,
    yourShare: Math.round(yourShare * 100) / 100,
    netBalance,
  };
}

function calculateGroupMemberBalances(group, expenses, settlements = [], friends = [], currentUserId = null) {
  if (!group) return [];

  const rawMembers = group.members || [];
  const hasMe = rawMembers.some((m) => m.friendId === null);
  const members = hasMe
    ? rawMembers
    : [{ id: `me-${group.id}`, groupId: group.id, friendId: null, createdAt: group.createdAt }, ...rawMembers];

  const memberFriendIds = new Set();
  for (const m of members) memberFriendIds.add(m.friendId);
  for (const exp of expenses) {
    if (exp.paidByFriendId !== undefined) memberFriendIds.add(exp.paidByFriendId);
    for (const p of exp.participants || []) {
      if (p.friendId !== undefined) memberFriendIds.add(p.friendId);
    }
  }
  for (const setl of settlements) {
    if (setl.fromFriendId !== undefined) memberFriendIds.add(setl.fromFriendId);
    if (setl.toFriendId !== undefined) memberFriendIds.add(setl.toFriendId);
  }

  const balanceWithMeMap = new Map();
  const totalPaidMap = new Map();
  const totalShareMap = new Map();

  for (const mId of memberFriendIds) {
    balanceWithMeMap.set(mId, 0);
    totalPaidMap.set(mId, 0);
    totalShareMap.set(mId, 0);
  }

  for (const exp of expenses) {
    const payer = exp.paidByFriendId ?? null;
    const expAmount = Number(exp.amount) || 0;
    totalPaidMap.set(payer, (totalPaidMap.get(payer) || 0) + expAmount);

    for (const p of exp.participants || []) {
      const pId = p.friendId ?? null;
      const share = Number(p.shareAmount) || 0;
      totalShareMap.set(pId, (totalShareMap.get(pId) || 0) + share);

      if (payer === null && pId !== null) {
        const current = balanceWithMeMap.get(pId) || 0;
        balanceWithMeMap.set(pId, current + share);
      } else if (payer !== null && pId === null) {
        const current = balanceWithMeMap.get(payer) || 0;
        balanceWithMeMap.set(payer, current - share);
      }
    }
  }

  for (const setl of settlements) {
    const from = setl.fromFriendId ?? null;
    const to = setl.toFriendId ?? null;
    const amt = Number(setl.amount) || 0;

    totalPaidMap.set(from, (totalPaidMap.get(from) || 0) + amt);
    totalShareMap.set(to, (totalShareMap.get(to) || 0) + amt);

    if (from === null && to !== null) {
      const current = balanceWithMeMap.get(to) || 0;
      balanceWithMeMap.set(to, current + amt);
    } else if (from !== null && to === null) {
      const current = balanceWithMeMap.get(from) || 0;
      balanceWithMeMap.set(from, current - amt);
    }
  }

  const friendMap = new Map(friends.map((f) => [f.id, f]));
  const allMembersList = [];
  const seenFriendIds = new Set();

  for (const m of members) {
    seenFriendIds.add(m.friendId);
    const friendObj = m.friendId ? friendMap.get(m.friendId) || m.friend || null : null;
    const isMe = m.friendId === null && (!m.userId || m.userId === currentUserId);
    allMembersList.push({
      friendId: m.friendId,
      name: isMe ? 'You' : m.name || friendObj?.name || 'Member',
      friend: friendObj,
    });
  }

  for (const fId of memberFriendIds) {
    if (!seenFriendIds.has(fId)) {
      seenFriendIds.add(fId);
      const friendObj = fId ? friendMap.get(fId) || null : null;
      allMembersList.push({
        friendId: fId,
        name: friendObj?.name || 'Member',
        friend: friendObj,
      });
    }
  }

  return allMembersList.map((m) => {
    const mId = m.friendId;
    const paid = totalPaidMap.get(mId) || 0;
    const share = totalShareMap.get(mId) || 0;
    const overallNet = Math.round((paid - share) * 100) / 100;
    const withMe = mId === null ? overallNet : Math.round((balanceWithMeMap.get(mId) || 0) * 100) / 100;

    return {
      friendId: mId,
      friend: m.friend,
      name: m.name,
      balance: overallNet,
      balanceWithMe: withMe,
    };
  });
}

console.log('--- STARTING VERIFICATION TESTS ---');

const testGroup = {
  id: 'grp_1',
  name: 'Test 1',
  icon: '🏖',
  createdAt: '2026-10-06T00:00:00Z',
  updatedAt: '2026-10-06T00:00:00Z',
  members: [
    { id: 'm_1', groupId: 'grp_1', friendId: null },
    { id: 'm_2', groupId: 'grp_1', friendId: 'fr_rahul', friend: { id: 'fr_rahul', name: 'Tsnsn' } },
  ],
};
const friends = [{ id: 'fr_rahul', name: 'Tsnsn' }];

// 1. Initial 4 expenses (matching screenshot baseline of 500 total)
let expenses = [
  {
    id: 'e_1',
    groupId: 'grp_1',
    description: 'Te',
    amount: 200,
    paidByFriendId: null,
    participants: [
      { friendId: null, shareAmount: 100 },
      { friendId: 'fr_rahul', shareAmount: 100 },
    ],
  },
  {
    id: 'e_2',
    groupId: 'grp_1',
    description: 'Gee',
    amount: 100,
    paidByFriendId: null,
    participants: [
      { friendId: null, shareAmount: 50 },
      { friendId: 'fr_rahul', shareAmount: 50 },
    ],
  },
  {
    id: 'e_3',
    groupId: 'grp_1',
    description: 'T2',
    amount: 100,
    paidByFriendId: 'fr_rahul',
    participants: [
      { friendId: null, shareAmount: 50 },
      { friendId: 'fr_rahul', shareAmount: 50 },
    ],
  },
  {
    id: 'e_4',
    groupId: 'grp_1',
    description: 'T1',
    amount: 100,
    paidByFriendId: null,
    participants: [
      { friendId: null, shareAmount: 50 },
      { friendId: 'fr_rahul', shareAmount: 50 },
    ],
  },
];
let settlements = [];

let s1 = calculateGroupSummary(expenses, settlements);
assert.strictEqual(s1.totalExpenseAmount, 500, 'Baseline total expenses should be 500');
assert.strictEqual(s1.totalYouPaid, 400, 'Baseline you paid should be 400');
assert.strictEqual(s1.yourShare, 250, 'Baseline your share should be 250');
assert.strictEqual(s1.netBalance, 150, 'Baseline net balance should be +150');
console.log('✅ Baseline Test Passed: Total 500, You Paid 400, Your Share 250, Balance +150');

// 2. Add Expense Test: "Ga", ₹200, Paid by You, Equal split (You 100, Rahul 100)
expenses = [
  {
    id: 'e_5',
    groupId: 'grp_1',
    description: 'Ga',
    amount: 200,
    paidByFriendId: null,
    participants: [
      { friendId: null, shareAmount: 100 },
      { friendId: 'fr_rahul', shareAmount: 100 },
    ],
  },
  ...expenses,
];

let s2 = calculateGroupSummary(expenses, settlements);
assert.strictEqual(s2.totalExpenseAmount, 700, 'Total should now be 700');
assert.strictEqual(s2.totalYouPaid, 600, 'You Paid should now be 600');
assert.strictEqual(s2.yourShare, 350, 'Your Share should now be 350');
assert.strictEqual(s2.netBalance, 250, 'Balance should now be +250');
let b2 = calculateGroupMemberBalances(testGroup, expenses, settlements, friends);
let rahulB2 = b2.find((m) => m.friendId === 'fr_rahul');
assert.strictEqual(rahulB2.balanceWithMe, 250, 'Rahul should owe you 250');
console.log('✅ Add Expense Test (Ga ₹200) Passed: Total 700, You Paid 600, Your Share 350, Balance +250');

// 3. Friend-paid Test: Test Friend Paid, ₹300, Paid by Rahul, Equal split (You 150, Rahul 150)
expenses = [
  {
    id: 'e_6',
    groupId: 'grp_1',
    description: 'Test Friend Paid',
    amount: 300,
    paidByFriendId: 'fr_rahul',
    participants: [
      { friendId: null, shareAmount: 150 },
      { friendId: 'fr_rahul', shareAmount: 150 },
    ],
  },
  ...expenses,
];

let s3 = calculateGroupSummary(expenses, settlements);
assert.strictEqual(s3.totalExpenseAmount, 1000, 'Total should be 1000');
assert.strictEqual(s3.totalYouPaid, 600, 'You Paid should NOT change (stays 600)');
assert.strictEqual(s3.yourShare, 500, 'Your share should increase to 500');
assert.strictEqual(s3.netBalance, 100, 'Net balance should now be +100');
let b3 = calculateGroupMemberBalances(testGroup, expenses, settlements, friends);
let rahulB3 = b3.find((m) => m.friendId === 'fr_rahul');
assert.strictEqual(rahulB3.balanceWithMe, 100, 'Rahul should now owe you 100');
console.log('✅ Friend-Paid Test Passed: You Paid unchanged (600), Your Share 500, Net Balance +100');

// 4. Custom Split Test: Custom Test, ₹1,000, Paid by You, You: ₹400, Rahul: ₹600
expenses = [
  {
    id: 'e_7',
    groupId: 'grp_1',
    description: 'Custom Test',
    amount: 1000,
    paidByFriendId: null,
    participants: [
      { friendId: null, shareAmount: 400 },
      { friendId: 'fr_rahul', shareAmount: 600 },
    ],
  },
  ...expenses,
];

let s4 = calculateGroupSummary(expenses, settlements);
assert.strictEqual(s4.totalExpenseAmount, 2000, 'Total expenses should be 2000');
assert.strictEqual(s4.totalYouPaid, 1600, 'You Paid should be 1600');
assert.strictEqual(s4.yourShare, 900, 'Your share should be 900');
assert.strictEqual(s4.netBalance, 700, 'Net balance should be 1600 - 900 = +700');
let b4 = calculateGroupMemberBalances(testGroup, expenses, settlements, friends);
let rahulB4 = b4.find((m) => m.friendId === 'fr_rahul');
assert.strictEqual(rahulB4.balanceWithMe, 700, 'Rahul owes you 700');
console.log('✅ Custom Split Test Passed: Total 2000, You Paid 1600, Your Share 900, Net Balance +700');

// 5. Edit Test: Change Custom Test from ₹1000 to ₹1300 (You: 500, Rahul: 800)
expenses = expenses.map((e) =>
  e.id === 'e_7'
    ? {
        ...e,
        amount: 1300,
        participants: [
          { friendId: null, shareAmount: 500 },
          { friendId: 'fr_rahul', shareAmount: 800 },
        ],
      }
    : e
);

let s5 = calculateGroupSummary(expenses, settlements);
assert.strictEqual(s5.totalExpenseAmount, 2300, 'Total expenses should increase by 300 to 2300');
assert.strictEqual(s5.totalYouPaid, 1900, 'You Paid should be 1900');
assert.strictEqual(s5.yourShare, 1000, 'Your Share should be 1000');
assert.strictEqual(s5.netBalance, 900, 'Net Balance should be 900');
console.log('✅ Edit Test Passed: Total 2300, You Paid 1900, Your Share 1000, Net Balance +900');

// 6. Delete Test: Delete Custom Test (e_7)
expenses = expenses.filter((e) => e.id !== 'e_7');
let s6 = calculateGroupSummary(expenses, settlements);
assert.strictEqual(s6.totalExpenseAmount, 1000, 'Total expenses decreased back to 1000');
assert.strictEqual(s6.totalYouPaid, 600, 'You Paid decreased back to 600');
assert.strictEqual(s6.yourShare, 500, 'Your Share decreased back to 500');
assert.strictEqual(s6.netBalance, 100, 'Net Balance decreased back to 100');
console.log('✅ Delete Test Passed: Total 1000, You Paid 600, Your Share 500, Net Balance +100');

// 7. Settlement Test: Rahul settles ₹100 to You
settlements = [
  {
    id: 's_1',
    groupId: 'grp_1',
    fromFriendId: 'fr_rahul',
    toFriendId: null,
    amount: 100,
  },
];
let s7 = calculateGroupSummary(expenses, settlements);
assert.strictEqual(s7.netBalance, 0, 'Net Balance is now 0 (Settled)');
let b7 = calculateGroupMemberBalances(testGroup, expenses, settlements, friends);
let rahulB7 = b7.find((m) => m.friendId === 'fr_rahul');
assert.strictEqual(rahulB7.balanceWithMe, 0, 'Rahul debt to you is 0');
console.log('✅ Settlement Test Passed: Net Balance 0 (Settled), Rahul debt 0');

console.log('--- ALL TESTS PASSED SUCCESSFULLY ---');
