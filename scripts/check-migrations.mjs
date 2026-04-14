import { readdir } from 'node:fs/promises';
import path from 'node:path';

const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations');
const migrationPattern = /^(\d{14})_(.+)\.sql$/;

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
    version: match[1]
  };
});

for (let index = 1; index < parsed.length; index += 1) {
  const prev = parsed[index - 1];
  const curr = parsed[index];
  if (curr.version <= prev.version) {
    fail(`migration versions must be strictly increasing: ${prev.fileName} -> ${curr.fileName}`);
  }
}

console.log(`Migration validation passed for ${parsed.length} files.`);
