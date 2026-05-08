/**
 * scripts/validate-supabase-crud.js (CommonJS)
 * Compare the live Supabase schema (exported JSON) with the .from('table') calls in src/utils/backend.
 * Scopes .select() and filter columns to the nearest preceding .from('table') to avoid false positives.
 *
 * Usage:
 *   node scripts/validate-supabase-crud.js path/to/live_schema.json
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TARGET_DIR = process.argv[3] ? path.resolve(process.argv[3]) : path.join(ROOT, 'src/utils/backend');

const schemaFile = process.argv[2];
if (!schemaFile) {
  console.error('❌  Usage: node scripts/validate-supabase-crud.js live_schema.json');
  process.exit(1);
}

// --- Load live schema
let schemaRaw = '[]';
try {
  schemaRaw = fs.readFileSync(schemaFile, 'utf8');
} catch (e) {
  console.error('❌  Could not read schema file:', schemaFile);
  process.exit(1);
}

/** @type {{ table_name: string; columns: { column_name: string }[] }[]} */
let schema = [];
try {
  schema = JSON.parse(schemaRaw);
} catch (e) {
  console.error('❌  Schema file is not valid JSON.');
  process.exit(1);
}

/** @type {Record<string, string[]>} */
const schemaMap = {};
for (const t of schema) {
  schemaMap[t.table_name] = (t.columns || []).map((c) => c.column_name);
}

// --- Utility: recursive file walk
function walk(dir) {
  /** @type {string[]} */
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push.apply(out, walk(full));
    else if (e.name.endsWith('.ts') || e.name.endsWith('.js')) out.push(full);
  }
  return out;
}

// --- Regexes
const fromRe = /\.from\(\s*['"`]([A-Za-z0-9_]+)['"`]\s*\)/g;
const selectRe = /\.select\s*\(\s*(['"])\s*([\s\S]*?)\s*\1\s*(?:,\s*\{[\s\S]*?\})?\)/g;
// Filter methods with first arg = column name
const filterMethods = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'ilike', 'like', 'contains', 'containedBy'];
const filterRes = filterMethods.map((m) => new RegExp('\\\.' + m + "\\(\\s*['\"]([A-Za-z0-9_]+)['\"]", 'g'));
const inRe = /\.in\(\s*['"]([A-Za-z0-9_]+)['"]\s*,/g;
const orderRe = /\.order\(\s*['"]([A-Za-z0-9_]+)['"]/g;

/** Split select list while ignoring commas inside function calls or nested expressions */
function splitSelectList(str) {
  const out = [];
  let buf = '';
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (ch === ',' && depth === 0) {
      if (buf.trim()) out.push(buf.trim());
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

/** Extract column identifiers from .select() string, skipping '*' and relational selects */
function* iterSelectColumns(selStr) {
  const cols = splitSelectList(selStr);
  for (const raw of cols) {
    const col = raw.trim();
    if (!col || col === '*' || col.includes('(')) continue; // skip star and functions/relations
    if (col.includes(':')) {
      // alias or aggregate (e.g., count:id) – validate RHS only
      const rhs = col.split(':')[1];
      if (rhs && rhs.trim()) yield rhs.trim();
      continue;
    }
    yield col;
  }
}

// --- Scan
/** @type {{file:string, table:string, issue:string, message:string}[]} */
const mismatches = [];

for (const file of walk(TARGET_DIR)) {
  const code = fs.readFileSync(file, 'utf8');
  const fromMatches = [];
  let m;
  while ((m = fromRe.exec(code))) {
    fromMatches.push({ table: m[1], index: m.index });
  }
  if (fromMatches.length === 0) continue;

  for (let i = 0; i < fromMatches.length; i++) {
    const table = fromMatches[i].table;
    const start = fromMatches[i].index;
    const end = i + 1 < fromMatches.length ? fromMatches[i + 1].index : code.length;
    const segment = code.slice(start, end);

    if (!schemaMap[table]) {
      mismatches.push({ file, table, issue: 'table_missing', message: "Table '" + table + "' not found in live schema." });
      continue;
    }
    const valid = schemaMap[table];

    // Validate select columns scoped to this segment
    let s;
    while ((s = selectRe.exec(segment))) {
      const selStr = s[2] || '';
      for (const col of iterSelectColumns(selStr)) {
        if (valid.indexOf(col) === -1) {
          mismatches.push({ file, table, issue: 'column_missing', message: "Column '" + col + "' not found in table '" + table + "'." });
        }
      }
    }

    // Validate filter/order column names scoped to this segment
    for (const re of filterRes) {
      let f;
      while ((f = re.exec(segment))) {
        const col = (f[1] || '').trim();
        if (col && valid.indexOf(col) === -1) {
          mismatches.push({ file, table, issue: 'column_missing', message: "Column '" + col + "' not found in table '" + table + "'." });
        }
      }
    }
    let inM;
    while ((inM = inRe.exec(segment))) {
      const col = (inM[1] || '').trim();
      if (col && valid.indexOf(col) === -1) {
        mismatches.push({ file, table, issue: 'column_missing', message: "Column '" + col + "' not found in table '" + table + "'." });
      }
    }
    let ord;
    while ((ord = orderRe.exec(segment))) {
      const col = (ord[1] || '').trim();
      if (col && valid.indexOf(col) === -1) {
        mismatches.push({ file, table, issue: 'column_missing', message: "Column '" + col + "' not found in table '" + table + "'." });
      }
    }
  }
}

// --- Report
if (mismatches.length === 0) {
  console.log('✅  All Supabase .from() calls match live schema (select + filters).');
  process.exit(0);
}

console.log('❌  Found schema mismatches:\n');
for (const m of mismatches) {
  console.log('→ ' + m.file);
  console.log('   ' + m.message + '\n');
}
process.exit(1);
