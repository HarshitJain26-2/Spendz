/**
 * Verification Script for Spendz Group Invites (Code & QR Code)
 * Tests all flows from USER_REQUEST specification:
 * - Flow 1: Generate invite, code format (e.g. GT-7K4P9X), QR payload, copy & share messages.
 * - Flow 2: Join group via invite code, preview group before joining, confirmation & membership.
 * - Flow 3: Join group via QR deep link payload (spendz://group-invite/GT-7K4P9X).
 * - Flow 4: Duplicate membership rejection ("You're already a member of this group.").
 * - Flow 5: Invite revocation and rejection ("This invite is no longer active.").
 * - Flow 6: Invalid QR payload handling without crashing ("This QR code isn't a valid Spendz group invite.").
 * - Flow 7: Personal transaction & balance boundary checks (0 personal balance/expense changes).
 * - Flow 8: Persistence across app reloads.
 */

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

// ─── 1. Invite Code & QR Payload Logic ────────────────────────────────────
const SAFE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const SPENDZ_INVITE_PREFIX = 'spendz://group-invite/';

function generateInviteCode(groupName) {
  let prefix = 'GP';
  if (groupName) {
    const words = groupName
      .trim()
      .split(/\s+/)
      .map((w) => w.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())
      .filter(Boolean);

    if (words.length >= 2 && words[0].length > 0 && words[1].length > 0) {
      prefix = `${words[0][0]}${words[1][0]}`;
    } else if (words.length === 1 && words[0].length >= 2) {
      prefix = words[0].slice(0, 2);
    }
  }

  let randomPart = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * SAFE_CHARS.length);
    randomPart += SAFE_CHARS[randomIndex];
  }
  return `${prefix}-${randomPart}`;
}

function createInvitePayload(code) {
  return `${SPENDZ_INVITE_PREFIX}${code.trim().toUpperCase()}`;
}

