import { db } from "@/db";
import { users } from "@/db/schema";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

export async function GET() {
  const newPassword = "NomAdmin@2026";
  const passwordHash = await hash(newPassword, 10);

  // Reset ALL users - unlock every account
  const result = await db
    .update(users)
    .set({
      passwordHash,
      failedLoginAttempts: 0,
      lockedUntil: null,
      status: "active",
      updatedAt: new Date(),
    })
    .returning({ id: users.id, email: users.email, role: users.role });

  return NextResponse.json({ ok: true, password: newPassword, unlocked: result });
}
