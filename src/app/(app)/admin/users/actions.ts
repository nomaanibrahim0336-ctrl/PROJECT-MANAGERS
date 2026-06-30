"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { canManageMembers } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ROLES = ["super_admin", "admin", "project_manager", "team_member", "client", "auditor"] as const;
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
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(ROLES),
  department: z.enum(DEPARTMENTS).optional(),
});

export async function createMember(formData: FormData) {
  const actor = await requireAdmin();

  const parsed = createMemberSchema.parse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    department: formData.get("department") || undefined,
  });
  const department = parsed.department ?? "general";

  const [existing] = await db.select().from(users).where(eq(users.email, parsed.email)).limit(1);
  if (existing) redirect(`/admin/users?error=${encodeURIComponent("A user with that email already exists")}`);

  const passwordHash = await hash(parsed.password, 10);

  const [created] = await db
    .insert(users)
    .values({
      name: parsed.name,
      email: parsed.email,
      passwordHash,
      role: parsed.role,
      department,
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
  redirect(`/admin/users?created=${created.email}`);
}

const editMemberSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(ROLES),
  department: z.enum(DEPARTMENTS).optional(),
});

export async function editMember(userId: string, formData: FormData) {
  const actor = await requireAdmin();

  const parsed = editMemberSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    department: formData.get("department") || undefined,
  });
  if (!parsed.success) {
    redirect(`/admin/users?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`);
  }
  const { name, email, role, department: dept } = parsed.data;
  const department = dept ?? "general";

  const [before] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!before) redirect("/admin/users?error=User+not+found");

  if (email.toLowerCase() !== before.email.toLowerCase()) {
    const [conflict] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (conflict) {
      redirect(`/admin/users?error=${encodeURIComponent("That email is already in use by another account")}`);
    }
  }

  await db
    .update(users)
    .set({ name, email, role, department, updatedAt: new Date() })
    .where(eq(users.id, userId));

  await logAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "user_updated",
    entityType: "user",
    entityId: userId,
    metadata: {
      before: { name: before.name, email: before.email, role: before.role, department: before.department },
      after: { name, email, role, department },
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

export async function forcePasswordReset(userId: string, formData: FormData) {
  const actor = await requireAdmin();

  const password = z.string().min(8, "Password must be at least 8 characters").parse(formData.get("password"));
  const passwordHash = await hash(password, 10);

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
}
