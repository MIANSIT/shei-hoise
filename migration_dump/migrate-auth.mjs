/**
 * Supabase Auth Migration Script
 *
 * Migrates all auth.users from one Supabase project to another via the Admin API.
 *
 * Limitations:
 *   - Passwords CANNOT be migrated (bcrypt hashes are not exposed by the API).
 *     Users will need to use "Forgot Password" after migration.
 *   - User UUIDs will be different in the new project. A mapping file is saved
 *     at migration_dump/auth-id-mapping.json — use it to fix FK references in
 *     your public schema (e.g. store_customers.auth_user_id).
 *
 * Usage:
 *   OLD_URL=https://xxx.supabase.co OLD_KEY=service_role_key_old \
 *   NEW_URL=https://yyy.supabase.co NEW_KEY=service_role_key_new \
 *   node migration_dump/migrate-auth.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { randomUUID } from 'crypto';

const OLD_URL = process.env.OLD_URL;
const OLD_KEY = process.env.OLD_KEY;
const NEW_URL = process.env.NEW_URL;
const NEW_KEY = process.env.NEW_KEY;
const MAPPING_FILE = 'migration_dump/auth-id-mapping.json';

if (!OLD_URL || !OLD_KEY || !NEW_URL || !NEW_KEY) {
  console.error(`
Missing environment variables. Run with:

  OLD_URL=https://old-ref.supabase.co \\
  OLD_KEY=<old service role key> \\
  NEW_URL=https://new-ref.supabase.co \\
  NEW_KEY=<new service role key> \\
  node migration_dump/migrate-auth.mjs
`);
  process.exit(1);
}

const source = createClient(OLD_URL, OLD_KEY, { auth: { persistSession: false } });
const dest   = createClient(NEW_URL, NEW_KEY, { auth: { persistSession: false } });

// Load existing mapping if re-running (to skip already migrated users)
const idMapping = existsSync(MAPPING_FILE)
  ? JSON.parse(readFileSync(MAPPING_FILE, 'utf8'))
  : {};

const alreadyMigratedOldIds = new Set(Object.keys(idMapping));

async function getAllUsers() {
  const users = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await source.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers (page ${page}): ${error.message}`);
    if (!data?.users?.length) break;

    users.push(...data.users);
    if (data.users.length < perPage) break;
    page++;
  }

  return users;
}

async function migrateUser(user, index, total) {
  const label = `[${index}/${total}] ${user.email || user.phone || user.id}`;

  // Skip if already migrated in a previous run
  if (alreadyMigratedOldIds.has(user.id)) {
    console.log(`  ⟳ ${label} — already migrated, skipping`);
    return 'skipped';
  }

  try {
    const { data, error } = await dest.auth.admin.createUser({
      email:         user.email   || undefined,
      phone:         user.phone   || undefined,
      email_confirm: !!user.email_confirmed_at,
      phone_confirm: !!user.phone_confirmed_at,
      user_metadata: user.user_metadata ?? {},
      app_metadata:  {
        ...(user.app_metadata ?? {}),
        _migrated_from_id: user.id,
        _migrated_at: new Date().toISOString(),
      },
      // Random temporary password — users must reset via "Forgot Password"
      password: randomUUID() + randomUUID(),
    });

    if (error) throw new Error(error.message);

    idMapping[user.id] = data.user.id;
    console.log(`  ✓ ${label}`);
    console.log(`      old: ${user.id}`);
    console.log(`      new: ${data.user.id}`);
    return 'success';
  } catch (err) {
    // If user already exists in destination (email conflict), try to find and map them
    if (err.message.toLowerCase().includes('already been registered') || err.message.toLowerCase().includes('already exists')) {
      console.warn(`  ⚠ ${label} — already exists in destination, finding existing user...`);
      try {
        const { data: existing } = await dest.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const match = existing?.users?.find(u => u.email === user.email || u.phone === user.phone);
        if (match) {
          idMapping[user.id] = match.id;
          console.log(`      mapped to existing: ${match.id}`);
          return 'mapped';
        }
      } catch {}
    }
    console.error(`  ✗ ${label} — ${err.message}`);
    return 'failed';
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('  Supabase Auth Migration');
  console.log(`  FROM: ${OLD_URL}`);
  console.log(`  TO  : ${NEW_URL}`);
  console.log('='.repeat(60));
  console.log('\n⚠  IMPORTANT: Passwords cannot be migrated.');
  console.log('   After migration, users must use "Forgot Password" to log in.\n');

  console.log('Fetching all users from source project...');
  const users = await getAllUsers();
  console.log(`Found ${users.length} user(s)\n`);

  if (users.length === 0) {
    console.log('No users to migrate.');
    return;
  }

  let success = 0, failed = 0, skipped = 0, mapped = 0;

  for (let i = 0; i < users.length; i++) {
    const result = await migrateUser(users[i], i + 1, users.length);
    if (result === 'success') success++;
    else if (result === 'failed')  failed++;
    else if (result === 'skipped') skipped++;
    else if (result === 'mapped')  mapped++;

    // Save mapping after every user so progress isn't lost on interruption
    writeFileSync(MAPPING_FILE, JSON.stringify(idMapping, null, 2));
  }

  console.log('\n' + '='.repeat(60));
  console.log('  Auth Migration Complete');
  console.log(`  Migrated : ${success}`);
  console.log(`  Mapped   : ${mapped}  (already existed in destination)`);
  console.log(`  Skipped  : ${skipped} (already migrated in a previous run)`);
  console.log(`  Failed   : ${failed}`);
  console.log(`\n  ID mapping saved → ${MAPPING_FILE}`);
  console.log('='.repeat(60));
  console.log(`
Next steps:
  1. Send password reset emails to all migrated users.
  2. After migrating your public schema data, run the FK fix script
     using auth-id-mapping.json to update store_customers.auth_user_id
     and any other columns that reference auth.users(id).
`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  // Save whatever mapping we have before exiting
  writeFileSync(MAPPING_FILE, JSON.stringify(idMapping, null, 2));
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
