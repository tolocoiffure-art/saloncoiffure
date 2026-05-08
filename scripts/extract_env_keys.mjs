import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';
const ROOT = process.cwd();

function getEnvKeysFrom(content) {
  const matches = content.matchAll(/\bprocess\.env\.([A-Z0-9_]+)/g);
  const found = [...matches].map(m => m[1]);
  const metaMatches = content.matchAll(/\bimport\.meta\.env\.([A-Z0-9_]+)/g);
  const metaFound = [...metaMatches].map(m => m[1]);
  return [...new Set([...found, ...metaFound])];
}

async function main() {
  const files = glob.sync(`${ROOT}/**/*.{js,ts,mjs,astro}`, {
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.vercel/**']
  });

  const allKeys = new Set();

  for (const file of files) {
    const content = await fs.readFile(file, 'utf8').catch(() => '');
    for (const key of getEnvKeysFrom(content)) {
      allKeys.add(key);
    }
  }

  const sorted = [...allKeys].sort();
  console.log(`\n🌍 Found ${sorted.length} unique environment keys:\n`);
  for (const key of sorted) console.log('  -', key);

  await fs.writeFile('scripts/env_keys_report.json', JSON.stringify(sorted, null, 2));
  console.log('\n🧾 Report written to scripts/env_keys_report.json');
}

main();
