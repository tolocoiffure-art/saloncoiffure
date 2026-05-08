import fs from 'fs';
import path from 'path';

const rootDir = './src';
const outputFile = './scripts/analysis_functions.json';

const jsLike = ['.js', '.jsx', '.ts', '.tsx', '.mjs'];
const ignoreDirs = [
  'node_modules', '.git', '.next', 'dist', 'build', '.astro',
  '.vercel', 'public', '.cache'
];

function listFiles(dir, allFiles = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      const folderName = path.basename(full);
      if (!ignoreDirs.includes(folderName)) listFiles(full, allFiles);
    } else if (jsLike.includes(path.extname(file))) {
      allFiles.push(full);
    }
  }
  return allFiles;
}

function extractFunctions(content) {
  const results = [];
  const patterns = [
    /function\s+([A-Za-z0-9_]+)/g,
    /const\s+([A-Za-z0-9_]+)\s*=\s*\(.*?\)\s*=>/g,
    /export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/g,
  ];
  for (const regex of patterns) {
    let match;
    while ((match = regex.exec(content))) results.push(match[1]);
  }
  return [...new Set(results)];
}

function detectStubs(content, fnNames) {
  const stubs = [];
  for (const fn of fnNames) {
    const bodyMatch = new RegExp(`function\\s+${fn}\\s*\\([^)]*\\)\\s*{([^}]*)}`, 's').exec(content);
    if (bodyMatch && bodyMatch[1].trim().length < 5) stubs.push(fn);
  }
  return stubs;
}

const allFiles = listFiles(rootDir);
const data = [];

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const fns = extractFunctions(content);
  const stubs = detectStubs(content, fns);
  if (fns.length) data.push({ file, fns, stubs });
}

fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
console.log(`✅ Function map saved to ${outputFile} (${data.length} files analyzed)`);
