"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { serviceCatalog } from "@/db/schema";
import { canManageServiceCatalog } from "@/lib/rbac";
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

  await db.insert(serviceCatalog).values({
    name: parsed.name,
    defaultDepartment: parsed.defaultDepartment,
    isCustom: true,
  });

  revalidatePath("/admin/services");
}
