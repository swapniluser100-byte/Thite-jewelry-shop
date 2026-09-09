#!/usr/bin/env node
// Generates the SQL to create (or reset) an admin login for the Admin
// Console. D1 can only be reached over HTTP/wrangler, not from plain Node,
// so this script prints the INSERT statement for you to run via wrangler
// rather than writing to the database directly.
//
// Usage (works the same in PowerShell, cmd, and bash — redirecting to a
// file sidesteps shell-quoting differences that trip up --command):
//   node scripts/create-admin.js "owner@example.com" "a strong password" "Shop Owner" > scripts/admin-seed.sql
//   npx wrangler d1 execute jewelry_shop_db --remote --file=./scripts/admin-seed.sql

const crypto = require("crypto");

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
  const sql = `INSERT INTO admin_users (email, password_hash, name) VALUES ('${safeEmail}', '${passwordHash}', '${safeName}') ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash, name = excluded.name;`;
  console.log(sql);
}

main();
