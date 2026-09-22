#!/usr/bin/env node
// Same idea as create-admin.js, but seeds a role='vendor' row in the same
// admin_users table so the account can only sign in through the Vendor
// Portal (/vendor/html/login.html), never the shop's own Admin Console.
//
// Usage:
//   node scripts/create-vendor.js "vendor@example.com" "a strong password" "Vendor Name"
//   npx wrangler d1 execute jewelry_shop_db --remote --file=./scripts/vendor-seed.sql

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
    console.error('Usage: node scripts/create-vendor.js "email@example.com" "password" "Display Name"');
    process.exit(1);
  }
  const passwordHash = await hashPassword(password);
  const safeEmail = email.toLowerCase().replace(/'/g, "''");
  const safeName = (name || "Vendor").replace(/'/g, "''");
  const sql = `INSERT INTO admin_users (email, password_hash, name, role) VALUES ('${safeEmail}', '${passwordHash}', '${safeName}', 'vendor') ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash, name = excluded.name, role = 'vendor';\n`;

  const outputPath = path.join(__dirname, "vendor-seed.sql");
  fs.writeFileSync(outputPath, sql, { encoding: "utf8" });

  console.log(`Wrote ${outputPath}`);
  console.log(`Vendor email: ${safeEmail}`);
  console.log("");
  console.log("Now run:");
  console.log("  npx wrangler d1 execute jewelry_shop_db --remote --file=./scripts/vendor-seed.sql");
}

main();
