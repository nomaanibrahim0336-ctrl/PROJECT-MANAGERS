import { db } from "@/db";
import { clients, deliverables, tickets } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { clientApprove, clientRequestChanges } from "../../../(app)/tickets/actions";

const STATUS_LABELS: Record<string, string> = {
  in_progress: "In Progress",
  pending_pm_review: "Pending PM Review",
  pending_client_approval: "Pending Your Approval",
  revision_required: "Revision Requested",
  approved: "Approved",
};

export default async function ClientTicketPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const [ticket] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.clientAccessToken, token))
    .limit(1);
  if (!ticket) notFound();

  const [client] = await db.select().from(clients).where(eq(clients.id, ticket.clientId)).limit(1);

  const ticketDeliverables = await db
    .select()
    .from(deliverables)
    .where(eq(deliverables.ticketId, ticket.id))
    .orderBy(desc(deliverables.createdAt));

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{ticket.serviceName}</h1>
        <p className="text-sm text-gray-500">
          {client?.companyOrName} · {STATUS_LABELS[ticket.status]} · Revision V{ticket.revisionNumber}
        </p>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-700">Latest Deliverable</h2>
        <ul className="space-y-2">
          {ticketDeliverables.map((deliverable) => (
            <li key={deliverable.id} className="rounded-md border border-gray-200 p-3 text-sm">
              <div className="text-xs text-gray-500">
                V{deliverable.revisionNumber} · {new Date(deliverable.createdAt).toLocaleString()}
              </div>
              <p className="mt-1 text-gray-800">{deliverable.content}</p>
            </li>
          ))}
          {ticketDeliverables.length === 0 && (
            <p className="text-sm text-gray-400">Nothing has been shared yet.</p>
          )}
        </ul>
      </section>

      {ticket.status === "pending_client_approval" ? (
        <section className="flex flex-col gap-3 border-t border-gray-200 pt-6">
          <form action={clientApprove.bind(null, token)}>
            <button className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white">
              Approve
            </button>
          </form>
          <form action={clientRequestChanges.bind(null, token)} className="space-y-2">
            <textarea
              name="feedback"
              placeholder="Describe the changes you'd like..."
              required
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              rows={3}
            />
            <button className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white">
              Request Changes
            </button>
          </form>
        </section>
      ) : (
        <p className="border-t border-gray-200 pt-6 text-sm text-gray-500">
          {ticket.status === "approved"
            ? "You've approved this. Thank you!"
            : "This is currently being worked on. You'll be notified when it's ready for your review."}
        </p>
      )}
    </div>
  );
}
