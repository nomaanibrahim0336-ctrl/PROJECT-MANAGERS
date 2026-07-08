import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

export async function GET() {
  const email = "nomaan.ibrahim0336@gmail.com";
  const newPassword = "NomAdmin@2026";

  const passwordHash = await hash(newPassword, 10);

  const result = await db
    .update(users)
    .set({
      passwordHash,
      failedLoginAttempts: 0,
      lockedUntil: null,
      status: "active",
      updatedAt: new Date(),
    })
    .where(eq(users.email, email))
    .returning({ id: users.id, email: users.email });

  if (result.length === 0) {
    return NextResponse.json({ error: "User not found", email }, { status: 404 });
  }

  return NextResponse.json({ ok: true, email, password: newPassword });
}
