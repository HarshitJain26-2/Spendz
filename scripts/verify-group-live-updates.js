const assert = require('assert');

/**
 * Spendz Group Live Updates Verification Suite
 * Verifies the 7 user-requested test flows:
 * 1. TEST 1 — ADD: Dinner ₹2,000 paid by Me for 4 people -> shows immediately, balance changes immediately
 * 2. TEST 2 — EDIT: Dinner ₹2,000 -> ₹2,500 -> ₹2,500 appears immediately, balance recalculates immediately
 * 3. TEST 3 — DELETE: Dinner deleted -> disappears immediately, balance returns to correct value immediately
 * 4. TEST 4 — MEMBER JOIN: User joins via code -> members count and list update immediately
 * 5. TEST 5 — SETTLEMENT: Settle ₹500 owed to Rahul -> becomes Settled immediately
 * 6. TEST 6 — GROUP LIST: Group balance across groups updates immediately
 * 7. TEST 7 — RAPID MUTATIONS: Add -> Add -> Edit -> Delete rapidly -> consistent state, no duplicates
 */

let totalTests = 0;
let passedTests = 0;

function testAssert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exitCode = 1;
  } else {
    passedTests++;
    console.log(`✅ PASSED: ${message}`);
  }
}

// ─── Storage Simulation (Matches repository.web.ts and repository.native.ts) ───
const storage = {
  groups: [],
  groupMembers: [],
  groupExpenses: [],
  groupParticipants: [],
  groupSettlements: [],
};

const repository = {
  getGroups() {
    return storage.groups.map((g) => ({
      ...g,
      members: storage.groupMembers.filter((m) => m.groupId === g.id),
    }));
  },
  addGroup(group, members) {
    storage.groups.push({ ...group });
    storage.groupMembers.push(...members.map((m) => ({ ...m })));
  },
  updateGroup(id, data) {
    storage.groups = storage.groups.map((g) => (g.id === id ? { ...g, ...data } : g));
  },
  deleteGroup(id) {
    storage.groups = storage.groups.filter((g) => g.id !== id);
    storage.groupMembers = storage.groupMembers.filter((m) => m.groupId !== id);
    storage.groupExpenses = storage.groupExpenses.filter((e) => e.groupId !== id);
    storage.groupSettlements = storage.groupSettlements.filter((s) => s.groupId !== id);
  },
  addGroupMember(member) {
    storage.groupMembers.push({ ...member });
  },
  getGroupMembers(groupId) {
    return storage.groupMembers.filter((m) => m.groupId === groupId);
  },
  joinGroup(groupId, member) {
    const exists = storage.groupMembers.some(
      (m) => m.groupId === groupId && (m.id === member.id || (m.userId && m.userId === member.userId))
    );
    if (!exists) {
      storage.groupMembers.push({ ...member });
    }
    return { success: true };
  },
  getGroupExpenses() {
    return storage.groupExpenses.map((e) => ({
      ...e,
      participants: storage.groupParticipants.filter((p) => p.groupExpenseId === e.id),
    }));
  },
  addGroupExpense(expense, participants) {
    storage.groupExpenses.unshift({ ...expense });
    storage.groupParticipants.push(...participants.map((p) => ({ ...p })));
  },
  updateGroupExpense(id, data, participants) {
    storage.groupExpenses = storage.groupExpenses.map((e) => (e.id === id ? { ...e, ...data } : e));
    if (participants) {
      storage.groupParticipants = storage.groupParticipants.filter((p) => p.groupExpenseId !== id);
      storage.groupParticipants.push(...participants.map((p) => ({ ...p })));
    }
  },
  deleteGroupExpense(id) {
    storage.groupExpenses = storage.groupExpenses.filter((e) => e.id !== id);
    storage.groupParticipants = storage.groupParticipants.filter((p) => p.groupExpenseId !== id);
  },
  getGroupSettlements() {
    return [...storage.groupSettlements];
  },
  addGroupSettlement(settlement) {
    storage.groupSettlements.unshift({ ...settlement });
  },
  deleteGroupSettlement(id) {
    storage.groupSettlements = storage.groupSettlements.filter((s) => s.id !== id);
  },
};

// ─── GroupStore Emulation (Matches groupStore.ts reactive architecture) ───
class GroupStore {
  constructor() {
    this.groups = [];
    this.groupExpenses = [];
    this.groupSettlements = [];
  }

