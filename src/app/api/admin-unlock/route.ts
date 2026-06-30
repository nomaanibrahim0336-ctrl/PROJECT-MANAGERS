import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== "f4e1c9a7b3d6082957a4c1e8b5f2d9a6c3e0b7f4a1d8c5e2") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const email = req.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "email query param required" }, { status: 400 });
  }

  const passwordHash = await hash("ChangeMe123!", 10);

  const [updated] = await db
    .update(users)
    .set({ failedLoginAttempts: 0, lockedUntil: null, passwordHash })
    .where(eq(users.email, email))
    .returning({ id: users.id, email: users.email });

  if (!updated) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ unlocked: updated.email, passwordReset: true });
}
