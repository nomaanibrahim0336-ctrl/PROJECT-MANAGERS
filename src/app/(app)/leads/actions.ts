"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import {
  clients,
  leads,
  type leadStatusEnum,
} from "@/db/schema";
import { canManageLeads } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const createLeadSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  source: z.string().optional(),
  serviceCatalogIds: z.array(z.string().uuid()).min(1, "Select at least one service"),
  notes: z.string().optional(),
});

export async function createLead(formData: FormData) {
  const session = await auth();
  if (!session?.user || !canManageLeads(session.user.role as never)) {
    throw new Error("Forbidden");
  }

  const parsed = createLeadSchema.parse({
    name: formData.get("name"),
    email: formData.get("email") || "",
    phone: formData.get("phone") || undefined,
    source: formData.get("source") || undefined,
    serviceCatalogIds: formData.getAll("serviceCatalogIds"),
    notes: formData.get("notes") || undefined,
  });

  const [lead] = await db
    .insert(leads)
    .values({
      name: parsed.name,
      email: parsed.email || null,
      phone: parsed.phone,
      source: parsed.source,
      serviceCatalogIds: parsed.serviceCatalogIds,
      notes: parsed.notes,
      assignedManagerId: session.user.id,
    })
    .returning();

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "lead_created",
    entityType: "lead",
    entityId: lead.id,
  });

  revalidatePath("/leads");
}

export async function updateLeadStatus(leadId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user || !canManageLeads(session.user.role as never)) {
    throw new Error("Forbidden");
  }

  const status = formData.get("status") as (typeof leadStatusEnum.enumValues)[number];

  await db
    .update(leads)
    .set({ status, updatedAt: new Date() })
    .where(eq(leads.id, leadId));

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "lead_status_updated",
    entityType: "lead",
    entityId: leadId,
    metadata: { status },
  });

  revalidatePath("/leads");
}

export async function convertLeadToClient(leadId: string) {
  const session = await auth();
  if (!session?.user || !canManageLeads(session.user.role as never)) {
    throw new Error("Forbidden");
  }

  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead) throw new Error("Lead not found");

  const [client] = await db
    .insert(clients)
    .values({
      companyOrName: lead.name,
      email: lead.email,
      phone: lead.phone,
      notes: lead.notes,
      sourceLeadId: lead.id,
      servicesEngagedIds: lead.serviceCatalogIds,
    })
    .returning();

  await db
    .update(leads)
    .set({ status: "converted", convertedClientId: client.id, updatedAt: new Date() })
    .where(eq(leads.id, leadId));

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "lead_converted_to_client",
    entityType: "client",
    entityId: client.id,
    metadata: { leadId },
  });

  revalidatePath("/leads");
  redirect(`/clients/${client.id}`);
}
