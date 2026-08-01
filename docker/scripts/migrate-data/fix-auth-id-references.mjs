/**
 * Fix Auth ID References — Cloud → self-hosted stack
 *
 * Copy of migration_dump/fix-auth-id-references.mjs, pointed at this
 * migration's own mapping file (docker/scripts/migrate-data/auth-id-mapping.json)
 * instead of the historical migration_dump/auth-id-mapping.json.
 *
 * After migrating auth users, new UUIDs are generated for each user.
 * This script reads that mapping (old_id -> new_id) and updates all public
 * schema columns that reference auth.users(id).
 *
 * Run this AFTER:
 *   1. Auth migration (migrate-auth.mjs) — generates the mapping file
 *   2. Public data migration (migrate-public-data.sh) — row data copied in
 *      still carrying the OLD auth.users ids
 *
 * Usage:
 *   NEW_URL=http://localhost:8000 NEW_KEY=<service_role_key> \
 *   node docker/scripts/migrate-data/fix-auth-id-references.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const NEW_URL = process.env.NEW_URL;
const NEW_KEY = process.env.NEW_KEY;

if (!NEW_URL || !NEW_KEY) {
  console.error('Usage: NEW_URL=... NEW_KEY=... node docker/scripts/migrate-data/fix-auth-id-references.mjs');
  process.exit(1);
}

const MAPPING_FILE = 'docker/scripts/migrate-data/auth-id-mapping.json';

let mapping;
try {
  mapping = JSON.parse(readFileSync(MAPPING_FILE, 'utf8'));
} catch {
  console.error(`Cannot read ${MAPPING_FILE}. Run migrate-auth.mjs first.`);
  process.exit(1);
}

const entries = Object.entries(mapping); // [[old_id, new_id], ...]
if (entries.length === 0) {
  console.log('Mapping file is empty. Nothing to fix.');
  process.exit(0);
}

const client = createClient(NEW_URL, NEW_KEY, { auth: { persistSession: false } });

// All columns in the public schema that reference auth.users(id)
const TARGETS = [
  { table: 'store_customers', column: 'auth_user_id' },
  { table: 'store_subscriptions', column: 'user_id' },
];

async function fixTable(table, column) {
  console.log(`\nFixing ${table}.${column}...`);

  const { error: probeErr } = await client.from(table).select('id').limit(1);
  if (probeErr && probeErr.message.includes('schema cache')) {
    console.warn(`  ⚠ Table "${table}" not found — run the schema/migrations bootstrap first, then re-run this script.`);
    return { updated: 0, skipped: 0, failed: 0 };
  }

  let updated = 0, skipped = 0, failed = 0;

  for (const [oldId, newId] of entries) {
    const { data: rows, error: findErr } = await client
      .from(table)
      .select('id')
      .eq(column, oldId)
      .limit(1);

    if (findErr) {
      console.error(`  ✗ find error for ${oldId}: ${findErr.message}`);
      failed++;
      continue;
    }

    if (!rows || rows.length === 0) {
      skipped++;
      continue;
    }

    const { error: updateErr } = await client
      .from(table)
      .update({ [column]: newId })
      .eq(column, oldId);

    if (updateErr) {
      console.error(`  ✗ ${oldId} → ${newId}: ${updateErr.message}`);
      failed++;
    } else {
      console.log(`  ✓ ${oldId} → ${newId}`);
      updated++;
    }
  }

  console.log(`  Done — ${updated} updated, ${skipped} not found, ${failed} failed`);
  return { updated, skipped, failed };
}

async function main() {
  console.log('='.repeat(60));
  console.log('  Fix Auth ID References (Cloud -> self-hosted)');
  console.log(`  Project : ${NEW_URL}`);
  console.log(`  Mapping : ${entries.length} users`);
  console.log('='.repeat(60));

  let totalUpdated = 0, totalFailed = 0;

  for (const { table, column } of TARGETS) {
    const { updated, failed } = await fixTable(table, column);
    totalUpdated += updated;
    totalFailed  += failed;
  }

  console.log('\n' + '='.repeat(60));
  console.log('  Complete');
  console.log(`  Total updated : ${totalUpdated}`);
  console.log(`  Total failed  : ${totalFailed}`);
  console.log('='.repeat(60));

  if (totalFailed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
