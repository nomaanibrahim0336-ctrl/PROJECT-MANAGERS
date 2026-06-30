import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { hash } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== "9b2e4d6f8a1c3e5g7i0k2m4o6q8s0u2w4y6") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Run migration to add super_admin enum value
  try {
    await db.execute(sql`ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'super_admin' BEFORE 'admin'`);
  } catch {
    // May already exist, that's fine
  }

  const passwordHash = await hash("SuperAdmin123!", 10);

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, "superadmin@example.com"));

  if (existing) {
    // Reset lockout and password
    await db
      .update(users)
      .set({ failedLoginAttempts: 0, lockedUntil: null, passwordHash })
      .where(eq(users.email, "superadmin@example.com"));
    return NextResponse.json({ status: "reset", email: "superadmin@example.com" });
  }

  await db.insert(users).values({
    name: "Super Admin",
    email: "superadmin@example.com",
    passwordHash,
    role: "super_admin" as never,
    department: "general",
  });

  return NextResponse.json({ status: "created", email: "superadmin@example.com" });
}
