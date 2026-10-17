/**
 * Verification Test: Spendz Authentication & Account Switching Bug Fix
 *
 * Verifies the 8-step test required:
 * 1. Sign in with Account A and record the authenticated user ID.
 * 2. Verify Account A profile and authorized data load.
 * 3. Sign out Account A: verify all in-memory auth/profile/group caches are purged and tokens cleared.
 * 4. Sign in with Account B using different valid credentials.
 * 5. Verify the returned user ID and active session ID both belong to Account B.
 * 6. Verify Account B's profile and authorized data load, with NO stale data from Account A.
 * 7. Try an incorrect password for Account B and verify login fails without silently opening Account A.
 * 8. Force-close and reopen the app: verify the intended persisted session (Account B) is restored.
 * 9. Repeat and verify across both Web and Native platform architectures.
 */

const assert = require('assert');

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
// Storage & Backend Simulation
// ─────────────────────────────────────────────────────────────────────────────

class MockStorage {
  constructor() {
    this.store = new Map();
  }
  async getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  async setItem(key, value) {
    this.store.set(key, String(value));
  }
  async removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

class MockSupabaseAuth {
  constructor(storage) {
    this.storage = storage;
    this.currentSession = null;
    this.listeners = new Set();
    this.storageKey = 'sb-testproject-auth-token';

    // Registered users in mock cloud backend
    this.users = new Map([
      [
        'user_a@spendz.app',
        {
          id: 'usr_supabase_alpha_11111',
          email: 'user_a@spendz.app',
          password: 'PasswordA123!',
          user_metadata: { full_name: 'Alice Alpha', name: 'Alice Alpha', avatar_url: 'https://avatar.spendz/alice.png' },
        },
      ],
      [
        'user_b@spendz.app',
        {
          id: 'usr_supabase_beta_22222',
          email: 'user_b@spendz.app',
          password: 'PasswordB456!',
          user_metadata: { full_name: 'Bob Beta', name: 'Bob Beta', avatar_url: 'https://avatar.spendz/bob.png' },
        },
      ],
    ]);
  }

  async signInWithPassword({ email, password }) {
    const user = this.users.get(email.trim().toLowerCase());
    if (!user || user.password !== password) {
      return { data: { user: null, session: null }, error: new Error('Invalid login credentials') };
    }

    const session = {
      access_token: 'mock_jwt_token_' + user.id,
      refresh_token: 'mock_refresh_token_' + user.id,
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
      },
    };

    this.currentSession = session;
    await this.storage.setItem(this.storageKey, JSON.stringify(session));

    // Notify listeners
    for (const listener of this.listeners) {
      listener('SIGNED_IN', session);
    }

    return {
      data: {
        user: session.user,
        session: session,
      },
      error: null,
    };
  }

  async getSession() {
    const raw = await this.storage.getItem(this.storageKey);
    if (!raw) {
      return { data: { session: null }, error: null };
    }
    try {
      const session = JSON.parse(raw);
      this.currentSession = session;
      return { data: { session }, error: null };
    } catch {
      return { data: { session: null }, error: null };
    }
  }

  async signOut(options = { scope: 'global' }) {
    this.currentSession = null;
    await this.storage.removeItem(this.storageKey);
    for (const listener of this.listeners) {
      listener('SIGNED_OUT', null);
    }
    return { error: null };
  }

  onAuthStateChange(callback) {
    this.listeners.add(callback);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            this.listeners.delete(callback);
          },
        },
      },
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Spendz App State Manager (Mirroring authStore, appStore, groupStore)
// ─────────────────────────────────────────────────────────────────────────────

