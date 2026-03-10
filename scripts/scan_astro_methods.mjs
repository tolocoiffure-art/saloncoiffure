import { promises as fs } from "fs";
import path from "path";

const rootDir = path.resolve("./src");
const exts = [".astro", ".js", ".ts"];
const outputFile = "analysis_functions.json";

/**
 * Recursively get all files with given extensions
 */
async function getFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const res = path.resolve(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getFiles(res)));
    } else if (exts.includes(path.extname(res))) {
      files.push(res);
    }
  }

  return files;
}

/**
 * Extract JS methods, functions, and frontmatter content
 */
function extractMethods(content) {
  const methods = [];

  // Match function declarations
  const funcDecl = [...content.matchAll(/\bfunction\s+([a-zA-Z0-9_]+)/g)];
  methods.push(...funcDecl.map((m) => m[1]));

  // Match arrow functions (const foo = () =>)
  const arrowFuncs = [...content.matchAll(/const\s+([a-zA-Z0-9_]+)\s*=\s*\(/g)];
  methods.push(...arrowFuncs.map((m) => m[1]));

  // Match Astro frontmatter (--- blocks)
  const frontmatter = [...content.matchAll(/---([\s\S]*?)---/g)].map(
    (m) => m[1].trim()
  );

  return { methods, frontmatter };
}

/**
 * Main execution
 */
async function main() {
  const files = await getFiles(rootDir);
  const summary = {};

  for (const file of files) {
    const content = await fs.readFile(file, "utf-8");
    const { methods, frontmatter } = extractMethods(content);

    summary[file] = {
      methods: [...new Set(methods)].sort(),
      frontmatter: frontmatter.join("\n\n---\n\n"),
    };
  }

  await fs.writeFile(outputFile, JSON.stringify(summary, null, 2), "utf-8");
  console.log(`✅ Analysis complete. See ${outputFile}`);
}

main().catch((err) => {
  console.error("❌ Error:", err);
});
