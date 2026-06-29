import { auth } from "@/auth";
import { db } from "@/db";
import { clients, deliverables, ticketClientFeedback, ticketInternalComments, tickets, users } from "@/db/schema";
import { canForwardOrAssignRevision, canMarkReadyForReview } from "@/lib/rbac";
import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import {
  addInternalComment,
  assignRevision,
  forwardToClient,
  markReadyForReview,
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
  approved: "bg-green-100 text-green-800",
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
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-gray-900">{ticket.serviceName}</h1>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[ticket.status]}`}>
            {STATUS_LABELS[ticket.status]}
          </span>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
            V{ticket.revisionNumber}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Client:{" "}
          <a href={`/clients/${ticket.clientId}`} className="underline">
            {client?.companyOrName}
          </a>{" "}
          · Department: {ticket.department}
          {ticket.deadline && ` · Deadline: ${new Date(ticket.deadline).toLocaleDateString()}`}
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Client approval link: /portal/ticket/{ticket.clientAccessToken}
        </p>
      </div>

      {/* Zone 2: Brief */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-700">Brief</h2>
        <p className="whitespace-pre-wrap rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800">
          {ticket.brief}
        </p>
      </section>

      {/* Zone 3: Deliverable History */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-700">Deliverable History</h2>
        <ul className="space-y-2">
          {ticketDeliverables.map(({ deliverable, uploaderName }) => (
            <li key={deliverable.id} className="rounded-md border border-gray-200 p-3 text-sm">
              <div className="flex justify-between text-xs text-gray-500">
                <span>
                  {uploaderName} · V{deliverable.revisionNumber} · {deliverable.kind}
                </span>
                <span>{new Date(deliverable.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-gray-800">{deliverable.content}</p>
            </li>
          ))}
          {ticketDeliverables.length === 0 && (
            <p className="text-sm text-gray-400">No deliverables uploaded yet.</p>
          )}
        </ul>
      </section>

      {/* Zone 4: Internal Chat (PM + Team only, not client) */}
      {role !== "client" && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Internal Chat (not visible to client)</h2>
          <ul className="space-y-2">
            {internalComments.map(({ comment, authorName }) => (
              <li
                key={comment.id}
                className={`rounded-md border p-3 text-sm ${
                  comment.isRevisionInstruction ? "border-amber-300 bg-amber-50" : "border-gray-200"
                }`}
              >
                <div className="flex justify-between text-xs text-gray-500">
                  <span>
                    {authorName} · V{comment.revisionNumber}
                    {comment.isRevisionInstruction && " · Revision Instructions"}
                  </span>
                  <span>{new Date(comment.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-gray-800">{comment.body}</p>
              </li>
            ))}
            {internalComments.length === 0 && (
              <p className="text-sm text-gray-400">No internal comments yet.</p>
            )}
          </ul>
          <form action={addInternalComment.bind(null, ticket.id)} className="mt-3 flex gap-2">
            <input
              name="body"
              placeholder="Write an internal comment..."
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <button className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white">
              Post
            </button>
          </form>
        </section>
      )}

      {/* Zone 5: Client Feedback Board */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-700">Client Feedback</h2>
        <ul className="space-y-2">
          {clientFeedback.map((feedback) => (
            <li key={feedback.id} className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
              <div className="flex justify-between text-xs text-gray-500">
                <span>V{feedback.revisionNumber}</span>
                <span>{new Date(feedback.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-gray-800">{feedback.body}</p>
            </li>
          ))}
          {clientFeedback.length === 0 && (
            <p className="text-sm text-gray-400">No client feedback yet.</p>
          )}
        </ul>
      </section>

      {/* Zone 6: Action Buttons */}
      <section className="border-t border-gray-200 pt-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Actions</h2>

        {ticket.status === "in_progress" && canMarkReadyForReview(role as never) && (
          <form action={markReadyForReview.bind(null, ticket.id)} className="space-y-2">
            <select name="kind" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="link">Staging / File Link</option>
              <option value="file">File</option>
              <option value="data">Data Fields</option>
            </select>
            <input
              name="content"
              placeholder="Paste deliverable link or notes"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <button className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white">
              Mark as Ready for PM Review
            </button>
          </form>
        )}

        {ticket.status === "pending_pm_review" && canForwardOrAssignRevision(role as never) && (
          <form action={forwardToClient.bind(null, ticket.id)}>
            <button className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white">
              Forward to Client for Approval
            </button>
          </form>
        )}

        {ticket.status === "pending_client_approval" && (
          <p className="text-sm text-gray-500">
            Waiting on the client. All internal actions are disabled until they respond.
          </p>
        )}

        {ticket.status === "revision_required" && canForwardOrAssignRevision(role as never) && (
          <form action={assignRevision.bind(null, ticket.id)} className="space-y-2">
            <textarea
              name="instructions"
              placeholder="Internal technical instructions for the team"
              required
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              rows={3}
            />
            <button className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white">
              Assign Revision to Team
            </button>
          </form>
        )}

        {ticket.status === "approved" && (
          <p className="text-sm text-green-700">This service has been approved by the client.</p>
        )}
      </section>
    </div>
  );
}
