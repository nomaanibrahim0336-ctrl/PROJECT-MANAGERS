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
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] to-[#1E293B] p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="accent-bar rounded-full" />
        <div className="surface-card space-y-6 p-8">
          <div>
            <h1 className="text-[18px] font-semibold text-(--color-ink)">{ticket.serviceName}</h1>
            <p className="text-sm text-(--color-slate)">
              {client?.companyOrName} · {STATUS_LABELS[ticket.status]} · Revision V{ticket.revisionNumber}
            </p>
          </div>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-(--color-ink)">Latest Deliverable</h2>
            <ul className="space-y-2">
              {ticketDeliverables.map((deliverable) => (
                <li key={deliverable.id} className="rounded-xl border border-(--color-border) p-3 text-sm">
                  <div className="text-xs text-(--color-slate)">
                    V{deliverable.revisionNumber} · {new Date(deliverable.createdAt).toLocaleString()}
                  </div>
                  <p className="mt-1 text-(--color-ink)">{deliverable.content}</p>
                </li>
              ))}
              {ticketDeliverables.length === 0 && (
                <p className="text-sm text-(--color-slate)">Nothing has been shared yet.</p>
              )}
            </ul>
          </section>

          {ticket.status === "pending_client_approval" ? (
            <section className="flex flex-col gap-3 border-t border-(--color-border) pt-6">
              <form action={clientApprove.bind(null, token)}>
                <button className="btn-primary w-full bg-(--color-green)" style={{ background: "#10B981" }}>
                  Approve
                </button>
              </form>
              <form action={clientRequestChanges.bind(null, token)} className="space-y-2">
                <textarea
                  name="feedback"
                  placeholder="Describe the changes you'd like..."
                  required
                  className="field-input block w-full"
                  rows={3}
                />
                <button className="btn-primary w-full" style={{ background: "#EF4444" }}>
                  Request Changes
                </button>
              </form>
            </section>
          ) : (
            <p className="border-t border-(--color-border) pt-6 text-sm text-(--color-slate)">
              {ticket.status === "approved"
                ? "You've approved this. Thank you!"
                : "This is currently being worked on. You'll be notified when it's ready for your review."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
