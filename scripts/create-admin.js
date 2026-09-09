#!/usr/bin/env node
// Generates a ready-to-run SQL file to create (or reset) an admin login for
// the Admin Console. D1 can only be reached over HTTP/wrangler, not from
// plain Node, so this script writes the INSERT statement to a file for you
// to run via wrangler rather than writing to the database directly.
//
// IMPORTANT: this writes the file itself (via Node's fs module, plain UTF-8,
// no BOM) instead of printing to stdout for you to redirect with `>`.
// PowerShell's `>` redirection saves files as UTF-16 by default, which
// wrangler's SQL importer can't read (it silently executes 0 queries) — so
// writing the file directly here sidesteps that shell-specific gotcha
// entirely, on Windows, macOS, or Linux.
//
// Usage:
//   node scripts/create-admin.js "owner@example.com" "a strong password" "Shop Owner"
//   npx wrangler d1 execute jewelry_shop_db --remote --file=./scripts/admin-seed.sql

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

async function hashPassword(password) {
  const salt = crypto.randomUUID();
  const hash = crypto.createHash("sha256").update(`${salt}:${password}`).digest("hex");
  return `${salt}$${hash}`;
}

async function main() {
  const [, , email, password, name] = process.argv;
  if (!email || !password) {
    console.error('Usage: node scripts/create-admin.js "email@example.com" "password" "Display Name"');
    process.exit(1);
  }
  const passwordHash = await hashPassword(password);
  const safeEmail = email.toLowerCase().replace(/'/g, "''");
  const safeName = (name || "Admin").replace(/'/g, "''");
  const sql = `INSERT INTO admin_users (email, password_hash, name) VALUES ('${safeEmail}', '${passwordHash}', '${safeName}') ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash, name = excluded.name;\n`;

  const outputPath = path.join(__dirname, "admin-seed.sql");
  fs.writeFileSync(outputPath, sql, { encoding: "utf8" });

  console.log(`Wrote ${outputPath}`);
  console.log(`Admin email: ${safeEmail}`);
  console.log("");
  console.log("Now run:");
  console.log("  npx wrangler d1 execute jewelry_shop_db --remote --file=./scripts/admin-seed.sql");
}

main();
