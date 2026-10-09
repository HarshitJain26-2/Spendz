const assert = require('assert');

/**
 * Verification Script: Two-User Collaboration and Shared Group Synchronization
 * Tests:
 * 1. User A creates "Test Group", members: [A]
 * 2. User A creates 3 expenses:
 *    - Dinner ₹500 (Paid by A)
 *    - Hotel ₹1,000 (Paid by A)
 *    - Cab ₹400 (Paid by A)
 * 3. User A creates settlement: A → B ₹200
 * 4. User B joins via invite code
 * 5. User B loads Test Group:
 *    - Sees all members (A, B)
 *    - Sees all 3 expenses
 *    - Sees settlement
 *    - Has correct balance calculation
 * 6. Live Updates (Section 28):
 *    - User A adds Lunch ₹600 -> User B immediately sees Lunch ₹600
 *    - User A edits Lunch ₹600 -> ₹800 -> User B immediately sees ₹800 & balance updates
 *    - User A deletes Lunch -> User B immediately sees it disappear
 *    - User A adds settlement -> User B immediately sees settlement
 */

let passedTests = 0;
let totalTests = 0;

function check(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exitCode = 1;
  } else {
    passedTests++;
    console.log(`✅ PASSED: ${message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared Backend Simulator (Simulates Supabase backend tables & Realtime)
// ─────────────────────────────────────────────────────────────────────────────
class SharedSupabaseBackend {
  constructor() {
    this.groups = new Map();
    this.groupMembers = new Map(); // groupId -> member[]
    this.groupExpenses = new Map(); // groupId -> expense[]
    this.groupParticipants = new Map(); // expenseId -> participant[]
    this.groupSettlements = new Map(); // groupId -> settlement[]
    this.groupInvites = new Map(); // code -> invite
    this.realtimeListeners = new Map(); // groupId -> Set<callback>
  }

  subscribe(groupId, listener) {
    if (!this.realtimeListeners.has(groupId)) {
      this.realtimeListeners.set(groupId, new Set());
    }
    this.realtimeListeners.get(groupId).add(listener);
    return () => {
      this.realtimeListeners.get(groupId)?.delete(listener);
    };
  }

  notifyRealtime(groupId, table, eventType) {
    const listeners = this.realtimeListeners.get(groupId);
    if (listeners) {
      for (const cb of listeners) {
        cb({ table, eventType, groupId });
      }
    }
  }

  createGroup(group, creatorMember) {
    this.groups.set(group.id, { ...group });
    this.groupMembers.set(group.id, [{ ...creatorMember }]);
    this.groupExpenses.set(group.id, []);
    this.groupSettlements.set(group.id, []);
    this.notifyRealtime(group.id, 'groups', 'INSERT');
  }

  createInvite(invite) {
    this.groupInvites.set(invite.code.toUpperCase(), { ...invite });
  }

  getInviteByCode(code) {
    const inv = this.groupInvites.get(code.toUpperCase());
    if (!inv || !inv.isActive) return null;
    const grp = this.groups.get(inv.groupId);
    const members = this.groupMembers.get(inv.groupId) || [];
    return { invite: inv, group: grp, members };
  }

  joinGroup(groupId, newMember) {
    const list = this.groupMembers.get(groupId) || [];
    const exists = list.some((m) => m.userId === newMember.userId || m.id === newMember.id);
    if (!exists) {
      list.push({ ...newMember });
      this.groupMembers.set(groupId, list);
      this.notifyRealtime(groupId, 'group_members', 'INSERT');
    }
    return true;
  }

  addExpense(expense, participants) {
    const list = this.groupExpenses.get(expense.groupId) || [];
    list.unshift({ ...expense, participants: [...participants] });
    this.groupExpenses.set(expense.groupId, list);
    this.groupParticipants.set(expense.id, [...participants]);
    this.notifyRealtime(expense.groupId, 'group_expenses', 'INSERT');
  }

  updateExpense(expenseId, groupId, updates, participants) {
    const list = this.groupExpenses.get(groupId) || [];
    const idx = list.findIndex((e) => e.id === expenseId);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
      if (participants) {
        list[idx].participants = [...participants];
        this.groupParticipants.set(expenseId, [...participants]);
      }
      this.notifyRealtime(groupId, 'group_expenses', 'UPDATE');
    }
  }

  deleteExpense(expenseId, groupId) {
    const list = this.groupExpenses.get(groupId) || [];
    this.groupExpenses.set(groupId, list.filter((e) => e.id !== expenseId));
    this.groupParticipants.delete(expenseId);
    this.notifyRealtime(groupId, 'group_expenses', 'DELETE');
  }

  addSettlement(settlement) {
    const list = this.groupSettlements.get(settlement.groupId) || [];
    list.unshift({ ...settlement });
    this.groupSettlements.set(settlement.groupId, list);
    this.notifyRealtime(settlement.groupId, 'group_settlements', 'INSERT');
  }

  deleteSettlement(settlementId, groupId) {
    const list = this.groupSettlements.get(groupId) || [];
    this.groupSettlements.set(groupId, list.filter((s) => s.id !== settlementId));
    this.notifyRealtime(groupId, 'group_settlements', 'DELETE');
  }

  getGroupDetails(groupId) {
    const group = this.groups.get(groupId);
    if (!group) return null;
    const members = this.groupMembers.get(groupId) || [];
    const expenses = (this.groupExpenses.get(groupId) || []).map((e) => ({
      ...e,
      participants: this.groupParticipants.get(e.id) || e.participants || [],
    }));
    const settlements = this.groupSettlements.get(groupId) || [];
    return {
      group: { ...group, members },
      members,
      expenses,
      settlements,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Client Instance (Simulates User App with local storage, Zustand store, hydration)
// ─────────────────────────────────────────────────────────────────────────────
class AppClient {
  constructor(userId, userName, backend) {
    this.userId = userId;
    this.userName = userName;
    this.backend = backend;
    this.groups = [];
    this.groupExpenses = [];
    this.groupSettlements = [];
    this.activeRealtimeUnsub = null;
  }

  // Hydration logic matching groupStore.ts loadGroupFromSupabase
  async loadGroupFromBackend(groupId) {
    const remoteData = this.backend.getGroupDetails(groupId);
    if (!remoteData) return null;

    const { group, members, expenses, settlements } = remoteData;
    const groupExists = this.groups.some((g) => g.id === groupId);
    if (groupExists) {
      this.groups = this.groups.map((g) => (g.id === groupId ? { ...group, members } : g));
    } else {
      this.groups = [{ ...group, members }, ...this.groups];
    }

    this.groupExpenses = [
      ...expenses,
      ...this.groupExpenses.filter((e) => e.groupId !== groupId),
    ];
    this.groupSettlements = [
      ...settlements,
      ...this.groupSettlements.filter((s) => s.groupId !== groupId),
    ];

    return this.groups.find((g) => g.id === groupId);
  }

  // Realtime subscription matching groupStore.ts subscribeToGroupRealtime
  subscribeToGroup(groupId) {
    if (this.activeRealtimeUnsub) {
      this.activeRealtimeUnsub();
    }
    this.activeRealtimeUnsub = this.backend.subscribe(groupId, async () => {
      await this.loadGroupFromBackend(groupId);
    });
  }

  unsubscribe() {
    if (this.activeRealtimeUnsub) {
      this.activeRealtimeUnsub();
      this.activeRealtimeUnsub = null;
    }
  }

  // Calculate balance for this user (matching calculateGroupSummary in groupStore.ts)
  calculateMyBalance(groupId) {
    const expenses = this.groupExpenses.filter((e) => e.groupId === groupId);
    const settlements = this.groupSettlements.filter((s) => s.groupId === groupId);
    const group = this.groups.find((g) => g.id === groupId);
    const members = group?.members || [];

    const myMember = members.find((m) => m.userId === this.userId);
    const myMemberId = myMember?.id;

    let totalExpenseAmount = 0;
    let totalYouPaid = 0;
    let yourShare = 0;

    for (const exp of expenses) {
      totalExpenseAmount += exp.amount;
      const isPaidByMe =
        (exp.paidByUserId && exp.paidByUserId === this.userId) ||
        (exp.paidByMemberId && exp.paidByMemberId === myMemberId);

      if (isPaidByMe) {
        totalYouPaid += exp.amount;
      }

      const myPart = exp.participants?.find(
        (p) =>
          (p.userId && p.userId === this.userId) ||
          (p.memberId && p.memberId === myMemberId)
      );

      if (myPart) {
        yourShare += myPart.shareAmount;
      }
    }

    let settlementsPaidByMe = 0;
    let settlementsReceivedByMe = 0;

    for (const setl of settlements) {
      const isFromMe =
        (setl.fromUserId && setl.fromUserId === this.userId) ||
        (setl.fromMemberId && setl.fromMemberId === myMemberId);
      const isToMe =
        (setl.toUserId && setl.toUserId === this.userId) ||
        (setl.toMemberId && setl.toMemberId === myMemberId);

      if (isFromMe) settlementsPaidByMe += setl.amount;
      if (isToMe) settlementsReceivedByMe += setl.amount;
    }

    const netBalance = (totalYouPaid + settlementsPaidByMe) - (yourShare + settlementsReceivedByMe);
    return {
      totalExpenseAmount,
      totalYouPaid,
      yourShare,
      settlementsPaidByMe,
      settlementsReceivedByMe,
      netBalance,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXECUTE TWO-USER COLLABORATION SUITE
// ─────────────────────────────────────────────────────────────────────────────
async function runSuite() {
  console.log('\n======================================================');
  console.log('SPENDZ GROUP COLLABORATION & SHARED DATA VERIFICATION');
  console.log('======================================================\n');

  const backend = new SharedSupabaseBackend();

  // 1. Setup User A and User B
  const clientA = new AppClient('user-A-id', 'User A', backend);
  const clientB = new AppClient('user-B-id', 'User B', backend);

  console.log('Step 1: User A creates "Test Group"');
  const groupId = 'group-test-101';
  const memberAId = 'member-A-101';
  const group = {
    id: groupId,
    name: 'Test Group',
    icon: '✈️',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const memberA = {
    id: memberAId,
    groupId,
    userId: clientA.userId,
    name: clientA.userName,
    role: 'admin',
    createdAt: new Date().toISOString(),
  };

  backend.createGroup(group, memberA);
  await clientA.loadGroupFromBackend(groupId);
  clientA.subscribeToGroup(groupId);

  check(clientA.groups.length === 1, 'User A has 1 group locally');
  check(clientA.groups[0].members.length === 1, 'Test Group has 1 member (User A)');

  // 2. User A creates 3 expenses:
  // Expense 1: Dinner ₹500 Paid by A
  // Expense 2: Hotel ₹1,000 Paid by A
  // Expense 3: Cab ₹400 Paid by A
  console.log('\nStep 2: User A creates 3 expenses');
  const exp1Id = 'exp-dinner-500';
  backend.addExpense(
    {
      id: exp1Id,
      groupId,
      description: 'Dinner',
      amount: 500,
      paidByMemberId: memberAId,
      paidByUserId: clientA.userId,
      date: '2026-10-08',
      splitMethod: 'equal',
    },
    [
      { id: 'part-d1', groupExpenseId: exp1Id, memberId: memberAId, userId: clientA.userId, shareAmount: 250 },
      { id: 'part-d2', groupExpenseId: exp1Id, memberId: 'member-B-102', userId: clientB.userId, shareAmount: 250 },
    ]
  );

  const exp2Id = 'exp-hotel-1000';
  backend.addExpense(
    {
      id: exp2Id,
      groupId,
      description: 'Hotel',
      amount: 1000,
      paidByMemberId: memberAId,
      paidByUserId: clientA.userId,
      date: '2026-10-08',
      splitMethod: 'equal',
    },
    [
      { id: 'part-h1', groupExpenseId: exp2Id, memberId: memberAId, userId: clientA.userId, shareAmount: 500 },
      { id: 'part-h2', groupExpenseId: exp2Id, memberId: 'member-B-102', userId: clientB.userId, shareAmount: 500 },
    ]
  );

  const exp3Id = 'exp-cab-400';
  backend.addExpense(
    {
      id: exp3Id,
      groupId,
      description: 'Cab',
      amount: 400,
      paidByMemberId: memberAId,
      paidByUserId: clientA.userId,
      date: '2026-10-08',
      splitMethod: 'equal',
    },
    [
      { id: 'part-c1', groupExpenseId: exp3Id, memberId: memberAId, userId: clientA.userId, shareAmount: 200 },
      { id: 'part-c2', groupExpenseId: exp3Id, memberId: 'member-B-102', userId: clientB.userId, shareAmount: 200 },
    ]
  );

  // 3. User A creates settlement: A → B ₹200
  console.log('\nStep 3: User A creates settlement: A -> B ₹200');
  const setlId = 'setl-200';
  backend.addSettlement({
    id: setlId,
    groupId,
    fromMemberId: memberAId,
    fromUserId: clientA.userId,
    toMemberId: 'member-B-102',
    toUserId: clientB.userId,
    amount: 200,
    date: '2026-10-08',
  });

  // 4. User A generates invite
  console.log('\nStep 4: User A generates invite');
  const inviteCode = 'TG-8X2Y';
  backend.createInvite({
    id: 'inv-1',
    groupId,
    code: inviteCode,
    createdBy: clientA.userId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    isActive: true,
  });

  // 5. User B joins via invite code
  console.log('\nStep 5: User B validates and joins via invite code');
  const invitePreview = backend.getInviteByCode(inviteCode);
  check(invitePreview !== null, 'User B found valid invite for Test Group');
  check(invitePreview.group.name === 'Test Group', 'Invite previews "Test Group"');

  const memberB = {
    id: 'member-B-102',
    groupId,
    userId: clientB.userId,
    name: clientB.userName,
    role: 'member',
    createdAt: new Date().toISOString(),
  };
  backend.joinGroup(groupId, memberB);

  // 6. User B opens Group Detail: loadGroupFromSupabase
  console.log('\nStep 6: User B loads Group Detail (Hydration)');
  await clientB.loadGroupFromBackend(groupId);
  clientB.subscribeToGroup(groupId);

  check(clientB.groups.length === 1, 'User B has 1 group');
  check(clientB.groups[0].members.length === 2, 'User B sees BOTH members (A and B)');
  check(clientB.groupExpenses.length === 3, 'User B sees all 3 existing expenses (Dinner, Hotel, Cab)');
  check(clientB.groupSettlements.length === 1, 'User B sees the settlement record (₹200)');

  // 7. Balance check for User B
  console.log('\nStep 7: Verify User B balances');
  const balB = clientB.calculateMyBalance(groupId);
  console.log('User B balance calculation:', balB);
  check(balB.totalExpenseAmount === 1900, 'Total expense amount is ₹1,900');
  check(balB.totalYouPaid === 0, 'User B paid ₹0 for expenses');
  check(balB.yourShare === 950, 'User B total share is ₹950 (250 + 500 + 200)');
  check(balB.settlementsReceivedByMe === 200, 'User B received ₹200 settlement from A');
  // Net balance: totalPaid (0) + settlementPaid (0) - yourShare (950) - settlementReceived (200) = -1150
  check(balB.netBalance === -1150, 'User B net balance is -₹1,150 (owes ₹1,150)');

  // 8. Balance check for User A
  console.log('\nStep 8: Verify User A balances');
  await clientA.loadGroupFromBackend(groupId);
  const balA = clientA.calculateMyBalance(groupId);
  console.log('User A balance calculation:', balA);
  check(balA.totalExpenseAmount === 1900, 'Total expense amount is ₹1,900');
  check(balA.totalYouPaid === 1900, 'User A paid ₹1,900');
  check(balA.yourShare === 950, 'User A share is ₹950');
  check(balA.settlementsPaidByMe === 200, 'User A paid ₹200 settlement to B');
  check(balA.netBalance === 1150, 'User A net balance is +₹1,150 (owed ₹1,150)');
  check(balA.netBalance + balB.netBalance === 0, 'Net zero sum balance across group members (A + B = 0)');

  // ─────────────────────────────────────────────────────────────────────────
  // LIVE TESTS (SECTION 28)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n======================================================');
  console.log('STEP 9: SECOND LIVE TEST (REALTIME MUTATIONS)');
  console.log('======================================================\n');

  // Test 9a: User A adds Lunch ₹600 -> User B sees it automatically
  console.log('9a: User A adds Lunch ₹600');
  const lunchId = 'exp-lunch-600';
  backend.addExpense(
    {
      id: lunchId,
      groupId,
      description: 'Lunch',
      amount: 600,
      paidByMemberId: memberAId,
      paidByUserId: clientA.userId,
      date: '2026-10-08',
      splitMethod: 'equal',
    },
    [
      { id: 'part-l1', groupExpenseId: lunchId, memberId: memberAId, userId: clientA.userId, shareAmount: 300 },
      { id: 'part-l2', groupExpenseId: lunchId, memberId: 'member-B-102', userId: clientB.userId, shareAmount: 300 },
    ]
  );

  check(clientB.groupExpenses.length === 4, 'User B automatically sees 4 expenses (Lunch ₹600 appeared)');
  const balBAfterLunch = clientB.calculateMyBalance(groupId);
  check(balBAfterLunch.totalExpenseAmount === 2500, 'User B total expenses updated to ₹2,500');
  check(balBAfterLunch.yourShare === 1250, 'User B share updated to ₹1,250');
  check(balBAfterLunch.netBalance === -1450, 'User B net balance recalculated to -₹1,450');

  // Test 9b: User A edits Lunch: ₹600 -> ₹800
  console.log('\n9b: User A edits Lunch: ₹600 -> ₹800');
  backend.updateExpense(
    lunchId,
    groupId,
    { amount: 800 },
    [
      { id: 'part-l1', groupExpenseId: lunchId, memberId: memberAId, userId: clientA.userId, shareAmount: 400 },
      { id: 'part-l2', groupExpenseId: lunchId, memberId: 'member-B-102', userId: clientB.userId, shareAmount: 400 },
    ]
  );

  const updatedLunch = clientB.groupExpenses.find((e) => e.id === lunchId);
  check(updatedLunch.amount === 800, 'User B automatically sees Lunch edited to ₹800');
  const balBAfterEdit = clientB.calculateMyBalance(groupId);
  check(balBAfterEdit.totalExpenseAmount === 2700, 'User B total expenses updated to ₹2,700');
  check(balBAfterEdit.yourShare === 1350, 'User B share updated to ₹1,350');
  check(balBAfterEdit.netBalance === -1550, 'User B net balance recalculated to -₹1,550');

  // Test 9c: User A deletes Lunch
  console.log('\n9c: User A deletes Lunch');
  backend.deleteExpense(lunchId, groupId);
  check(clientB.groupExpenses.length === 3, 'User B automatically sees Lunch disappear (3 expenses remaining)');
  const balBAfterDelete = clientB.calculateMyBalance(groupId);
  check(balBAfterDelete.totalExpenseAmount === 1900, 'User B total expenses reverted to ₹1,900');
  check(balBAfterDelete.netBalance === -1150, 'User B balance reverted to -₹1,150');

  // Test 9d: User A adds another settlement
  console.log('\n9d: User A records another settlement');
  const setl2Id = 'setl-extra-150';
  backend.addSettlement({
    id: setl2Id,
    groupId,
    fromMemberId: memberAId,
    fromUserId: clientA.userId,
    toMemberId: 'member-B-102',
    toUserId: clientB.userId,
    amount: 150,
    date: '2026-10-08',
  });

  check(clientB.groupSettlements.length === 2, 'User B automatically sees new settlement (total 2 settlements)');
  const balBFinal = clientB.calculateMyBalance(groupId);
  check(balBFinal.settlementsReceivedByMe === 350, 'User B total settlements received updated to ₹350');
  check(balBFinal.netBalance === -1300, 'User B balance updated to -₹1,300');

  // Test 9e: Cleanup
  clientA.unsubscribe();
  clientB.unsubscribe();
  check(clientA.activeRealtimeUnsub === null && clientB.activeRealtimeUnsub === null, 'Realtime listeners properly cleaned up');

  console.log('\n======================================================');
  console.log(`SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('======================================================\n');

  if (passedTests === totalTests) {
    console.log('🎉 ALL TWO-USER AND REALTIME COLLABORATION TESTS PASSED PERFECTLY!\n');
  } else {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
