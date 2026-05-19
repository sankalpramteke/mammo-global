/**
 * Admin Seed Script
 * Run once to create the initial admin account for mammo-global.
 *
 * Usage:
 *   npx ts-node scripts/seed-admin.ts
 *
 * Or with environment variables:
 *   ADMIN_EMAIL=admin@disha.gov.in ADMIN_PASSWORD=yourpassword npx ts-node scripts/seed-admin.ts
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as readline from 'readline';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is not set in .env.local');
  process.exit(1);
}

const AdminSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  password:  { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans); }));
}

async function main() {
  await mongoose.connect(MONGODB_URI!);
  const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);

  const existingCount = await Admin.countDocuments();
  if (existingCount > 0) {
    console.log(`INFO: ${existingCount} admin account(s) already exist. Exiting.`);
    await mongoose.disconnect();
    return;
  }

  const email    = process.env.ADMIN_EMAIL    || await prompt('Admin email: ');
  const password = process.env.ADMIN_PASSWORD || await prompt('Admin password: ');
  const name     = process.env.ADMIN_NAME     || await prompt('Admin name [Admin]: ') || 'Admin';

  if (!email || !password) {
    console.error('ERROR: Email and password are required.');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  await Admin.create({ name, email: email.toLowerCase().trim(), password: hash });

  console.log(`SUCCESS: Admin account created for ${email}`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
