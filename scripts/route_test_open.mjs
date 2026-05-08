#!/usr/bin/env node
/**
 * pedrodemenagement route opener
 * Opens all major routes in browser for manual visual test
 */

import { exec } from "child_process";

const PORT = process.env.PORT || 4322; // adjust to your Astro local port
const BASE = `http://localhost:${PORT}`;

const ROUTES = [
  "/", "/about", "/contact", "/thank-you",
  "/auth/signin", "/auth/signup", "/auth/forgot", "/auth/reset", "/auth/callback",
  "/app/index", "/app/clients", "/app/projects", "/app/tasks",
  "/app/documents", "/app/invoices", "/app/settings", "/app/subscriptions"
];

function open(url) {
  const command =
    process.platform === "darwin"
      ? `open ${url}`
      : process.platform === "win32"
      ? `start ${url}`
      : `xdg-open ${url}`;
  exec(command);
}

console.log(`🚀 Opening ${ROUTES.length} routes on ${BASE}`);
for (let i = 0; i < ROUTES.length; i++) {
  const url = `${BASE}${ROUTES[i]}`;
  console.log(`→ ${url}`);
  open(url);
}
