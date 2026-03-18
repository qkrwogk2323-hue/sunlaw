import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

function listFiles(patternCmd) {
  const out = execSync(patternCmd, { encoding: 'utf8' }).trim();
  if (!out) return [];
  return out.split('\n').filter(Boolean).sort();
}

const queryFiles = listFiles("find src/lib/queries -name '*.ts' -type f");

function countFromCalls(src) {
  return (src.match(/\.from\('/g) ?? []).length;
}

function noLimitCandidates(src) {
  const lines = src.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!lines[i].includes(".from('")) continue;
    const window = lines.slice(i, i + 14).join('\n');
    if (!window.includes('.limit(')) out.push(i + 1);
  }
  return out;
}

const queryStats = queryFiles.map((file) => {
  const src = readFileSync(file, 'utf8');
  return { file, fromCalls: countFromCalls(src), noLimit: noLimitCandidates(src) };
});

const pageFiles = listFiles("find 'src/app/(app)' -mindepth 2 -maxdepth 2 -name 'page.tsx' -type f");
const pageImports = pageFiles.map((file) => {
  const src = readFileSync(file, 'utf8');
  const importedQueryFiles = [...src.matchAll(/from '\@\/lib\/queries\/([a-zA-Z0-9-_]+)'/g)].map((m) => `src/lib/queries/${m[1]}.ts`);
  const est = importedQueryFiles.reduce((acc, qf) => {
    const found = queryStats.find((s) => s.file === qf);
    return acc + (found?.fromCalls ?? 0);
  }, 0);
  return { file, importedQueryFiles, estimatedFromCalls: est };
});

const cacheCandidates = listFiles("find src/lib/queries -name '*.ts' -type f").flatMap((file) => {
  const src = readFileSync(file, 'utf8');
  return [...src.matchAll(/export async function (get[A-Za-z0-9_]+)/g)].map((m) => ({ file, fn: m[1] }));
});

const result = {
  generatedAt: new Date().toISOString(),
  queryCountTop: [...queryStats].sort((a, b) => b.fromCalls - a.fromCalls).slice(0, 15),
  noLimitTop: queryStats.filter((r) => r.noLimit.length > 0).sort((a, b) => b.noLimit.length - a.noLimit.length).slice(0, 20),
  pageEstimatedLoad: pageImports.sort((a, b) => b.estimatedFromCalls - a.estimatedFromCalls),
  cacheCandidates
};

writeFileSync('.tmp/perf-scan-result.json', JSON.stringify(result, null, 2));

console.log('== Query Count Top 15 ==');
for (const row of result.queryCountTop) {
  console.log(`${String(row.fromCalls).padStart(2, ' ')}  ${row.file}`);
}
console.log('\n== No-limit Candidates Top 20 ==');
for (const row of result.noLimitTop) {
  console.log(`${row.file} -> ${row.noLimit.slice(0, 12).join(', ')}`);
}
console.log('\n== Page Estimated Query Load ==');
for (const row of result.pageEstimatedLoad) {
  console.log(`${String(row.estimatedFromCalls).padStart(2, ' ')}  ${row.file}`);
}
console.log(`\nSaved: .tmp/perf-scan-result.json`);