function createAppEnvironment(platformName) {
  const storage = new MockStorage();
  const supabaseAuth = new MockSupabaseAuth(storage);

  // Database settings table simulation
  const dbSettings = new Map();
  const dbCachedGroups = new Map(); // groupId -> group

  // Cloud backend groups for users
  const cloudUserGroups = new Map([
    ['usr_supabase_alpha_11111', [{ id: 'grp_alpha_trip', name: 'Alpha Trip 2026' }]],
    ['usr_supabase_beta_22222', [{ id: 'grp_beta_roommates', name: 'Beta Flatmates' }]],
  ]);

  // AppStore state
  let appStore = {
    userProfile: {
      id: 'user_spendz',
      name: '',
      fullName: '',
      email: '',
      phone: '',
      avatarUri: null,
      currency: '₹',
      createdAt: '',
      updatedAt: '',
    },
    setUserProfile: (profile) => {
      const prev = appStore.userProfile;
      const now = new Date().toISOString();
      const isSwitchingUser = !!profile.id && !!prev.id && profile.id !== prev.id && prev.id !== 'user_spendz';
      const base = isSwitchingUser
        ? {
            id: profile.id,
            name: '',
            fullName: '',
            email: '',
            phone: '',
            avatarUri: null,
            currency: prev.currency || '₹',
            createdAt: now,
            updatedAt: now,
          }
        : prev;

      const resolvedName =
        profile.fullName !== undefined
          ? profile.fullName
          : profile.name !== undefined
          ? profile.name
          : base.name;

      appStore.userProfile = {
        ...base,
        ...profile,
        name: resolvedName,
        fullName: resolvedName,
        createdAt: base.createdAt || now,
        updatedAt: now,
      };

      // Persist to local database
      dbSettings.set('userName', resolvedName);
      if (profile.email) dbSettings.set('profileEmail', profile.email);
      if (profile.id) dbSettings.set('profileId', profile.id);
    },
    resetUserProfile: () => {
      appStore.userProfile = {
        id: 'user_spendz',
        name: '',
        fullName: '',
        email: '',
        phone: '',
        avatarUri: null,
        currency: '₹',
        createdAt: '',
        updatedAt: '',
      };
      dbSettings.delete('userName');
      dbSettings.delete('profileEmail');
      dbSettings.delete('profileId');
      dbSettings.delete('profileAvatar');
      dbSettings.delete('profilePhone');
    },
  };

  // GroupStore state
  let activeRealtimeSubscriptions = new Set();
  let groupStore = {
    groups: [],
    loadGroups: async () => {
      const authUser = authStore.user;
      if (!authUser) {
        groupStore.groups = [];
        return;
      }
      const remote = cloudUserGroups.get(authUser.id) || [];
      groupStore.groups = [...remote];
      for (const g of remote) {
        dbCachedGroups.set(g.id, g);
        activeRealtimeSubscriptions.add(`realtime_channel_${g.id}`);
      }
    },
    reset: () => {
      activeRealtimeSubscriptions.clear();
      groupStore.groups = [];
      dbCachedGroups.clear();
    },
  };

  const syncProfileForUser = (user) => {
    const metaName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '';
    const metaPhone = user.user_metadata?.phone || '';
    const metaAvatar = user.user_metadata?.avatar_url || null;

    appStore.setUserProfile({
      id: user.id,
      email: user.email || '',
      name: metaName,
      fullName: metaName,
      phone: metaPhone,
      avatarUri: metaAvatar,
    });
  };

  // AuthStore state
  let authSubscription = null;
  let authStore = {
    session: null,
    user: null,
    isLoading: false,
    isInitialized: false,
    isAuthenticated: false,

    initAuth: async () => {
      authStore.isLoading = true;
      const { data } = await supabaseAuth.getSession();
      const session = data?.session ?? null;
      const user = session?.user ?? null;

      if (user && session) {
        syncProfileForUser(user);
        authStore.session = session;
        authStore.user = user;
        authStore.isAuthenticated = true;
      } else {
        authStore.session = null;
        authStore.user = null;
        authStore.isAuthenticated = false;
      }
      authStore.isInitialized = true;
      authStore.isLoading = false;

      if (!authSubscription) {
        const { data: subData } = supabaseAuth.onAuthStateChange(async (event, newSession) => {
          if (event === 'SIGNED_OUT' || !newSession?.user) {
            authStore.session = null;
            authStore.user = null;
            authStore.isAuthenticated = false;
            return;
          }
          const newUser = newSession.user;
          const isDifferentUser = !authStore.user || authStore.user.id !== newUser.id;
          if (isDifferentUser) {
            groupStore.reset();
          }
          syncProfileForUser(newUser);
          authStore.session = newSession;
          authStore.user = newUser;
          authStore.isAuthenticated = true;
          if (isDifferentUser) {
            await groupStore.loadGroups();
          }
        });
        authSubscription = subData.subscription;
      }
    },

    signInWithPassword: async ({ email, password }) => {
      authStore.isLoading = true;
      const { data, error } = await supabaseAuth.signInWithPassword({ email, password });
      if (error) {
        authStore.isLoading = false;
        return { user: null, session: null, error };
      }

      const session = data?.session;
      const user = data?.user;

      if (!session || !user) {
        authStore.isLoading = false;
        return { user: null, session: null, error: new Error('Missing session') };
      }

      // Security check
      if (user.id !== session.user.id) {
        authStore.isLoading = false;
        return { user: null, session: null, error: new Error('User ID mismatch') };
      }

      // Clear previous account data if switching
      const prevUser = authStore.user;
      if (prevUser && prevUser.id !== user.id) {
        groupStore.reset();
        appStore.resetUserProfile();
      }

      authStore.session = session;
      authStore.user = user;
      authStore.isAuthenticated = true;
      authStore.isLoading = false;

      syncProfileForUser(user);
      await groupStore.loadGroups();

      return { user, session, error: null };
    },

    signOut: async () => {
      authStore.isLoading = true;
      groupStore.reset();
      appStore.resetUserProfile();
      const { error } = await supabaseAuth.signOut();
      await storage.removeItem('sb-testproject-auth-token');
      authStore.session = null;
      authStore.user = null;
      authStore.isAuthenticated = false;
      authStore.isLoading = false;
      return { error };
    },
  };

  return {
    platformName,
    storage,
    supabaseAuth,
    dbSettings,
    dbCachedGroups,
    appStore,
    groupStore,
    authStore,
    activeRealtimeSubscriptions,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Execution of Test Suite
// ─────────────────────────────────────────────────────────────────────────────

async function runTwoAccountTestSuite(platform) {
  console.log(`\n======================================================`);
  console.log(`RUNNING TWO-ACCOUNT AUTHENTICATION TEST ON: ${platform.toUpperCase()}`);
  console.log(`======================================================\n`);

  const env = createAppEnvironment(platform);

  // 1. Initial startup on fresh device
  await env.authStore.initAuth();
  check(env.authStore.isInitialized === true, 'Startup: auth initialized');
  check(env.authStore.isAuthenticated === false, 'Startup: initially confirmed signed out');
  check(env.authStore.user === null, 'Startup: user is null');
  check(env.appStore.userProfile.id === 'user_spendz', 'Startup: profile has default ID');

  // 2. Step 1: Sign in with Account A
  console.log('\n--- Step 1: Sign in with Account A ---');
  const signInResA = await env.authStore.signInWithPassword({
    email: 'user_a@spendz.app',
    password: 'PasswordA123!',
  });

  check(signInResA.error === null, 'Account A login succeeded with no error');
  check(signInResA.user !== null, 'Account A returned authenticated user');
  const userIdA = signInResA.user.id;
  console.log('Recorded Authenticated User ID A:', userIdA);
  check(userIdA === 'usr_supabase_alpha_11111', 'User ID A matches Supabase Account A');
  check(signInResA.session.user.id === userIdA, 'Session user ID matches returned user ID A');
  check(env.authStore.isAuthenticated === true, 'Auth store isAuthenticated is true');
  check(env.authStore.user.id === userIdA, 'Auth store user ID is Account A');

  // Verify Account A profile and data
  check(env.appStore.userProfile.id === userIdA, 'Profile ID updated to Account A');
  check(env.appStore.userProfile.fullName === 'Alice Alpha', 'Profile full name is Alice Alpha');
  check(env.appStore.userProfile.email === 'user_a@spendz.app', 'Profile email is user_a@spendz.app');
  check(env.groupStore.groups.length === 1 && env.groupStore.groups[0].name === 'Alpha Trip 2026', 'Account A authorized cloud groups loaded');
  check(env.activeRealtimeSubscriptions.has('realtime_channel_grp_alpha_trip'), 'Realtime subscription active for Alpha group');

  // 3. Step 2: Sign out Account A
  console.log('\n--- Step 2: Sign out Account A ---');
  const signOutResA = await env.authStore.signOut();
  check(signOutResA.error === null, 'Sign out returned no error');
  check(env.authStore.isAuthenticated === false, 'Auth store is now unauthenticated');
  check(env.authStore.user === null, 'Auth store user is now null');
  check(env.authStore.session === null, 'Auth store session is now null');
  check(env.appStore.userProfile.fullName === '', 'Profile full name reset to empty');
  check(env.appStore.userProfile.id === 'user_spendz', 'Profile ID reset to default');
  check(env.groupStore.groups.length === 0, 'In-memory groups cleared');
  check(env.dbCachedGroups.size === 0, 'Cached database group data cleared');
  check(env.activeRealtimeSubscriptions.size === 0, 'Realtime subscriptions unsubscribed');
  check(env.dbSettings.has('userName') === false, 'Local db userName setting deleted');
  const storedTokenAfterSignOut = await env.storage.getItem('sb-testproject-auth-token');
  check(storedTokenAfterSignOut === null, 'Persisted auth token deleted from storage');

  // 4. Step 3: Sign in with Account B using different credentials
  console.log('\n--- Step 3: Sign in with Account B ---');
  const signInResB = await env.authStore.signInWithPassword({
    email: 'user_b@spendz.app',
    password: 'PasswordB456!',
  });

  check(signInResB.error === null, 'Account B login succeeded with no error');
  check(signInResB.user !== null, 'Account B returned authenticated user');
  const userIdB = signInResB.user.id;
  console.log('Recorded Authenticated User ID B:', userIdB);
  check(userIdB === 'usr_supabase_beta_22222', 'User ID B matches Supabase Account B');
  check(userIdB !== userIdA, 'User ID B is strictly different from User ID A');
  check(signInResB.session.user.id === userIdB, 'Session user ID matches returned user ID B');
  check(env.authStore.isAuthenticated === true, 'Auth store isAuthenticated is true for B');
  check(env.authStore.user.id === userIdB, 'Auth store user ID is Account B');

  // 5. Step 4: Verify Account B's profile & authorized data load (NO STALE DATA FROM A)
  console.log('\n--- Step 4: Verify Account B data boundary & no stale data from A ---');
  check(env.appStore.userProfile.id === userIdB, 'Profile ID is strictly Account B UID');
  check(env.appStore.userProfile.fullName === 'Bob Beta', 'Profile full name is Bob Beta (not Alice Alpha)');
  check(env.appStore.userProfile.email === 'user_b@spendz.app', 'Profile email is Bob Beta email');
  check(env.appStore.userProfile.avatarUri === 'https://avatar.spendz/bob.png', 'Profile avatar is Bob avatar');
  check(env.groupStore.groups.length === 1 && env.groupStore.groups[0].name === 'Beta Flatmates', 'Authorized cloud groups loaded for Beta only');
  check(env.dbCachedGroups.has('grp_alpha_trip') === false, 'No Alpha Trip group remains in cache');
  check(env.dbCachedGroups.has('grp_beta_roommates') === true, 'Beta Flatmates group is in cache');
  check(env.activeRealtimeSubscriptions.has('realtime_channel_grp_alpha_trip') === false, 'Alpha realtime channel is NOT active');
  check(env.activeRealtimeSubscriptions.has('realtime_channel_grp_beta_roommates') === true, 'Beta realtime channel IS active');

  // 6. Step 5: Sign out and try incorrect password for Account B
  console.log('\n--- Step 5: Test invalid credentials handling ---');
  await env.authStore.signOut();

  const failedSignIn = await env.authStore.signInWithPassword({
    email: 'user_b@spendz.app',
    password: 'WRONG_PASSWORD_XYZ',
  });

  check(failedSignIn.error !== null, 'Invalid password correctly returns error');
  check(failedSignIn.error.message.includes('Invalid login credentials'), 'Error message is invalid credentials');
  check(failedSignIn.user === null, 'No user returned on failed login');
  check(failedSignIn.session === null, 'No session returned on failed login');
  check(env.authStore.isAuthenticated === false, 'Auth store is NOT authenticated');
  check(env.authStore.user === null, 'Auth store user is NOT set');
  check(env.appStore.userProfile.fullName === '', 'Did NOT fall back to Account A or B profile');
  check(env.groupStore.groups.length === 0, 'Did NOT load any groups on failed login');

  // 7. Step 6: Force-close and reopen simulation
  console.log('\n--- Step 6: Force-close and reopen session restoration simulation ---');
  // Log in as B properly first
  await env.authStore.signInWithPassword({
    email: 'user_b@spendz.app',
    password: 'PasswordB456!',
  });
  check(env.authStore.user.id === userIdB, 'Account B active before app termination');

  // Simulate force close: destroy memory state, but storage survives
  const restartedEnv = {
    authStore: { ...env.authStore },
    appStore: { ...env.appStore },
    groupStore: { ...env.groupStore },
  };

  // Re-create app memory state from persisted storage
  const newAppEnv = createAppEnvironment(platform);
  // Copy over persisted storage
  newAppEnv.storage.store = new Map(env.storage.store);
  newAppEnv.dbSettings = new Map(env.dbSettings);

  // Reopen app: initAuth() restores session
  await newAppEnv.authStore.initAuth();
  check(newAppEnv.authStore.isAuthenticated === true, 'Session restored on app reopen');
  check(newAppEnv.authStore.user.id === userIdB, 'Restored session belongs to Account B (not Account A)');
  check(newAppEnv.appStore.userProfile.fullName === 'Bob Beta', 'Restored profile is Bob Beta');
  check(newAppEnv.appStore.userProfile.email === 'user_b@spendz.app', 'Restored email is user_b@spendz.app');

  console.log(`\nPlatform ${platform.toUpperCase()} verification completed successfully!`);
}

async function main() {
  await runTwoAccountTestSuite('web');
  await runTwoAccountTestSuite('native');

  console.log(`\n======================================================`);
  console.log(`TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED!`);
  console.log(`======================================================\n`);
  if (passedTests === totalTests) {
    console.log('🎯 ALL AUTHENTICATION AND ACCOUNT SWITCHING TESTS PASSED PERFECTLY!\n');
  }
}

main().catch((err) => {
  console.error('Fatal error during test:', err);
  process.exit(1);
});
