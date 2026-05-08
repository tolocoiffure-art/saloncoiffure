import { promises as fs } from "fs";
import path from "path";

const root = "./src";
const exts = [".js", ".ts", ".astro"];
const outputFile = "verified_functions.json";

/**
 * Recursively gather source files
 */
async function getFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files = files.concat(await getFiles(full));
    else if (exts.includes(path.extname(full))) files.push(full);
  }
  return files;
}

/**
 * Detect functions + bodies
 */
function analyzeFile(content) {
  const functions = [];

  // Regex for normal, arrow, and export functions
  const patterns = [
    /\bfunction\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*\{([\s\S]*?)\}/g,
    /const\s+([a-zA-Z0-9_]+)\s*=\s*\([^)]*\)\s*=>\s*\{([\s\S]*?)\}/g,
    /export\s+function\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*\{([\s\S]*?)\}/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content))) {
      const [, name, body] = match;
      const trimmed = body.trim();

      const isStub =
        trimmed === "" ||
        /^\/\//.test(trimmed) ||
        /TODO/i.test(trimmed) ||
        /^throw new Error/i.test(trimmed) ||
        trimmed.split("\n").length <= 1;

      functions.push({
        name,
        lines: trimmed.split("\n").length,
        isStub,
      });
    }
  }
  return functions;
}

/**
 * Run analysis
 */
async function main() {
  const files = await getFiles(root);
  const results = [];

  for (const file of files) {
    const content = await fs.readFile(file, "utf-8");
    const fns = analyzeFile(content);

    if (fns.length)
      results.push({
        file,
        fns: fns.filter((f) => !f.isStub).map((f) => f.name),
        stubs: fns.filter((f) => f.isStub).map((f) => f.name),
      });
  }

  await fs.writeFile(outputFile, JSON.stringify(results, null, 2), "utf8");
  console.log(`✅ Function verification complete. Output → ${outputFile}`);
}

main().catch(console.error);
