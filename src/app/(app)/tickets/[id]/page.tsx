import { auth } from "@/auth";
import { db } from "@/db";
import { clients, deliverables, ticketClientFeedback, ticketInternalComments, tickets, users } from "@/db/schema";
import { canCreateTicket, canForwardOrAssignRevision, canMarkReadyForReview } from "@/lib/rbac";
import { and, desc, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import {
  addInternalComment,
  assignRevision,
  forwardToClient,
  markReadyForReview,
  reassignTicket,
} from "../actions";

const STATUS_LABELS: Record<string, string> = {
  in_progress: "In Progress",
  pending_pm_review: "Pending PM Review",
  pending_client_approval: "Pending Client Approval",
  revision_required: "Revision Required",
  approved: "Approved",
};

const STATUS_COLORS: Record<string, string> = {
  in_progress: "bg-blue-100 text-blue-800",
  pending_pm_review: "bg-amber-100 text-amber-800",
  pending_client_approval: "bg-purple-100 text-purple-800",
  revision_required: "bg-red-100 text-red-800",
  approved: "badge-positive",
};

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const role = session!.user.role;

  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
  if (!ticket) notFound();

  const [client] = await db.select().from(clients).where(eq(clients.id, ticket.clientId)).limit(1);

  const [assignee] = ticket.assignedToId
    ? await db.select({ name: users.name }).from(users).where(eq(users.id, ticket.assignedToId)).limit(1)
    : [];

  const teamMembers = canCreateTicket(role as never)
    ? await db
        .select({ id: users.id, name: users.name, department: users.department })
        .from(users)
        .where(and(isNull(users.deletedAt), eq(users.status, "active")))
        .orderBy(users.department, users.name)
    : [];

  const ticketDeliverables = await db
    .select({ deliverable: deliverables, uploaderName: users.name })
    .from(deliverables)
    .leftJoin(users, eq(deliverables.uploaderId, users.id))
    .where(eq(deliverables.ticketId, id))
    .orderBy(desc(deliverables.createdAt));

  const internalComments = await db
    .select({ comment: ticketInternalComments, authorName: users.name })
    .from(ticketInternalComments)
    .leftJoin(users, eq(ticketInternalComments.authorId, users.id))
    .where(eq(ticketInternalComments.ticketId, id))
    .orderBy(desc(ticketInternalComments.createdAt));

  const clientFeedback = await db
    .select()
    .from(ticketClientFeedback)
    .where(eq(ticketClientFeedback.ticketId, id))
    .orderBy(desc(ticketClientFeedback.createdAt));

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-8">
      {/* Zone 1: Header */}
      <div className="surface-card p-6">
        <div className="flex items-center gap-3">
          <h1 className="text-[18px] font-semibold text-(--color-ink)">{ticket.serviceName}</h1>
          <span className={`badge ${STATUS_COLORS[ticket.status]}`}>
            {STATUS_LABELS[ticket.status]}
          </span>
          <span className="badge bg-[#EEF1F6] text-(--color-slate)">V{ticket.revisionNumber}</span>
        </div>
        <p className="mt-1 text-sm text-(--color-slate)">
          Client:{" "}
          <a href={`/clients/${ticket.clientId}`} className="text-(--color-cobalt) hover:underline">
            {client?.companyOrName}
          </a>{" "}
          · Department: {ticket.department}
          {ticket.deadline && ` · Deadline: ${new Date(ticket.deadline).toLocaleDateString()}`}
        </p>
        <p className="mt-1 text-xs text-(--color-slate)">
          Client approval link: /portal/ticket/{ticket.clientAccessToken}
        </p>

        {canCreateTicket(role as never) ? (
          <form action={reassignTicket.bind(null, ticket.id)} className="mt-3 flex items-center gap-2">
            <label className="text-xs text-(--color-slate)">Assigned to:</label>
            <select
              name="assignedToId"
              defaultValue={ticket.assignedToId ?? ""}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              className="field-input py-1 text-xs"
            >
              <option value="">Unassigned</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} ({member.department})
                </option>
              ))}
            </select>
          </form>
        ) : (
          <p className="mt-2 text-xs text-(--color-slate)">
            Assigned to: {assignee?.name ?? "Unassigned"}
          </p>
        )}
      </div>

      {/* Zone 2: Brief */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-(--color-ink)">Brief</h2>
        <p className="surface-card whitespace-pre-wrap p-4 text-sm text-(--color-ink)">
          {ticket.brief}
        </p>
      </section>

      {/* Zone 3: Deliverable History */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-(--color-ink)">Deliverable History</h2>
        <ul className="space-y-2">
          {ticketDeliverables.map(({ deliverable, uploaderName }) => (
            <li key={deliverable.id} className="surface-card p-3 text-sm">
              <div className="flex justify-between text-xs text-(--color-slate)">
                <span>
                  {uploaderName} · V{deliverable.revisionNumber} · {deliverable.kind}
                </span>
                <span>{new Date(deliverable.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-(--color-ink)">{deliverable.content}</p>
            </li>
          ))}
          {ticketDeliverables.length === 0 && (
            <p className="text-sm text-(--color-slate)">No deliverables uploaded yet.</p>
          )}
        </ul>
      </section>

      {/* Zone 4: Internal Chat (PM + Team only, not client) */}
      {role !== "client" && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-(--color-ink)">Internal Chat (not visible to client)</h2>
          <ul className="space-y-2">
            {internalComments.map(({ comment, authorName }) => (
              <li
                key={comment.id}
                className={`surface-card p-3 text-sm ${
                  comment.isRevisionInstruction ? "border-amber-300 bg-amber-50" : ""
                }`}
              >
                <div className="flex justify-between text-xs text-(--color-slate)">
                  <span>
                    {authorName} · V{comment.revisionNumber}
                    {comment.isRevisionInstruction && " · Revision Instructions"}
                  </span>
                  <span>{new Date(comment.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-(--color-ink)">{comment.body}</p>
              </li>
            ))}
            {internalComments.length === 0 && (
              <p className="text-sm text-(--color-slate)">No internal comments yet.</p>
            )}
          </ul>
          <form action={addInternalComment.bind(null, ticket.id)} className="mt-3 flex gap-2">
            <input
              name="body"
              placeholder="Write an internal comment..."
              className="field-input flex-1"
            />
            <button className="btn-primary">Post</button>
          </form>
        </section>
      )}

      {/* Zone 5: Client Feedback Board */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-(--color-ink)">Client Feedback</h2>
        <ul className="space-y-2">
          {clientFeedback.map((feedback) => (
            <li key={feedback.id} className="surface-card p-3 text-sm">
              <div className="flex justify-between text-xs text-(--color-slate)">
                <span>V{feedback.revisionNumber}</span>
                <span>{new Date(feedback.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-(--color-ink)">{feedback.body}</p>
            </li>
          ))}
          {clientFeedback.length === 0 && (
            <p className="text-sm text-(--color-slate)">No client feedback yet.</p>
          )}
        </ul>
      </section>

      {/* Zone 6: Action Buttons */}
      <section className="surface-card space-y-3 p-6">
        <h2 className="text-sm font-semibold text-(--color-ink)">Actions</h2>

        {ticket.status === "in_progress" && canMarkReadyForReview(role as never) && (
          <form action={markReadyForReview.bind(null, ticket.id)} className="space-y-2">
            <select name="kind" className="field-input">
              <option value="link">Staging / File Link</option>
              <option value="file">File</option>
              <option value="data">Data Fields</option>
            </select>
            <input
              name="content"
              placeholder="Paste deliverable link or notes"
              className="field-input block w-full"
            />
            <button className="btn-primary">Mark as Ready for PM Review</button>
          </form>
        )}

        {ticket.status === "pending_pm_review" && canForwardOrAssignRevision(role as never) && (
          <form action={forwardToClient.bind(null, ticket.id)}>
            <button className="btn-primary">Forward to Client for Approval</button>
          </form>
        )}

        {ticket.status === "pending_client_approval" && (
          <p className="text-sm text-(--color-slate)">
            Waiting on the client. All internal actions are disabled until they respond.
          </p>
        )}

        {ticket.status === "revision_required" && canForwardOrAssignRevision(role as never) && (
          <form action={assignRevision.bind(null, ticket.id)} className="space-y-2">
            <textarea
              name="instructions"
              placeholder="Internal technical instructions for the team"
              required
              className="field-input block w-full"
              rows={3}
            />
            <button className="btn-primary">Assign Revision to Team</button>
          </form>
        )}

        {ticket.status === "approved" && (
          <p className="badge badge-positive">This service has been approved by the client.</p>
        )}
      </section>
    </div>
  );
}
