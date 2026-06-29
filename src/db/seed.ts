import { hash } from "bcryptjs";
import { db } from "./index";
import { users } from "./schema";

async function main() {
  const passwordHash = await hash("ChangeMe123!", 10);

  await db
    .insert(users)
    .values({
      name: "Admin",
      email: "admin@example.com",
      passwordHash,
      role: "admin",
      department: "general",
    })
    .onConflictDoNothing();

  console.log("Seeded admin@example.com / ChangeMe123!");
  process.exit(0);
}

main();
