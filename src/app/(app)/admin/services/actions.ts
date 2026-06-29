"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { serviceCatalog } from "@/db/schema";
import { canManageServiceCatalog } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createServiceSchema = z.object({
  name: z.string().min(1),
  defaultDepartment: z.enum(["publishing", "design", "development", "marketing", "general"]),
});

export async function createCustomService(formData: FormData) {
  const session = await auth();
  if (!session?.user || !canManageServiceCatalog(session.user.role as never)) {
    throw new Error("Forbidden");
  }

  const parsed = createServiceSchema.parse({
    name: formData.get("name"),
    defaultDepartment: formData.get("defaultDepartment"),
  });

  const [created] = await db
    .insert(serviceCatalog)
    .values({
      name: parsed.name,
      defaultDepartment: parsed.defaultDepartment,
      isCustom: true,
    })
    .returning();

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "service_catalog_entry_created",
    entityType: "service_catalog",
    entityId: created.id,
    metadata: { name: created.name },
  });

  revalidatePath("/admin/services");
}
