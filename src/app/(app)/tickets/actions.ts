"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import {
  deliverables,
  serviceCatalog,
  ticketClientFeedback,
  ticketInternalComments,
  tickets,
} from "@/db/schema";
import {
  canCreateTicket,
  canForwardOrAssignRevision,
  canMarkReadyForReview,
} from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const createTicketSchema = z.object({
  clientId: z.string().uuid(),
  serviceCatalogId: z.string().uuid(),
  department: z.enum(["publishing", "design", "development", "marketing", "general"]),
  assignedToId: z.string().uuid().optional(),
  brief: z.string().min(1),
  deadline: z.string().optional(),
});

export async function createTicket(formData: FormData) {
  const session = await auth();
  if (!session?.user || !canCreateTicket(session.user.role as never)) {
    throw new Error("Forbidden");
  }

  const parsed = createTicketSchema.parse({
    clientId: formData.get("clientId"),
    serviceCatalogId: formData.get("serviceCatalogId"),
    department: formData.get("department"),
    assignedToId: formData.get("assignedToId") || undefined,
    brief: formData.get("brief"),
    deadline: formData.get("deadline") || undefined,
  });

  const [service] = await db
    .select()
    .from(serviceCatalog)
    .where(eq(serviceCatalog.id, parsed.serviceCatalogId))
    .limit(1);
  if (!service) throw new Error("Service not found");

  const [ticket] = await db
    .insert(tickets)
    .values({
      clientId: parsed.clientId,
      serviceCatalogId: service.id,
      serviceName: service.name,
      department: parsed.department,
      assignedToId: parsed.assignedToId ?? null,
      brief: parsed.brief,
      deadline: parsed.deadline ? new Date(parsed.deadline) : null,
      createdByPmId: session.user.id,
    })
    .returning();

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "ticket_created",
    entityType: "ticket",
    entityId: ticket.id,
    metadata: { serviceName: service.name, clientId: parsed.clientId },
  });

  revalidatePath(`/clients/${parsed.clientId}`);
  redirect(`/tickets/${ticket.id}`);
}

export async function markReadyForReview(ticketId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user || !canMarkReadyForReview(session.user.role as never)) {
    throw new Error("Forbidden");
  }

  const content = z.string().min(1, "Deliverable content is required").parse(formData.get("content"));
  const kind = z.enum(["file", "link", "data"]).parse(formData.get("kind") || "link");

  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);
  if (!ticket) throw new Error("Ticket not found");

  await db.insert(deliverables).values({
    ticketId,
    uploaderId: session.user.id,
    kind,
    content,
    revisionNumber: ticket.revisionNumber,
  });

  await db
    .update(tickets)
    .set({ status: "pending_pm_review", updatedAt: new Date() })
    .where(eq(tickets.id, ticketId));

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "ticket_marked_ready",
    entityType: "ticket",
    entityId: ticketId,
  });

  revalidatePath(`/tickets/${ticketId}`);
}

export async function reassignTicket(ticketId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user || !canCreateTicket(session.user.role as never)) {
    throw new Error("Forbidden");
  }

  const assignedToId = (formData.get("assignedToId") as string) || null;

  await db.update(tickets).set({ assignedToId, updatedAt: new Date() }).where(eq(tickets.id, ticketId));

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "ticket_reassigned",
    entityType: "ticket",
    entityId: ticketId,
    metadata: { assignedToId },
  });

  revalidatePath(`/tickets/${ticketId}`);
}

export async function forwardToClient(ticketId: string) {
  const session = await auth();
  if (!session?.user || !canForwardOrAssignRevision(session.user.role as never)) {
    throw new Error("Forbidden");
  }

  await db
    .update(tickets)
    .set({ status: "pending_client_approval", updatedAt: new Date() })
    .where(eq(tickets.id, ticketId));

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "ticket_forwarded_to_client",
    entityType: "ticket",
    entityId: ticketId,
  });

  revalidatePath(`/tickets/${ticketId}`);
}

export async function assignRevision(ticketId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user || !canForwardOrAssignRevision(session.user.role as never)) {
    throw new Error("Forbidden");
  }

  const instructions = formData.get("instructions") as string;
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);
  if (!ticket) throw new Error("Ticket not found");

  const nextRevision = ticket.revisionNumber + 1;

  await db.insert(ticketInternalComments).values({
    ticketId,
    authorId: session.user.id,
    body: instructions,
    isRevisionInstruction: true,
    revisionNumber: nextRevision,
  });

  await db
    .update(tickets)
    .set({ status: "in_progress", revisionNumber: nextRevision, updatedAt: new Date() })
    .where(eq(tickets.id, ticketId));

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "ticket_revision_assigned",
    entityType: "ticket",
    entityId: ticketId,
    metadata: { revisionNumber: nextRevision },
  });

  revalidatePath(`/tickets/${ticketId}`);
}

export async function addInternalComment(ticketId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Forbidden");

  const body = formData.get("body") as string;
  if (!body) return;

  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);
  if (!ticket) throw new Error("Ticket not found");

  await db.insert(ticketInternalComments).values({
    ticketId,
    authorId: session.user.id,
    body,
    revisionNumber: ticket.revisionNumber,
  });

  revalidatePath(`/tickets/${ticketId}`);
}

export async function clientApprove(token: string) {
  const [ticket] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.clientAccessToken, token))
    .limit(1);
  if (!ticket) throw new Error("Ticket not found");

  await db
    .update(tickets)
    .set({ status: "approved", updatedAt: new Date() })
    .where(eq(tickets.id, ticket.id));

  await logAudit({
    action: "ticket_client_approved",
    entityType: "ticket",
    entityId: ticket.id,
  });

  revalidatePath(`/portal/ticket/${token}`);
}

export async function clientRequestChanges(token: string, formData: FormData) {
  const feedback = formData.get("feedback") as string;
  if (!feedback) throw new Error("Feedback is required");

  const [ticket] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.clientAccessToken, token))
    .limit(1);
  if (!ticket) throw new Error("Ticket not found");

  await db.insert(ticketClientFeedback).values({
    ticketId: ticket.id,
    body: feedback,
    revisionNumber: ticket.revisionNumber,
  });

  await db
    .update(tickets)
    .set({ status: "revision_required", updatedAt: new Date() })
    .where(eq(tickets.id, ticket.id));

  await logAudit({
    action: "ticket_client_requested_changes",
    entityType: "ticket",
    entityId: ticket.id,
  });

  revalidatePath(`/portal/ticket/${token}`);
}