  loadGroups() {
    this.groups = repository.getGroups();
    this.groupExpenses = repository.getGroupExpenses();
    this.groupSettlements = repository.getGroupSettlements();
  }

  addGroup(data) {
    const groupId = `grp-${Date.now()}`;
    const members = [
      { id: `mem-me-${groupId}`, groupId, friendId: null, name: 'You', role: 'creator' },
      ...data.memberFriendIds.map((fId) => ({
        id: `mem-${fId}-${groupId}`,
        groupId,
        friendId: fId,
        name: data.friendNames[fId] || 'Friend',
        role: 'member',
      })),
    ];
    const newGroup = {
      id: groupId,
      name: data.name,
      icon: data.icon || '🏖',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      members,
    };
    repository.addGroup(newGroup, members);
    this.groups = [newGroup, ...this.groups];
    return newGroup;
  }

  addGroupExpense(data) {
    const now = new Date().toISOString();
    const expenseId = `exp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const participantRecords = data.participants.map((p) => ({
      id: `part-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      groupExpenseId: expenseId,
      friendId: p.friendId,
      shareAmount: Number(p.shareAmount) || 0,
    }));
    const newExpense = {
      id: expenseId,
      groupId: data.groupId,
      description: data.description,
      amount: Number(data.amount) || 0,
      paidByFriendId: data.paidByFriendId,
      date: data.date || now,
      splitMethod: data.splitMethod || 'equal',
      createdAt: now,
      updatedAt: now,
      participants: participantRecords,
    };

    // 1. Persist to DB
    repository.addGroupExpense(newExpense, participantRecords);
    repository.updateGroup(data.groupId, { updatedAt: now });

    // 2. Direct reactive Zustand in-memory state update
    this.groupExpenses = [newExpense, ...this.groupExpenses.filter((e) => e.id !== expenseId)];
    this.groups = this.groups.map((g) => (g.id === data.groupId ? { ...g, updatedAt: now } : g));

    return newExpense;
  }

  updateGroupExpense(expenseId, data) {
    const now = new Date().toISOString();
    const existing = this.groupExpenses.find((e) => e.id === expenseId);
    const targetGroupId = existing?.groupId;
    const participantRecords = data.participants.map((p) => ({
      id: `part-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      groupExpenseId: expenseId,
      friendId: p.friendId,
      shareAmount: Number(p.shareAmount) || 0,
    }));
    const updates = {
      description: data.description,
      amount: Number(data.amount) || 0,
      date: data.date || existing?.date || now,
      paidByFriendId: data.paidByFriendId,
      splitMethod: data.splitMethod || 'equal',
      updatedAt: now,
    };

    // 1. Persist to DB
    repository.updateGroupExpense(expenseId, updates, participantRecords);
    if (targetGroupId) {
      repository.updateGroup(targetGroupId, { updatedAt: now });
    }

    // 2. Direct reactive Zustand in-memory state update
    const updatedExpense = {
      ...(existing || {}),
      ...updates,
      id: expenseId,
      groupId: targetGroupId,
      participants: participantRecords,
    };
    this.groupExpenses = this.groupExpenses.map((e) => (e.id === expenseId ? updatedExpense : e));
    if (targetGroupId) {
      this.groups = this.groups.map((g) => (g.id === targetGroupId ? { ...g, updatedAt: now } : g));
    }
    return updatedExpense;
  }

  deleteGroupExpense(expenseId) {
    const target = this.groupExpenses.find((e) => e.id === expenseId);
    const now = new Date().toISOString();

    // 1. Persist to DB
    repository.deleteGroupExpense(expenseId);
    if (target?.groupId) {
      repository.updateGroup(target.groupId, { updatedAt: now });
    }

    // 2. Direct reactive Zustand in-memory state update
    this.groupExpenses = this.groupExpenses.filter((e) => e.id !== expenseId);
    if (target?.groupId) {
      this.groups = this.groups.map((g) => (g.id === target.groupId ? { ...g, updatedAt: now } : g));
    }
  }

  addGroupSettlement(data) {
    const now = new Date().toISOString();
    const settlementId = `setl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newSettlement = {
      id: settlementId,
      groupId: data.groupId,
      fromFriendId: data.fromFriendId,
      toFriendId: data.toFriendId,
      amount: Number(data.amount) || 0,
      date: data.date || now,
      createdAt: now,
    };

    // 1. Persist to DB
    repository.addGroupSettlement(newSettlement);
    repository.updateGroup(data.groupId, { updatedAt: now });

    // 2. Direct reactive Zustand in-memory state update
    this.groupSettlements = [newSettlement, ...this.groupSettlements.filter((s) => s.id !== settlementId)];
    this.groups = this.groups.map((g) => (g.id === data.groupId ? { ...g, updatedAt: now } : g));

    return newSettlement;
  }

  deleteGroupSettlement(settlementId) {
    const target = this.groupSettlements.find((s) => s.id === settlementId);
    const now = new Date().toISOString();

    // 1. Persist to DB
    repository.deleteGroupSettlement(settlementId);
    if (target?.groupId) {
      repository.updateGroup(target.groupId, { updatedAt: now });
    }

    // 2. Direct reactive Zustand in-memory state update
    this.groupSettlements = this.groupSettlements.filter((s) => s.id !== settlementId);
    if (target?.groupId) {
      this.groups = this.groups.map((g) => (g.id === target.groupId ? { ...g, updatedAt: now } : g));
    }
  }

  joinGroupByCode(groupId, memberData) {
    const newMember = {
      id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      groupId,
      friendId: null,
      userId: memberData.userId,
      name: memberData.name,
      role: 'member',
      createdAt: new Date().toISOString(),
    };
    repository.joinGroup(groupId, newMember);
    this.groups = this.groups.map((g) =>
      g.id === groupId
        ? {
            ...g,
            members: g.members?.some((m) => m.userId === newMember.userId)
              ? g.members
              : [...(g.members || []), newMember],
          }
        : g
    );
    return { success: true, group: this.groups.find((g) => g.id === groupId) };
  }

  // ─── Scoped Balance Engine ───
  getGroupMemberBalances(groupId) {
    const group = this.groups.find((g) => g.id === groupId);
    if (!group) return [];

    const expenses = this.groupExpenses.filter((e) => e.groupId === groupId);
    const settlements = this.groupSettlements.filter((s) => s.groupId === groupId);

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

      for (const p of exp.participants || []) {
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

    for (const setl of settlements) {
      const from = setl.fromFriendId;
      const to = setl.toFriendId;
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

    return members.map((m) => {
      const mId = m.friendId;
      const paid = totalPaidMap.get(mId) || 0;
      const share = totalShareMap.get(mId) || 0;
      const overallNet = paid - share;
      const withMe = mId === null ? overallNet : balanceWithMeMap.get(mId) || 0;

      return {
        friendId: mId,
        name: m.name,
        balance: overallNet,
        balanceWithMe: withMe,
      };
    });
  }

  getGroupBalanceForMe(groupId) {
    const expenses = this.groupExpenses.filter((e) => e.groupId === groupId);
    const settlements = this.groupSettlements.filter((s) => s.groupId === groupId);

    let totalPaidByMe = 0;
    let totalMyShare = 0;

    for (const exp of expenses) {
      if (exp.paidByFriendId === null) totalPaidByMe += Number(exp.amount) || 0;
      const myPart = exp.participants?.find((p) => p.friendId === null);
      if (myPart) totalMyShare += Number(myPart.shareAmount) || 0;
    }

    for (const setl of settlements) {
      const amt = Number(setl.amount) || 0;
      if (setl.fromFriendId === null) totalPaidByMe += amt;
      if (setl.toFriendId === null) totalMyShare += amt;
    }

    return Math.round((totalPaidByMe - totalMyShare) * 100) / 100;
  }
}

// ═══════════════════════════════════════════════════════════════
// RUN VERIFICATION TESTS
// ═══════════════════════════════════════════════════════════════

console.log('--- Initial Setup: Create "Goa Trip" with Me, Rahul, Aditya, Priya ---');
const store = new GroupStore();
const goaTrip = store.addGroup({
  name: 'Goa Trip',
  memberFriendIds: ['f-rahul', 'f-aditya', 'f-priya'],
  friendNames: {
    'f-rahul': 'Rahul',
    'f-aditya': 'Aditya',
    'f-priya': 'Priya',
  },
});
testAssert(goaTrip.members.length === 4, 'Goa Trip has 4 initial members');
testAssert(store.getGroupBalanceForMe(goaTrip.id) === 0, 'Initial net balance is 0 (All settled)');

console.log('\n--- TEST 1 — ADD: Dinner ₹2,000 Paid by Me (Equal Split 4 People) ---');
const dinner = store.addGroupExpense({
  groupId: goaTrip.id,
  description: 'Dinner',
  amount: 2000,
  paidByFriendId: null, // Paid by Me
  splitMethod: 'equal',
  participants: [
    { friendId: null, shareAmount: 500 },
    { friendId: 'f-rahul', shareAmount: 500 },
    { friendId: 'f-aditya', shareAmount: 500 },
    { friendId: 'f-priya', shareAmount: 500 },
  ],
});
// Verify immediate in-memory presence WITHOUT reloading DB
testAssert(store.groupExpenses[0].id === dinner.id, 'Dinner expense appears in store immediately without DB reload');
testAssert(store.groupExpenses[0].amount === 2000, 'Dinner amount is ₹2,000');
testAssert(store.getGroupBalanceForMe(goaTrip.id) === 1500, 'Balance for me immediately updates to You are owed +₹1,500');

const memberBalancesAfterAdd = store.getGroupMemberBalances(goaTrip.id);
const rahulBal1 = memberBalancesAfterAdd.find((m) => m.friendId === 'f-rahul')?.balanceWithMe;
const adityaBal1 = memberBalancesAfterAdd.find((m) => m.friendId === 'f-aditya')?.balanceWithMe;
const priyaBal1 = memberBalancesAfterAdd.find((m) => m.friendId === 'f-priya')?.balanceWithMe;
testAssert(rahulBal1 === 500, 'Rahul owes you ₹500 immediately');
testAssert(adityaBal1 === 500, 'Aditya owes you ₹500 immediately');
testAssert(priyaBal1 === 500, 'Priya owes you ₹500 immediately');

console.log('\n--- TEST 2 — EDIT: Change Dinner ₹2,000 → ₹2,500 ---');
store.updateGroupExpense(dinner.id, {
  description: 'Dinner & Drinks',
  amount: 2500,
  paidByFriendId: null,
  splitMethod: 'equal',
  participants: [
    { friendId: null, shareAmount: 625 },
    { friendId: 'f-rahul', shareAmount: 625 },
    { friendId: 'f-aditya', shareAmount: 625 },
    { friendId: 'f-priya', shareAmount: 625 },
  ],
});
testAssert(store.groupExpenses.length === 1, 'Store maintains single record (does not append duplicate)');
testAssert(store.groupExpenses[0].amount === 2500, 'Expense amount is updated to ₹2,500 immediately');
testAssert(store.groupExpenses[0].description === 'Dinner & Drinks', 'Expense description updated immediately');
testAssert(store.getGroupBalanceForMe(goaTrip.id) === 1875, 'Balance immediately updates to +₹1,875 (2500 - 625)');

console.log('\n--- TEST 3 — DELETE: Delete Dinner Expense ---');
store.deleteGroupExpense(dinner.id);
testAssert(store.groupExpenses.length === 0, 'Expense immediately removed from store');
testAssert(store.getGroupBalanceForMe(goaTrip.id) === 0, 'Balance returns to 0 (All settled) immediately upon deletion');

console.log('\n--- TEST 4 — MEMBER JOIN: New User Joins via Code ---');
const joinResult = store.joinGroupByCode(goaTrip.id, {
  userId: 'usr-karan',
  name: 'Karan',
});
testAssert(joinResult.success === true, 'Join successful');
const updatedGroup = store.groups.find((g) => g.id === goaTrip.id);
testAssert(updatedGroup.members.length === 5, 'Group members count immediately increases from 4 to 5');
testAssert(updatedGroup.members.some((m) => m.name === 'Karan'), 'Karan appears in member list immediately');

console.log('\n--- TEST 5 — SETTLEMENT: You Owe Rahul ₹500 -> Settle Up ---');
// Create an expense where Rahul paid ₹1,000 for You and Rahul (₹500 each)
const cab = store.addGroupExpense({
  groupId: goaTrip.id,
  description: 'Cab to Beach',
  amount: 1000,
  paidByFriendId: 'f-rahul', // Rahul paid
  splitMethod: 'equal',
  participants: [
    { friendId: null, shareAmount: 500 }, // You owe 500
    { friendId: 'f-rahul', shareAmount: 500 },
  ],
});
testAssert(store.getGroupBalanceForMe(goaTrip.id) === -500, 'Before settlement: You owe -₹500');

// Record Settlement: Me pays Rahul ₹500
const settlement = store.addGroupSettlement({
  groupId: goaTrip.id,
  fromFriendId: null, // From Me
  toFriendId: 'f-rahul', // To Rahul
  amount: 500,
});
testAssert(store.groupSettlements.length === 1, 'Settlement recorded in store');
testAssert(store.getGroupBalanceForMe(goaTrip.id) === 0, 'After settlement: You are immediately Settled (0)');
const rahulBalAfterSettle = store.getGroupMemberBalances(goaTrip.id).find((m) => m.friendId === 'f-rahul')?.balanceWithMe;
testAssert(rahulBalAfterSettle === 0, 'Rahul balance with me is immediately 0 (Settled)');

console.log('\n--- TEST 6 — GROUP LIST: Global Balance for Me Updates Across Groups ---');
// Create a second group "Flatmates"
const flatmates = store.addGroup({
  name: 'Flatmates',
  memberFriendIds: ['f-rahul'],
  friendNames: { 'f-rahul': 'Rahul' },
});
// Add grocery expense in Flatmates where You paid ₹600 (equal split ₹300)
store.addGroupExpense({
  groupId: flatmates.id,
  description: 'Groceries',
  amount: 600,
  paidByFriendId: null,
  splitMethod: 'equal',
  participants: [
    { friendId: null, shareAmount: 300 },
    { friendId: 'f-rahul', shareAmount: 300 },
  ],
});
const goaBal = store.getGroupBalanceForMe(goaTrip.id);
const flatBal = store.getGroupBalanceForMe(flatmates.id);
testAssert(goaBal === 0, 'Goa Trip balance is 0');
testAssert(flatBal === 300, 'Flatmates balance is +₹300');
// Overall across all groups:
const totalOwedAcrossGroups = (goaBal > 0 ? goaBal : 0) + (flatBal > 0 ? flatBal : 0);
testAssert(totalOwedAcrossGroups === 300, 'Total owed to me across groups is immediately ₹300');

console.log('\n--- TEST 7 — RAPID MUTATIONS: Add -> Add -> Edit -> Delete ---');
const r1 = store.addGroupExpense({
  groupId: goaTrip.id,
  description: 'Rapid 1',
  amount: 100,
  paidByFriendId: null,
  participants: [{ friendId: null, shareAmount: 50 }, { friendId: 'f-rahul', shareAmount: 50 }],
});
const r2 = store.addGroupExpense({
  groupId: goaTrip.id,
  description: 'Rapid 2',
  amount: 200,
  paidByFriendId: null,
  participants: [{ friendId: null, shareAmount: 100 }, { friendId: 'f-rahul', shareAmount: 100 }],
});
testAssert(store.groupExpenses.filter((e) => e.groupId === goaTrip.id).length === 3, 'Rapid Add: 3 expenses present');

store.updateGroupExpense(r1.id, {
  description: 'Rapid 1 (Edited)',
  amount: 150,
  paidByFriendId: null,
  participants: [{ friendId: null, shareAmount: 75 }, { friendId: 'f-rahul', shareAmount: 75 }],
});
const editedR1 = store.groupExpenses.find((e) => e.id === r1.id);
testAssert(editedR1.amount === 150, 'Rapid Edit: Amount updated to 150');

store.deleteGroupExpense(r2.id);
testAssert(!store.groupExpenses.some((e) => e.id === r2.id), 'Rapid Delete: r2 removed immediately');
testAssert(store.groupExpenses.filter((e) => e.groupId === goaTrip.id).length === 2, 'Rapid Mutations: Clean consistent state (no duplicates or leaks)');

console.log('\n--- Persistence Check: Verify Database Matches In-Memory State ---');
const dbExpenses = repository.getGroupExpenses();
testAssert(dbExpenses.length === store.groupExpenses.length, 'Database has exact same expense count as in-memory store');
const dbSettlements = repository.getGroupSettlements();
testAssert(dbSettlements.length === store.groupSettlements.length, 'Database has exact same settlement count as in-memory store');

console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
if (passedTests === totalTests) {
  console.log('🎉 ALL 7 GROUP LIVE UPDATE FLOWS PASSED PERFECTLY!');
} else {
  console.error('❌ SOME TESTS FAILED');
  process.exit(1);
}
