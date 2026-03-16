import { readdir } from 'node:fs/promises';
import path from 'node:path';

const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations');
const migrationPattern = /^(\d{4})_(.+)\.sql$/;

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

for (let index = 0; index < parsed.length; index += 1) {
  const current = parsed[index];
  const expectedVersion = index + 1;

  if (current.version !== expectedVersion) {
    const expectedLabel = String(expectedVersion).padStart(4, '0');
    fail(`expected migration ${expectedLabel}_*.sql at position ${index + 1}, found ${current.fileName}`);
  }

  if (index > 0 && parsed[index - 1].version === current.version) {
    const versionLabel = String(current.version).padStart(4, '0');
    fail(`duplicate migration version detected: ${versionLabel}`);
  }
}

console.log(`Migration validation passed for ${parsed.length} files.`);