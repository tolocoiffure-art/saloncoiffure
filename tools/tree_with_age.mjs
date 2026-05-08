#!/usr/bin/env node
import fs from "fs";
import path from "path";

const MAX_DEPTH = 5;

// 🧹 Ignore these directories and files
const IGNORE = new Set([
  "node_modules",
  ".git",
  ".expo",
  ".vercel",
  "dist",
  "build",
  ".next",
  ".cache",
  ".turbo",
  "coverage",
  ".astro",
  ".output",
  ".history",
  ".idea",
  ".vscode",
  "pack",
  ".DS_Store"
]);

// 🕒 Convert mtime → human-readable “time ago”
function timeAgo(date) {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// 🌳 Recursive pretty tree printer
function printTree(dir, depth = 0) {
  if (depth > MAX_DEPTH) return;

  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  entries = entries.filter(e => !IGNORE.has(e.name));
  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    let stat;
    try {
      stat = fs.statSync(fullPath);
    } catch {
      continue;
    }

    const age = timeAgo(stat.mtime);
    const prefix = "│   ".repeat(depth);
    const icon = entry.isDirectory() ? "📁" : "📄";
    const branch = depth === 0 ? "" : "├── ";

    console.log(`${prefix}${branch}${icon} ${entry.name} — ${age}`);

    if (entry.isDirectory()) printTree(fullPath, depth + 1);
  }
}

// 🧠 Entry point
const root = process.argv[2] || process.cwd();
console.log(`\n📦 Directory tree for: ${root}\n`);
printTree(root);
