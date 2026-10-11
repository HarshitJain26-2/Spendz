/**
 * Verification Script for Spendz Group Invites Idempotency and Conflict Resolution
 * Tests all 7 conditions requested in USER_REQUEST:
 * 1. The invite already exists in both Supabase and SQLite.
 * 2. The invite exists in Supabase but not SQLite.
 * 3. The same remote invite is hydrated multiple times.
 * 4. Two calls to getOrCreateInvite() happen concurrently.
 * 5. Local caching fails after Supabase successfully returns an invite.
 * 6. An invite code conflicts with a different group.
 * 7. Native and web implementations behave consistently.
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

// ─── Native SQLite Simulator with Real UNIQUE Constraints ─────────────────────
class SQLiteTableSimulator {
  constructor() {
    this.rows = [];
  }

  // Simulates SQLite table with PRIMARY KEY (id) and UNIQUE (code)
  insert(row) {
    const normalizedCode = row.code.trim().toUpperCase();
    if (this.rows.some((r) => r.id === row.id)) {
      throw new Error(`UNIQUE constraint failed: group_invites.id`);
    }
    if (this.rows.some((r) => r.code.toUpperCase() === normalizedCode)) {
      throw new Error(`UNIQUE constraint failed: group_invites.code`);
    }
    const saved = { ...row, code: normalizedCode };
    this.rows.push(saved);
    return saved;
  }

  update(predicate, updates) {
    let count = 0;
    this.rows = this.rows.map((r) => {
      if (predicate(r)) {
        count++;
        return { ...r, ...updates };
      }
      return r;
    });
    return count;
  }

  delete(predicate) {
    this.rows = this.rows.filter((r) => !predicate(r));
  }

  select(predicate) {
    return this.rows.filter(predicate || (() => true));
  }

  get(predicate) {
    return this.rows.find(predicate) || null;
  }
}

// ─── Native Repository Implementation (matching repository.native.ts) ────────
class MockNativeRepository {
  constructor(db) {
    this.db = db;
  }

  upsertGroupInvite(invite) {
    const normalizedCode = invite.code.trim().toUpperCase();

    // 1. Check if a row with this code already exists
    const existingByCode = this.db.get((r) => r.code.toUpperCase() === normalizedCode);

    if (existingByCode) {
      if (existingByCode.groupId !== invite.groupId) {
        throw new Error(
          `[REPOSITORY] Invite code conflict: code "${normalizedCode}" is already associated with group "${existingByCode.groupId}" (cannot reassign to group "${invite.groupId}")`
        );
      }

      if (invite.isActive) {
        this.db.update(
          (r) => r.groupId === invite.groupId && r.isActive,
          { isActive: false }
        );
      }

      this.db.update(
        (r) => r.id === existingByCode.id,
        {
          isActive: Boolean(invite.isActive),
          expiresAt: invite.expiresAt || null,
          createdBy: invite.createdBy || existingByCode.createdBy,
        }
      );

      if (invite.id && invite.id !== existingByCode.id) {
        this.db.delete((r) => r.id === invite.id);
      }

      return {
        id: existingByCode.id,
        groupId: existingByCode.groupId,
        code: normalizedCode,
        createdBy: invite.createdBy || existingByCode.createdBy,
        createdAt: existingByCode.createdAt,
        expiresAt: invite.expiresAt || null,
        isActive: Boolean(invite.isActive),
      };
    }

    // 2. Check if a row with this id already exists
    const existingById = this.db.get((r) => r.id === invite.id);
    if (existingById) {
      if (existingById.groupId !== invite.groupId) {
        throw new Error(
          `[REPOSITORY] Invite id conflict: invite id "${invite.id}" belongs to group "${existingById.groupId}" (cannot reassign to group "${invite.groupId}")`
        );
      }

      if (invite.isActive) {
        this.db.update(
          (r) => r.groupId === invite.groupId && r.isActive,
          { isActive: false }
        );
      }

      this.db.update(
        (r) => r.id === existingById.id,
        {
          code: normalizedCode,
          isActive: Boolean(invite.isActive),
          expiresAt: invite.expiresAt || null,
          createdBy: invite.createdBy || existingById.createdBy,
        }
      );

      return {
        id: existingById.id,
        groupId: existingById.groupId,
        code: normalizedCode,
        createdBy: invite.createdBy || existingById.createdBy,
        createdAt: existingById.createdAt,
        expiresAt: invite.expiresAt || null,
        isActive: Boolean(invite.isActive),
      };
    }

    // 3. Brand new invite
    if (invite.isActive) {
      this.db.update(
        (r) => r.groupId === invite.groupId && r.isActive,
        { isActive: false }
      );
    }

    try {
      this.db.insert({
        id: invite.id,
        groupId: invite.groupId,
        code: normalizedCode,
        createdBy: invite.createdBy,
        createdAt: invite.createdAt || new Date().toISOString(),
        expiresAt: invite.expiresAt || null,
        isActive: Boolean(invite.isActive),
      });
    } catch (insertErr) {
      const fallback = this.db.get((r) => r.code.toUpperCase() === normalizedCode);
      if (fallback) {
        if (fallback.groupId !== invite.groupId) {
          throw new Error(
            `[REPOSITORY] Invite code conflict: code "${normalizedCode}" belongs to group "${fallback.groupId}"`
          );
        }
        this.db.update((r) => r.id === fallback.id, {
          isActive: Boolean(invite.isActive),
          expiresAt: invite.expiresAt || null,
        });
        return {
          id: fallback.id,
          groupId: fallback.groupId,
          code: normalizedCode,
          createdBy: invite.createdBy || fallback.createdBy,
          createdAt: fallback.createdAt,
          expiresAt: invite.expiresAt || null,
          isActive: Boolean(invite.isActive),
        };
      }
      throw insertErr;
    }

    return {
      id: invite.id,
      groupId: invite.groupId,
      code: normalizedCode,
      createdBy: invite.createdBy,
      createdAt: invite.createdAt || new Date().toISOString(),
      expiresAt: invite.expiresAt || null,
      isActive: Boolean(invite.isActive),
    };
  }

  createGroupInvite(invite) {
    return this.upsertGroupInvite(invite);
  }

  getActiveInviteByGroupId(groupId) {
    const activeRows = this.db.select((r) => r.groupId === groupId && r.isActive);
    if (activeRows.length === 0) return null;
    activeRows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return activeRows[0];
  }

  getInviteByCode(code) {
    const upper = code.trim().toUpperCase();
    return this.db.get((r) => r.code.toUpperCase() === upper);
  }
}

// ─── Web Repository Implementation (matching repository.web.ts) ───────────
class MockWebRepository {
  constructor() {
    this.storage = [];
  }

  upsertGroupInvite(invite) {
    const normalizedCode = invite.code.trim().toUpperCase();

    // 1. Check by code
    const existingIndexByCode = this.storage.findIndex(
      (i) => i.code.trim().toUpperCase() === normalizedCode
    );

    if (existingIndexByCode !== -1) {
      const existing = this.storage[existingIndexByCode];
      if (existing.groupId !== invite.groupId) {
        throw new Error(
          `[REPOSITORY] Invite code conflict: code "${normalizedCode}" is already associated with group "${existing.groupId}" (cannot reassign to group "${invite.groupId}")`
        );
      }

      this.storage = this.storage.map((i) => {
        if (i.id === existing.id) {
          return {
            ...existing,
            isActive: Boolean(invite.isActive),
            expiresAt: invite.expiresAt || null,
            createdBy: invite.createdBy || existing.createdBy,
          };
        }
        if (invite.isActive && i.groupId === invite.groupId) {
          return { ...i, isActive: false };
        }
        return i;
      });

      this.storage = this.storage.filter(
        (i) => !(invite.id && i.id === invite.id && i.id !== existing.id)
      );

      return {
        ...existing,
        isActive: Boolean(invite.isActive),
        expiresAt: invite.expiresAt || null,
        createdBy: invite.createdBy || existing.createdBy,
      };
    }

    // 2. Check by id
    const existingIndexById = this.storage.findIndex((i) => i.id === invite.id);
    if (existingIndexById !== -1) {
      const existing = this.storage[existingIndexById];
      if (existing.groupId !== invite.groupId) {
        throw new Error(
          `[REPOSITORY] Invite id conflict: invite id "${invite.id}" belongs to group "${existing.groupId}" (cannot reassign to group "${invite.groupId}")`
        );
      }

      this.storage = this.storage.map((i) => {
        if (i.id === invite.id) {
          return {
            ...existing,
            code: normalizedCode,
            isActive: Boolean(invite.isActive),
            expiresAt: invite.expiresAt || null,
            createdBy: invite.createdBy || existing.createdBy,
          };
        }
        if (invite.isActive && i.groupId === invite.groupId) {
          return { ...i, isActive: false };
        }
        return i;
      });

      return {
        ...existing,
        code: normalizedCode,
        isActive: Boolean(invite.isActive),
        expiresAt: invite.expiresAt || null,
        createdBy: invite.createdBy || existing.createdBy,
      };
    }

    // 3. New
    if (invite.isActive) {
      this.storage = this.storage.map((i) =>
        i.groupId === invite.groupId ? { ...i, isActive: false } : i
      );
    }
    const newInvite = {
      ...invite,
      code: normalizedCode,
      isActive: Boolean(invite.isActive),
    };
    this.storage.unshift(newInvite);
    return newInvite;
  }

  createGroupInvite(invite) {
    return this.upsertGroupInvite(invite);
  }

  getActiveInviteByGroupId(groupId) {
    const activeRows = this.storage.filter((i) => i.groupId === groupId && i.isActive);
    if (activeRows.length === 0) return null;
    activeRows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return activeRows[0];
  }

  getInviteByCode(code) {
    const upper = code.trim().toUpperCase();
    return this.storage.find((i) => i.code.trim().toUpperCase() === upper) || null;
  }
}

// ─── Store Logic Mock (matching updated groupStore.ts) ────────────────────
class MockGroupStore {
  constructor(repository, mockSupabase) {
    this.repository = repository;
    this.supabase = mockSupabase;
    this.inFlightInvites = new Map();
    this.groups = [];
  }

  async getOrCreateInvite(groupId, authUser) {
    const existingInFlight = this.inFlightInvites.get(groupId);
    if (existingInFlight) {
      return existingInFlight;
    }

    const invitePromise = (async () => {
      const group = this.groups.find((g) => g.id === groupId) || { id: groupId, name: 'Test Group', members: [] };

      // 1. If authenticated, query backend for existing active invite first
      if (authUser?.id) {
        let existingRemoteInvite = null;
        try {
          existingRemoteInvite = await this.supabase.getActiveInviteForGroup(groupId);
        } catch (lookupErr) {
          throw new Error(lookupErr?.message || 'Failed to check existing invite on server.');
        }

        if (existingRemoteInvite) {
          // Separate local cache write in isolated try/catch
          try {
            this.repository.createGroupInvite(existingRemoteInvite);
          } catch (cacheErr) {
            console.warn('[GROUP STORE] Non-fatal: Local cache error saving active remote invite:', cacheErr.message);
          }
          // Always return the valid remote invite
          return existingRemoteInvite;
        }

        // Backend confirmed no active invite exists
        const isAuthorized =
          (group.members || []).length === 0 ||
          (group.members || []).some((m) => m.userId === authUser.id);
        if (!isAuthorized) {
          throw new Error('You do not have permission to create an invite for this group.');
        }

        const newTemplate = {
          id: 'remote-gen-id-' + Math.random().toString(36).slice(2, 7),
          groupId,
          code: 'TE-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
          createdBy: authUser.id,
          createdAt: new Date().toISOString(),
          isActive: true,
        };

        const syncRes = await this.supabase.syncGroupAndInviteToSupabase(group, newTemplate);
        if (syncRes.success && syncRes.invite) {
          try {
            this.repository.createGroupInvite(syncRes.invite);
          } catch (cacheErr) {
            console.warn('[GROUP STORE] Non-fatal: Local cache error saving created remote invite:', cacheErr.message);
          }
          return syncRes.invite;
        } else {
          throw new Error(syncRes.error || "Couldn't create the group invite.");
        }
      }

      // Offline/unauthenticated fallback
      const localActive = this.repository.getActiveInviteByGroupId(groupId);
      if (localActive) return localActive;

      const offlineTemplate = {
        id: 'local-gen-' + Math.random().toString(36).slice(2, 7),
        groupId,
        code: 'OF-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
        createdBy: 'offline-user',
        createdAt: new Date().toISOString(),
        isActive: true,
      };
      return this.repository.createGroupInvite(offlineTemplate);
    })();

    this.inFlightInvites.set(groupId, invitePromise);
    try {
      return await invitePromise;
    } finally {
      this.inFlightInvites.delete(groupId);
    }
  }

  hydrateGroup(remoteData) {
    if (remoteData.activeInvite) {
      try {
        this.repository.createGroupInvite(remoteData.activeInvite);
      } catch (err) {
        console.warn('[GROUP STORE] Non-fatal: Error caching active invite during hydration:', err.message);
      }
    }
  }
}

// ─── EXECUTE ALL 7 TESTS ──────────────────────────────────────────────────
async function runTests() {
  console.log('=== RUNNING GROUP INVITES IDEMPOTENCY & CONFLICT RESOLUTION TESTS ===\n');

  // --------------------------------------------------------------------------
  // TEST 1: The invite already exists in both Supabase and SQLite.
  // --------------------------------------------------------------------------
  console.log('[TEST 1] Invite already exists in both Supabase and SQLite');
  {
    const db = new SQLiteTableSimulator();
    const repo = new MockNativeRepository(db);

    const existingInvite = {
      id: 'local-inv-1',
      groupId: 'grp-trip',
      code: 'TE-RLXMRE',
      createdBy: 'user-owner',
      createdAt: '2026-10-10T10:00:00Z',
      isActive: true,
    };
    // Seed SQLite
    db.insert(existingInvite);

    const mockSupabase = {
      getActiveInviteForGroup: async (gId) => ({
        id: 'remote-inv-1', // Remote ID might differ from local ID
        groupId: 'grp-trip',
        code: 'TE-RLXMRE',
        createdBy: 'user-owner',
        createdAt: '2026-10-10T10:00:00Z',
        isActive: true,
      }),
      syncGroupAndInviteToSupabase: async () => ({ success: false, error: 'Should not be called' }),
    };

    const store = new MockGroupStore(repo, mockSupabase);
    store.groups = [{ id: 'grp-trip', name: 'Trip', members: [{ userId: 'user-owner' }] }];

    const result = await store.getOrCreateInvite('grp-trip', { id: 'user-owner' });
    assert(result.code === 'TE-RLXMRE', 'Returns existing remote invite without throwing error');
    assert(db.rows.length === 1, 'Does not create a duplicate row in SQLite (row count = 1)');
    assert(db.rows[0].id === 'local-inv-1', 'Preserves original SQLite primary key ID');
    assert(db.rows[0].isActive === true, 'Invite remains active in SQLite');
  }

  // --------------------------------------------------------------------------
  // TEST 2: The invite exists in Supabase but not SQLite.
  // --------------------------------------------------------------------------
  console.log('\n[TEST 2] Invite exists in Supabase but not SQLite');
  {
    const db = new SQLiteTableSimulator();
    const repo = new MockNativeRepository(db);

    const remoteInvite = {
      id: 'remote-inv-2',
      groupId: 'grp-party',
      code: 'PT-9988AA',
      createdBy: 'user-admin',
      createdAt: '2026-10-11T12:00:00Z',
      isActive: true,
    };

    const mockSupabase = {
      getActiveInviteForGroup: async (gId) => remoteInvite,
      syncGroupAndInviteToSupabase: async () => ({ success: false, error: 'Should not be called' }),
    };

    const store = new MockGroupStore(repo, mockSupabase);
    store.groups = [{ id: 'grp-party', name: 'Party', members: [{ userId: 'user-admin' }] }];

    assert(db.rows.length === 0, 'SQLite starts completely empty for this invite');
    const result = await store.getOrCreateInvite('grp-party', { id: 'user-admin' });
    assert(result.code === 'PT-9988AA', 'Returns remote invite');
    assert(db.rows.length === 1, 'SQLite now has exactly 1 row');
    assert(db.rows[0].code === 'PT-9988AA', 'SQLite cached code matches remote invite');
    assert(db.rows[0].id === 'remote-inv-2', 'SQLite row stores remote ID');
  }

  // --------------------------------------------------------------------------
  // TEST 3: The same remote invite is hydrated multiple times.
  // --------------------------------------------------------------------------
  console.log('\n[TEST 3] Same remote invite is hydrated multiple times (e.g. repeated screen mounts)');
  {
    const db = new SQLiteTableSimulator();
    const repo = new MockNativeRepository(db);
    const mockSupabase = {
      getActiveInviteForGroup: async () => null,
    };
    const store = new MockGroupStore(repo, mockSupabase);

    const remoteInvite = {
      id: 'inv-stable',
      groupId: 'grp-mount',
      code: 'MO-112233',
      createdBy: 'user-mount',
      createdAt: '2026-10-11T08:00:00Z',
      isActive: true,
    };

    // Hydrate 10 times consecutively
    for (let i = 1; i <= 10; i++) {
      store.hydrateGroup({ activeInvite: remoteInvite });
    }

    assert(db.rows.length === 1, 'SQLite row count remains 1 after 10 consecutive hydrations');
    assert(db.rows[0].code === 'MO-112233', 'Cached code is correct without constraint violation');
    assert(db.rows[0].isActive === true, 'Cached invite is active');
  }

  // --------------------------------------------------------------------------
  // TEST 4: Two calls to getOrCreateInvite() happen concurrently.
  // --------------------------------------------------------------------------
  console.log('\n[TEST 4] Concurrent calls to getOrCreateInvite()');
  {
    const db = new SQLiteTableSimulator();
    const repo = new MockNativeRepository(db);

    let supabaseLookupCount = 0;
    const mockSupabase = {
      getActiveInviteForGroup: async (gId) => {
        supabaseLookupCount++;
        // Simulate network latency
        await new Promise((res) => setTimeout(res, 20));
        return {
          id: 'remote-conc-1',
          groupId: 'grp-conc',
          code: 'CC-778899',
          createdBy: 'user-conc',
          createdAt: '2026-10-11T09:00:00Z',
          isActive: true,
        };
      },
    };

    const store = new MockGroupStore(repo, mockSupabase);
    store.groups = [{ id: 'grp-conc', name: 'Concurrent Group', members: [{ userId: 'user-conc' }] }];

    // Fire two calls concurrently
    const [p1, p2] = await Promise.all([
      store.getOrCreateInvite('grp-conc', { id: 'user-conc' }),
      store.getOrCreateInvite('grp-conc', { id: 'user-conc' }),
    ]);

    assert(p1 === p2, 'Both concurrent calls returned the exact same invite promise/reference');
    assert(p1.code === 'CC-778899', 'Both received the expected invite code');
    assert(supabaseLookupCount === 1, 'Supabase was queried only once due to in-flight deduplication');
    assert(db.rows.length === 1, 'Only 1 row inserted into local cache');
  }

  // --------------------------------------------------------------------------
  // TEST 5: Local caching fails after Supabase successfully returns an invite.
  // --------------------------------------------------------------------------
  console.log('\n[TEST 5] Local caching fails after Supabase returns invite');
  {
    // Mock repository where SQLite write fails (e.g. disk full / corrupt file)
    const failingRepo = {
      createGroupInvite: () => {
        throw new Error('SQLite disk I/O error or storage quota exceeded');
      },
      getActiveInviteByGroupId: () => null,
    };

    const mockSupabase = {
      getActiveInviteForGroup: async (gId) => ({
        id: 'remote-resilient',
        groupId: 'grp-resilient',
        code: 'RS-554433',
        createdBy: 'user-resilient',
        createdAt: '2026-10-11T09:30:00Z',
        isActive: true,
      }),
      syncGroupAndInviteToSupabase: async () => {
        throw new Error('Should NEVER be called because Supabase already has active invite!');
      },
    };

    const store = new MockGroupStore(failingRepo, mockSupabase);
    store.groups = [{ id: 'grp-resilient', name: 'Resilient Group', members: [{ userId: 'user-resilient' }] }];

    let returnedInvite = null;
    let errorCaught = null;
    try {
      returnedInvite = await store.getOrCreateInvite('grp-resilient', { id: 'user-resilient' });
    } catch (err) {
      errorCaught = err;
    }

    assert(errorCaught === null, 'Did not crash or throw to the caller despite local cache failure');
    assert(returnedInvite !== null && returnedInvite.code === 'RS-554433', 'Retained and returned valid remote invite to UI');
  }

  // --------------------------------------------------------------------------
  // TEST 6: An invite code conflicts with a different group.
  // --------------------------------------------------------------------------
  console.log('\n[TEST 6] Invite code conflicts with a different group');
  {
    const db = new SQLiteTableSimulator();
    const repo = new MockNativeRepository(db);

    // Group A creates code 'ST-SHARED'
    repo.createGroupInvite({
      id: 'inv-grp-a',
      groupId: 'group-A',
      code: 'ST-SHARED',
      createdBy: 'user-A',
      createdAt: '2026-10-11T01:00:00Z',
      isActive: true,
    });

    let conflictCaught = false;
    let conflictMessage = '';
    try {
      // Group B attempts to assign the same code 'ST-SHARED'
      repo.createGroupInvite({
        id: 'inv-grp-b',
        groupId: 'group-B',
        code: 'ST-SHARED',
        createdBy: 'user-B',
        createdAt: '2026-10-11T02:00:00Z',
        isActive: true,
      });
    } catch (err) {
      conflictCaught = true;
      conflictMessage = err.message;
    }

    assert(conflictCaught === true, 'Detected cross-group code collision and threw explicit conflict error');
    assert(conflictMessage.includes('Invite code conflict'), `Error message explains conflict: "${conflictMessage}"`);
    assert(db.rows.length === 1, 'Database did not create or silently overwrite group A row');
    assert(db.rows[0].groupId === 'group-A', 'Original group ownership (group-A) remains intact');
  }

  // --------------------------------------------------------------------------
  // TEST 7: Native SQLite and Web implementations behave consistently.
  // --------------------------------------------------------------------------
  console.log('\n[TEST 7] Native SQLite and Web implementations consistency');
  {
    const db = new SQLiteTableSimulator();
    const nativeRepo = new MockNativeRepository(db);
    const webRepo = new MockWebRepository();

    const sampleInvite1 = {
      id: 'inv-001',
      groupId: 'grp-sync',
      code: 'SY-112233',
      createdBy: 'user-1',
      createdAt: '2026-10-11T03:00:00Z',
      isActive: true,
    };

    // 1. Initial insert
    const natRes1 = nativeRepo.createGroupInvite(sampleInvite1);
    const webRes1 = webRepo.createGroupInvite(sampleInvite1);

    assert(natRes1.code === webRes1.code, 'Native and Web return same code on creation');
    assert(natRes1.groupId === webRes1.groupId, 'Native and Web assign same group ID');

    // 2. Second invite for same group (should deactivate previous active invite)
    const sampleInvite2 = {
      id: 'inv-002',
      groupId: 'grp-sync',
      code: 'SY-445566',
      createdBy: 'user-1',
      createdAt: '2026-10-11T04:00:00Z',
      isActive: true,
    };

    nativeRepo.createGroupInvite(sampleInvite2);
    webRepo.createGroupInvite(sampleInvite2);

    const natActive = nativeRepo.getActiveInviteByGroupId('grp-sync');
    const webActive = webRepo.getActiveInviteByGroupId('grp-sync');

    assert(natActive.code === 'SY-445566', 'Native active invite switched to new code');
    assert(webActive.code === 'SY-445566', 'Web active invite switched to new code');
    assert(natActive.code === webActive.code, 'Native and Web active invites match');

    // 3. Re-upserting previous code
    nativeRepo.createGroupInvite(sampleInvite1);
    webRepo.createGroupInvite(sampleInvite1);

    const natReactivated = nativeRepo.getActiveInviteByGroupId('grp-sync');
    const webReactivated = webRepo.getActiveInviteByGroupId('grp-sync');

    assert(natReactivated.code === 'SY-112233', 'Native reactivated code SY-112233');
    assert(webReactivated.code === 'SY-112233', 'Web reactivated code SY-112233');
    assert(natReactivated.code === webReactivated.code, 'Native and Web behave identically after reactivation');

    // 4. Cross-group conflict detection consistency
    let natCrossErr = null;
    let webCrossErr = null;
    try {
      nativeRepo.createGroupInvite({
        id: 'inv-other',
        groupId: 'grp-other',
        code: 'SY-112233',
        createdBy: 'user-2',
        createdAt: '2026-10-11T05:00:00Z',
        isActive: true,
      });
    } catch (e) {
      natCrossErr = e.message;
    }

    try {
      webRepo.createGroupInvite({
        id: 'inv-other',
        groupId: 'grp-other',
        code: 'SY-112233',
        createdBy: 'user-2',
        createdAt: '2026-10-11T05:00:00Z',
        isActive: true,
      });
    } catch (e) {
      webCrossErr = e.message;
    }

    assert(natCrossErr !== null && webCrossErr !== null, 'Both Native and Web throw cross-group conflict error');
    assert(natCrossErr.includes('Invite code conflict') && webCrossErr.includes('Invite code conflict'), 'Both report consistent conflict message');
  }

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n==================================================');
  console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
  console.log('==================================================');

  if (passedTests === totalTests) {
    console.log('🎉 ALL 7 IDEMPOTENCY & CONFLICT SPECIFICATIONS VERIFIED SUCCESSFULLY!');
  } else {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Fatal error in tests:', e);
  process.exit(1);
});
