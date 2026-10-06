const { create } = require('zustand');

// Simulate groupStore logic exactly as in src/store/groupStore.ts
const groups = [
  {
    id: 'grp_1',
    name: 'Trip',
    icon: '🏖',
    createdAt: '2026-10-06T00:00:00Z',
    updatedAt: '2026-10-06T00:00:00Z',
    members: [
      { id: 'm_1', groupId: 'grp_1', friendId: null },
      { id: 'm_2', groupId: 'grp_1', friendId: 'fr_1', friend: { id: 'fr_1', name: 'Rahul' } },
    ],
  },
];

let groupExpenses = [];
let groupSettlements = [];

function getGroupMemberBalances(groupId) {
  const group = groups.find((g) => g.id === groupId);
  if (!group) return [];

  const expenses = groupExpenses.filter((e) => e.groupId === groupId);
  const settlements = groupSettlements.filter((e) => e.groupId === groupId);

  const members = group.members || [];
  const memberIds = members.map((m) => m.friendId);

  const balanceWithMeMap = new Map();
  const totalPaidMap = new Map();
  const totalShareMap = new Map();

  for (const mId of memberIds) {
    balanceWithMeMap.set(mId, 0);
    totalPaidMap.set(mId, 0);
    totalShareMap.set(mId, 0);
  }

  for (const exp of expenses) {
    const payer = exp.paidByFriendId;
    const expAmount = Number(exp.amount) || 0;
    totalPaidMap.set(payer, (totalPaidMap.get(payer) || 0) + expAmount);

    const participants = exp.participants || [];
    for (const p of participants) {
      const pId = p.friendId;
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

  return members.map((m) => {
    const mId = m.friendId;
    const paid = totalPaidMap.get(mId) || 0;
    const share = totalShareMap.get(mId) || 0;
    const overallNet = paid - share;
    const withMe = mId === null ? overallNet : balanceWithMeMap.get(mId) || 0;
    return {
      friendId: mId,
      name: mId === null ? 'You' : 'Friend',
      balance: overallNet,
      balanceWithMe: withMe,
    };
  });
}

function getGroupBalanceForMe(groupId) {
  const memberBalances = getGroupMemberBalances(groupId);
  const myBalance = memberBalances.find((m) => m.friendId === null);
  return myBalance ? myBalance.balance : 0;
}

console.log('Initial balance:', getGroupBalanceForMe('grp_1'));

// Add an expense: You paid 1000, split 500 for You and 500 for Rahul
groupExpenses.push({
  id: 'exp_1',
  groupId: 'grp_1',
  description: 'Lunch',
  amount: 1000,
  paidByFriendId: null,
  date: '2026-10-06T12:00:00Z',
  splitMethod: 'equal',
  participants: [
    { id: 'p_1', groupExpenseId: 'exp_1', friendId: null, shareAmount: 500 },
    { id: 'p_2', groupExpenseId: 'exp_1', friendId: 'fr_1', shareAmount: 500 },
  ],
});

console.log('Balance after expense:', getGroupBalanceForMe('grp_1'));
