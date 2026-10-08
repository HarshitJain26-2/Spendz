const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const urlMatch = envFile.match(/EXPO_PUBLIC_SUPABASE_URL=(.+)/);
const keyMatch = envFile.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.+)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
const supabaseKey = keyMatch ? keyMatch[1].trim() : '';

console.log('Connecting to Supabase at:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

async function testTables() {
  console.log('\n--- Checking tables in Supabase ---');
  
  const { data: invData, error: invErr } = await supabase.from('group_invites').select('*').limit(1);
  console.log('group_invites:', invErr ? `ERROR: ${invErr.message} (code: ${invErr.code})` : 'EXISTS! Rows:', invData);

  const { data: grpData, error: grpErr } = await supabase.from('groups').select('*').limit(1);
  console.log('groups:', grpErr ? `ERROR: ${grpErr.message} (code: ${grpErr.code})` : 'EXISTS! Rows:', grpData);

  const { data: memData, error: memErr } = await supabase.from('group_members').select('*').limit(1);
  console.log('group_members:', memErr ? `ERROR: ${memErr.message} (code: ${memErr.code})` : 'EXISTS! Rows:', memData);

  const { data: profData, error: profErr } = await supabase.from('profiles').select('*').limit(1);
  console.log('profiles:', profErr ? `ERROR: ${profErr.message} (code: ${profErr.code})` : 'EXISTS! Rows:', profData);
}

testTables().catch(console.error);
