"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { canManageMembers } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ROLES = ["admin", "project_manager", "team_member", "client", "auditor"] as const;
const DEPARTMENTS = ["publishing", "design", "development", "marketing", "general"] as const;

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || !canManageMembers(session.user.role as never)) {
    throw new Error("Forbidden");
  }
  return session.user;
}

const createMemberSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(ROLES),
  department: z.enum(DEPARTMENTS),
});

export async function createMember(formData: FormData) {
  const actor = await requireAdmin();

  const parsed = createMemberSchema.parse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    department: formData.get("department"),
  });

  const [existing] = await db.select().from(users).where(eq(users.email, parsed.email)).limit(1);
  if (existing) throw new Error("A user with this email already exists");

  const tempPassword = randomBytes(9).toString("base64url");
  const passwordHash = await hash(tempPassword, 10);

  const [created] = await db
    .insert(users)
    .values({
      name: parsed.name,
      email: parsed.email,
      passwordHash,
      role: parsed.role,
      department: parsed.department,
    })
    .returning();

  await logAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "user_created",
    entityType: "user",
    entityId: created.id,
    metadata: { email: created.email, role: created.role },
  });

  revalidatePath("/admin/users");
  redirect(`/admin/users?created=${created.email}&tempPassword=${tempPassword}`);
}

const editMemberSchema = z.object({
  name: z.string().min(1),
  role: z.enum(ROLES),
  department: z.enum(DEPARTMENTS),
});

export async function editMember(userId: string, formData: FormData) {
  const actor = await requireAdmin();

  const parsed = editMemberSchema.parse({
    name: formData.get("name"),
    role: formData.get("role"),
    department: formData.get("department"),
  });

  const [before] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!before) throw new Error("User not found");

  await db
    .update(users)
    .set({ name: parsed.name, role: parsed.role, department: parsed.department, updatedAt: new Date() })
    .where(eq(users.id, userId));

  await logAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "user_updated",
    entityType: "user",
    entityId: userId,
    metadata: {
      before: { name: before.name, role: before.role, department: before.department },
      after: parsed,
    },
  });

  revalidatePath("/admin/users");
}

export async function setMemberStatus(userId: string, status: "active" | "suspended") {
  const actor = await requireAdmin();

  if (actor.id === userId) {
    throw new Error("You cannot suspend your own account");
  }

  await db.update(users).set({ status, updatedAt: new Date() }).where(eq(users.id, userId));

  await logAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: status === "suspended" ? "user_suspended" : "user_activated",
    entityType: "user",
    entityId: userId,
  });

  revalidatePath("/admin/users");
}

export async function softDeleteMember(userId: string) {
  const actor = await requireAdmin();

  if (actor.id === userId) {
    throw new Error("Admins cannot delete their own account. Ask another admin to do it.");
  }

  await db.update(users).set({ deletedAt: new Date(), status: "suspended" }).where(eq(users.id, userId));

  await logAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "user_deleted",
    entityType: "user",
    entityId: userId,
  });

  revalidatePath("/admin/users");
}

export async function forcePasswordReset(userId: string) {
  const actor = await requireAdmin();

  const tempPassword = randomBytes(9).toString("base64url");
  const passwordHash = await hash(tempPassword, 10);

  await db
    .update(users)
    .set({ passwordHash, failedLoginAttempts: 0, lockedUntil: null, updatedAt: new Date() })
    .where(eq(users.id, userId));

  await logAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "user_password_reset",
    entityType: "user",
    entityId: userId,
  });

  revalidatePath("/admin/users");
  redirect(`/admin/users?tempPassword=${tempPassword}&reset=1`);
}
