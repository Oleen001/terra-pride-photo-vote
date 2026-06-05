// Generate a bcrypt hash for the admin password.
// Usage: node scripts/gen-admin-hash.mjs 'your-password'
//   or:  npm run gen:admin-hash -- 'your-password'
import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error("Usage: node scripts/gen-admin-hash.mjs '<password>'");
  process.exit(1);
}

const hash = await bcrypt.hash(password, 12);
console.log("\nADMIN_PASSWORD_HASH=" + hash + "\n");
