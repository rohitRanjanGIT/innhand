// Creates (or resets) an admin account: a verified `user` with role "admin" and a password account.
//   npm run db:admin -- admin@example.com            — creates it; refuses if the email already exists
//   npm run db:admin -- admin@example.com --reset    — keeps the account, sets a new password and the admin role
// A random password is generated and printed once; only its salted hash (Better Auth's scrypt) is stored.
// The email must also be listed in ADMIN_EMAILS, or the admin guard will turn the account away.
import { randomBytes, randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { db } from "./index";
import { account, user } from "./schema";

const email = process.argv[2]?.trim().toLowerCase();
const reset = process.argv.includes("--reset");
if (!email || !email.includes("@")) {
  console.error("Usage: npm run db:admin -- <email> [--reset]");
  process.exit(1);
}

// No look-alike characters (0/O, 1/l/I), so the password can be typed from a message.
const ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%*-_=+";
const password = Array.from({ length: 20 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
async function main() {
  const hash = await hashPassword(password);

  await db.transaction(async (tx) => {
    const [existing] = await tx.select().from(user).where(eq(user.email, email));
    if (existing && !reset) {
      console.error(`${email} already exists. Pass --reset to set a new password and the admin role.`);
      process.exit(1);
    }

    let userId = existing?.id;
    if (existing) {
      await tx.update(user).set({ role: "admin", emailVerified: true, updatedAt: new Date() }).where(eq(user.id, userId!));
    } else {
      userId = randomBytes(16).toString("hex");
      await tx.insert(user).values({ id: userId, name: "Admin", email, emailVerified: true, role: "admin" });
    }

    const [credential] = await tx.select().from(account).where(eq(account.userId, userId!));
    if (credential?.providerId === "credential") {
      await tx.update(account).set({ password: hash, updatedAt: new Date() }).where(eq(account.id, credential.id));
    } else {
      await tx.insert(account).values({
        id: randomBytes(16).toString("hex"),
        accountId: userId!,
        providerId: "credential",
        userId: userId!,
        password: hash,
      });
    }
  });

  console.log(`Admin ready: ${email}`);
  console.log(`Password: ${password}`);
}

main().then(() => process.exit(0), (e) => {
  console.error(e);
  process.exit(1);
});
