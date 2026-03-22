import { readdir } from 'node:fs/promises';
import path from 'node:path';

const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations');
const migrationPattern = /^(\d{4})_(.+)\.sql$/;
const allowedDuplicateFiles = new Set([
  '0032_platform_root_membership_admin.sql'
]);

function fail(message) {
  console.error(`Migration validation failed: ${message}`);
  process.exit(1);
}

const entries = await readdir(migrationsDir, { withFileTypes: true });
const migrationFiles = entries
  .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
  .map((entry) => entry.name)
  .sort((left, right) => left.localeCompare(right));

if (!migrationFiles.length) {
  fail('no migration files found in supabase/migrations');
}

const parsed = migrationFiles.map((fileName) => {
  const match = fileName.match(migrationPattern);
  if (!match) {
    fail(`unexpected migration filename format: ${fileName}`);
  }

  return {
    fileName,
    version: Number.parseInt(match[1], 10)
  };
});

const seenByVersion = new Map();

for (const current of parsed) {
  const previous = seenByVersion.get(current.version);
  if (!previous) {
    seenByVersion.set(current.version, current.fileName);
    continue;
  }

  if (!allowedDuplicateFiles.has(current.fileName)) {
    const versionLabel = String(current.version).padStart(4, '0');
    fail(`duplicate migration version detected: ${versionLabel} (${previous}, ${current.fileName})`);
  }
}

const uniqueVersions = [...new Set(parsed.map((entry) => entry.version))];

for (let index = 0; index < uniqueVersions.length; index += 1) {
  const expectedVersion = index + 1;
  const actualVersion = uniqueVersions[index];
  if (actualVersion !== expectedVersion) {
    const expectedLabel = String(expectedVersion).padStart(4, '0');
    const actualLabel = String(actualVersion).padStart(4, '0');
    fail(`expected migration ${expectedLabel}_*.sql in unique sequence, found ${actualLabel}_*.sql`);
  }
}

console.log(`Migration validation passed for ${parsed.length} files (${uniqueVersions.length} unique versions).`);