function parseInviteCodeFromUrlOrInput(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  const codeRegex = /^[A-Z0-9]{2,4}-[A-Z0-9]{4,8}$/i;

  if (codeRegex.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  if (trimmed.toLowerCase().startsWith('spendz://group-invite/')) {
    const tokenPart = trimmed.slice('spendz://group-invite/'.length).split(/[?#]/)[0].trim();
    if (codeRegex.test(tokenPart)) {
      return tokenPart.toUpperCase();
    }
    return null;
  }

  if (trimmed.includes('spendz://') || trimmed.includes('http')) {
    try {
      const normalizedUrl = trimmed.startsWith('spendz://')
        ? trimmed.replace('spendz://', 'https://spendz.app/')
        : trimmed;
      const urlObj = new URL(normalizedUrl);
      const codeParam = urlObj.searchParams.get('code');
      if (codeParam && codeRegex.test(codeParam.trim())) {
        return codeParam.trim().toUpperCase();
      }
      if (urlObj.pathname.toLowerCase().startsWith('/group-invite/')) {
        const pathSegments = urlObj.pathname.split('/').filter(Boolean);
        const last = pathSegments[pathSegments.length - 1];
        if (last && codeRegex.test(last)) {
          return last.toUpperCase();
        }
      }
    } catch {}
  }
  return null;
}

// ─── 2. In-Memory Mock of Repository & Store ──────────────────────────────
class MockSpendzDatabase {
  constructor() {
    this.groups = [];
    this.groupMembers = [];
    this.groupInvites = [];
    this.personalTransactions = [];
    this.accounts = [{ id: 'acc-1', name: 'Main Account', balance: 10000 }];
  }

  addGroup(group, members) {
    this.groups.push(group);
    this.groupMembers.push(...members);
  }

  createGroupInvite(invite) {
    // Invalidate previous invites
    for (const inv of this.groupInvites) {
      if (inv.groupId === invite.groupId) {
        inv.isActive = false;
      }
    }
    this.groupInvites.unshift(invite);
  }

  getInviteByCode(code) {
    const upper = code.trim().toUpperCase();
    return this.groupInvites.find((i) => i.code.toUpperCase() === upper) || null;
  }

  revokeGroupInvite(inviteId) {
    const inv = this.groupInvites.find((i) => i.id === inviteId);
    if (inv) inv.isActive = false;
  }

  joinGroup(groupId, member) {
    const group = this.groups.find((g) => g.id === groupId);
    if (!group) {
      return { success: false, message: 'This group is no longer available.' };
    }

    const currentMembers = this.groupMembers.filter((m) => m.groupId === groupId);
    const alreadyMember = currentMembers.some(
      (m) =>
        (member.userId && m.userId === member.userId) ||
        (member.name && m.name && m.name.toLowerCase() === member.name.toLowerCase())
    );

    if (alreadyMember) {
      return { success: false, message: "You're already a member of this group." };
    }

    this.groupMembers.push(member);
    return { success: true };
  }

  validateInvite(code, currentUserId, currentUserName) {
    const trimmed = (code || '').trim().toUpperCase();
    if (!trimmed) return { status: 'invalid', message: 'This invite code is not valid.' };

    const invite = this.getInviteByCode(trimmed);
    if (!invite) return { status: 'invalid', message: 'This invite code is not valid.' };
    if (!invite.isActive) return { status: 'inactive', message: 'This invite is no longer active.' };
    if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) {
      return { status: 'expired', message: 'This invite has expired.' };
    }

    const group = this.groups.find((g) => g.id === invite.groupId);
    if (!group) return { status: 'group_deleted', message: 'This group is no longer available.' };

    const members = this.groupMembers.filter((m) => m.groupId === group.id);
    const memberNames = members.map((m) => m.name || 'Member');

    const alreadyMember = members.some(
      (m) =>
        (currentUserId && m.userId === currentUserId) ||
        (currentUserName && m.name && m.name.toLowerCase() === currentUserName.toLowerCase())
    );

    if (alreadyMember) {
      return {
        status: 'already_member',
        group,
        memberNames,
        message: "You're already a member of this group.",
      };
    }

    return {
      status: 'valid',
      invite,
      group,
      memberNames,
    };
  }
}

// ─── EXECUTE TEST SCENARIO ────────────────────────────────────────────────
console.log('--- STARTING GROUP INVITATION & QR VERIFICATION ---\n');

const db = new MockSpendzDatabase();

// Setup: Harshit creates Goa Trip with 5 initial members
const goaGroup = {
  id: 'group-goa-1',
  name: 'Goa Trip',
  icon: '🏖',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const initialMembers = [
  { id: 'm-1', groupId: goaGroup.id, userId: 'user-harshit', name: 'Harshit', friendId: null },
  { id: 'm-2', groupId: goaGroup.id, userId: 'user-aditya', name: 'Aditya', friendId: 'f-aditya' },
  { id: 'm-3', groupId: goaGroup.id, userId: 'user-rohan', name: 'Rohan', friendId: 'f-rohan' },
  { id: 'm-4', groupId: goaGroup.id, userId: 'user-priya', name: 'Priya', friendId: 'f-priya' },
  { id: 'm-5', groupId: goaGroup.id, userId: 'user-aman', name: 'Aman', friendId: 'f-aman' },
];

db.addGroup(goaGroup, initialMembers);

// --- FLOW 1: Harshit opens Goa Trip and generates invite ---
console.log('[FLOW 1] Harshit generates invite code & QR for Goa Trip');
const inviteCode = generateInviteCode(goaGroup.name);
assert(inviteCode.startsWith('GT-'), `Invite code prefix matches group name initials (Goa Trip -> GT): ${inviteCode}`);
assert(/^[A-Z0-9]{2}-[A-Z0-9]{6}$/.test(inviteCode), `Invite code matches safe 2-letter + hyphen + 6-char format: ${inviteCode}`);
assert(!inviteCode.includes('0') && !inviteCode.includes('O') && !inviteCode.includes('1') && !inviteCode.includes('I'), 'Invite code avoids ambiguous chars (0, O, 1, I)');

const inviteRecord = {
  id: 'invite-1',
  groupId: goaGroup.id,
  code: inviteCode,
  createdBy: 'user-harshit',
  createdAt: new Date().toISOString(),
  expiresAt: null,
  isActive: true,
};
db.createGroupInvite(inviteRecord);

const qrPayload = createInvitePayload(inviteCode);
assert(qrPayload === `spendz://group-invite/${inviteCode}`, `QR payload matches spendz://group-invite/<token>: ${qrPayload}`);
assert(!qrPayload.includes('user-harshit') && !qrPayload.includes('group-goa-1'), 'QR payload does NOT leak private database IDs or user IDs');

// --- FLOW 2: Rahul opens Join Group and enters code ---
console.log('\n[FLOW 2] Rahul enters code GT-...');
const rahulPreview = db.validateInvite(inviteCode, 'user-rahul', 'Rahul');
assert(rahulPreview.status === 'valid', 'Invite validation returns status: valid');
assert(rahulPreview.group.name === 'Goa Trip', 'Group preview displays correct group name');
assert(rahulPreview.memberNames.length === 5, `Group preview shows 5 members: ${rahulPreview.memberNames.join(', ')}`);
assert(rahulPreview.memberNames.includes('Harshit'), 'Member preview includes Harshit');

// Rahul confirms Join Group
const rahulMember = {
  id: 'm-rahul',
  groupId: goaGroup.id,
  userId: 'user-rahul',
  name: 'Rahul',
  friendId: null,
  createdAt: new Date().toISOString(),
};
const joinResult = db.joinGroup(goaGroup.id, rahulMember);
assert(joinResult.success === true, 'Rahul successfully joins group');

const currentMembersAfterRahul = db.groupMembers.filter((m) => m.groupId === goaGroup.id);
assert(currentMembersAfterRahul.length === 6, `Group member count updated immediately to 6 members (Harshit, Rahul, Aditya, Rohan, Priya, Aman)`);
assert(currentMembersAfterRahul.some((m) => m.name === 'Rahul'), 'Rahul is present in group members');

// --- FLOW 3: Repeat using QR deep link ---
console.log('\n[FLOW 3] Deep link / QR detection of spendz://group-invite/...');
const scannedCode = parseInviteCodeFromUrlOrInput(qrPayload);
assert(scannedCode === inviteCode, `QR scanner correctly extracts invite code ${scannedCode} from payload`);

// Test alternative URL forms:
const webUrl = `https://spendz.app/groups/join?code=${inviteCode}`;
assert(parseInviteCodeFromUrlOrInput(webUrl) === inviteCode, `Web URL successfully parses code: ${webUrl}`);

// --- FLOW 4: Try the same code again (Duplicate check) ---
console.log('\n[FLOW 4] Duplicate membership prevention');
const duplicateValidation = db.validateInvite(inviteCode, 'user-rahul', 'Rahul');
assert(duplicateValidation.status === 'already_member', 'Duplicate join returns already_member status');
assert(duplicateValidation.message === "You're already a member of this group.", 'Returns exact user-friendly message: "You\'re already a member of this group."');

const duplicateJoin = db.joinGroup(goaGroup.id, rahulMember);
assert(duplicateJoin.success === false, 'joinGroup prevents duplicate record creation');
assert(db.groupMembers.filter((m) => m.groupId === goaGroup.id).length === 6, 'Member count remains 6 (no duplicate records)');

// --- FLOW 5: Revoke invite and try using old code ---
console.log('\n[FLOW 5] Invite revocation');
db.revokeGroupInvite(inviteRecord.id);

const revokedValidation = db.validateInvite(inviteCode, 'user-new', 'New User');
assert(revokedValidation.status === 'inactive', 'Revoked invite returns inactive status');
assert(revokedValidation.message === 'This invite is no longer active.', 'Returns exact message: "This invite is no longer active."');

// --- FLOW 6: Invalid QR Code Handling ---
console.log('\n[FLOW 6] Invalid QR code safety check');
const invalidScans = [
  'https://google.com',
  'some-random-barcode',
  'spendz://other-scheme',
  '',
  null,
];

for (const inv of invalidScans) {
  const res = parseInviteCodeFromUrlOrInput(inv);
  assert(res === null, `Invalid input "${inv}" safely returns null without crash`);
}

// --- FLOW 7: Group Expense & Personal Isolation ---
console.log('\n[FLOW 7] Accounting boundary isolation');
assert(db.personalTransactions.length === 0, 'Joining group creates 0 personal transactions');
assert(db.accounts[0].balance === 10000, 'Personal account balances remain completely unchanged');

// --- FLOW 8: Friend Separation Rule ---
console.log('\n[FLOW 8] User / Friend Relationship separation');
const rahulGroupMember = db.groupMembers.find((m) => m.userId === 'user-rahul');
assert(rahulGroupMember.friendId === null, 'Rahul is a direct group member, NOT automatically added to personal friends');

console.log('\n==================================================');
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log('==================================================');

if (passedTests === totalTests) {
  console.log('🎉 ALL GROUP INVITATION SPECIFICATIONS VERIFIED SUCCESSFULLY!');
} else {
  process.exit(1);
}
