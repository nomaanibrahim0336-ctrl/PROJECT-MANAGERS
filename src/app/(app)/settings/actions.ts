"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hash, compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const name = z.string().min(1).parse(formData.get("name"));
  const email = z.string().email().parse(formData.get("email"));

  const [existing] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
  if (!existing) redirect("/login");

  if (email.toLowerCase() !== existing.email.toLowerCase()) {
    const [conflict] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (conflict) {
      redirect("/settings?error=" + encodeURIComponent("That email is already in use by another account"));
    }
  }

  await db.update(users).set({ name, email, updatedAt: new Date() }).where(eq(users.id, session.user.id));

  revalidatePath("/settings");
  redirect("/settings?success=profile");
}

export async function updatePassword(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const currentPassword = z.string().min(1).parse(formData.get("currentPassword"));
  const newPassword = z.string().min(8, "New password must be at least 8 characters").parse(formData.get("newPassword"));

  const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
  if (!user) redirect("/login");

  const valid = await compare(currentPassword, user.passwordHash ?? "");
  if (!valid) {
    redirect("/settings?error=" + encodeURIComponent("Current password is incorrect"));
  }

  const passwordHash = await hash(newPassword, 10);
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, session.user.id));

  revalidatePath("/settings");
  redirect("/settings?success=password");
}
