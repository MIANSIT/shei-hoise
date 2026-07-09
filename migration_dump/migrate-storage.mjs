/**
 * Supabase Storage Migration Script
 *
 * Copies all buckets + files from one Supabase project to another.
 *
 * Usage:
 *   OLD_URL=https://xxx.supabase.co OLD_KEY=service_role_key_old \
 *   NEW_URL=https://yyy.supabase.co NEW_KEY=service_role_key_new \
 *   node migration_dump/migrate-storage.mjs
 */

import { createClient } from '@supabase/supabase-js';

const OLD_URL = process.env.OLD_URL;
const OLD_KEY = process.env.OLD_KEY;
const NEW_URL = process.env.NEW_URL;
const NEW_KEY = process.env.NEW_KEY;

if (!OLD_URL || !OLD_KEY || !NEW_URL || !NEW_KEY) {
  console.error(`
Missing environment variables. Run with:

  OLD_URL=https://old-ref.supabase.co \\
  OLD_KEY=<old service role key> \\
  NEW_URL=https://new-ref.supabase.co \\
  NEW_KEY=<new service role key> \\
  node migration_dump/migrate-storage.mjs
`);
  process.exit(1);
}

const source = createClient(OLD_URL, OLD_KEY, { auth: { persistSession: false } });
const dest   = createClient(NEW_URL, NEW_KEY, { auth: { persistSession: false } });

// Recursively list every file path inside a bucket folder.
// Supabase list() is not recursive — folders have id=null, files have id set.
async function listAllFiles(bucket, folderPath = '') {
  const files = [];
  let offset = 0;
  const PAGE = 1000;

  while (true) {
    const { data, error } = await source.storage
      .from(bucket)
      .list(folderPath, { limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' } });

    if (error) throw new Error(`list("${bucket}", "${folderPath}"): ${error.message}`);
    if (!data || data.length === 0) break;

    for (const item of data) {
      const fullPath = folderPath ? `${folderPath}/${item.name}` : item.name;

      if (item.id) {
        // item.id is set → it's a file
        files.push(fullPath);
      } else {
        // item.id is null → it's a folder, recurse
        const nested = await listAllFiles(bucket, fullPath);
        files.push(...nested);
      }
    }

    if (data.length < PAGE) break;
    offset += PAGE;
  }

  return files;
}

async function migrateBucket(bucketName, isPublic) {
  // Create the bucket in the destination (skip if it already exists)
  const { error: createErr } = await dest.storage.createBucket(bucketName, {
    public: isPublic,
    fileSizeLimit: null,
  });
  if (createErr && !createErr.message.toLowerCase().includes('already exists')) {
    throw new Error(`createBucket("${bucketName}"): ${createErr.message}`);
  }

  console.log(`  Scanning files...`);
  const files = await listAllFiles(bucketName);
  console.log(`  ${files.length} file(s) found\n`);

  let success = 0;
  let failed  = 0;

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    const label    = `[${i + 1}/${files.length}] ${filePath}`;

    try {
      // Download from source
      const { data: blob, error: dlErr } = await source.storage
        .from(bucketName)
        .download(filePath);
      if (dlErr) throw new Error(dlErr.message);

      // Upload to destination (upsert so re-runs are safe)
      const { error: ulErr } = await dest.storage
        .from(bucketName)
        .upload(filePath, blob, {
          upsert: true,
          contentType: blob.type || 'application/octet-stream',
        });
      if (ulErr) throw new Error(ulErr.message);

      success++;
      console.log(`  ✓ ${label}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${label} — ${err.message}`);
    }
  }

  return { success, failed, total: files.length };
}

async function main() {
  console.log('='.repeat(60));
  console.log('  Supabase Storage Migration');
  console.log(`  FROM: ${OLD_URL}`);
  console.log(`  TO  : ${NEW_URL}`);
  console.log('='.repeat(60) + '\n');

  // List all buckets in the source project
  const { data: buckets, error: listErr } = await source.storage.listBuckets();
  if (listErr) throw new Error(`listBuckets: ${listErr.message}`);
  if (!buckets || buckets.length === 0) {
    console.log('No buckets found in source project. Nothing to migrate.');
    return;
  }

  console.log(`Found ${buckets.length} bucket(s): ${buckets.map(b => b.name).join(', ')}\n`);

  let totalSuccess = 0;
  let totalFailed  = 0;

  for (const bucket of buckets) {
    console.log(`\nBucket: "${bucket.name}" (${bucket.public ? 'public' : 'private'})`);
    console.log('-'.repeat(40));
    const { success, failed, total } = await migrateBucket(bucket.name, bucket.public);
    totalSuccess += success;
    totalFailed  += failed;
    console.log(`\n  Bucket done — ${success}/${total} succeeded${failed ? `, ${failed} failed` : ''}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log(`  Migration complete`);
  console.log(`  Succeeded : ${totalSuccess}`);
  console.log(`  Failed    : ${totalFailed}`);
  console.log('='.repeat(60));

  if (totalFailed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
