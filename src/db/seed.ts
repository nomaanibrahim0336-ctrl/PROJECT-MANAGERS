import { hash } from "bcryptjs";
import { db } from "./index";
import { serviceCatalog, users } from "./schema";

const DEFAULT_SERVICES: { name: string; defaultDepartment: typeof serviceCatalog.$inferInsert.defaultDepartment }[] = [
  { name: "Web Design & Development", defaultDepartment: "development" },
  { name: "Book Publishing", defaultDepartment: "publishing" },
  { name: "Kindle Publishing", defaultDepartment: "publishing" },
  { name: "Book Printing", defaultDepartment: "publishing" },
  { name: "Social Media Management", defaultDepartment: "marketing" },
  { name: "Book Cover Design", defaultDepartment: "design" },
  { name: "Store Supply Management", defaultDepartment: "general" },
  { name: "Amazon Listing & Editing", defaultDepartment: "marketing" },
];

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

  for (const service of DEFAULT_SERVICES) {
    await db.insert(serviceCatalog).values(service).onConflictDoNothing();
  }

  console.log("Seeded admin@example.com / ChangeMe123! and the global service catalog");
  process.exit(0);
}

main();
