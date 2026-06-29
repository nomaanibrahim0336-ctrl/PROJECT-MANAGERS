import { auth } from "@/auth";
import { db } from "@/db";
import { clients, serviceCatalog, tickets } from "@/db/schema";
import { canCreateTicket } from "@/lib/rbac";
import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { createTicket } from "../../tickets/actions";

const STATUS_LABELS: Record<string, string> = {
  in_progress: "In Progress",
  pending_pm_review: "Pending PM Review",
  pending_client_approval: "Pending Client Approval",
  revision_required: "Revision Required",
  approved: "Approved",
};

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const role = session!.user.role;

  const [client] = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  if (!client) notFound();

  const clientTickets = await db
    .select()
    .from(tickets)
    .where(eq(tickets.clientId, id))
    .orderBy(desc(tickets.createdAt));

  const services = await db.select().from(serviceCatalog).orderBy(serviceCatalog.name);

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-8">
      <div className="surface-card p-6">
        <h1 className="mb-2 text-[18px] font-semibold text-(--color-ink)">{client.companyOrName}</h1>
        <p className="text-sm text-(--color-slate)">{client.email}</p>
        <p className="text-sm text-(--color-slate)">{client.phone}</p>
        {client.notes && <p className="mt-4 text-sm text-(--color-ink)">{client.notes}</p>}
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-(--color-ink)">
          All Active Services for {client.companyOrName}
        </h2>
        <ul className="space-y-2">
          {clientTickets.map((ticket) => (
            <li key={ticket.id}>
              <a
                href={`/tickets/${ticket.id}`}
                className="surface-card flex items-center justify-between p-4 text-sm"
              >
                <span className="font-medium text-(--color-ink)">{ticket.serviceName}</span>
                <span className="text-xs text-(--color-slate)">
                  {STATUS_LABELS[ticket.status]} · V{ticket.revisionNumber}
                </span>
              </a>
            </li>
          ))}
          {clientTickets.length === 0 && (
            <p className="text-sm text-(--color-slate)">No services yet for this client.</p>
          )}
        </ul>
      </section>

      {canCreateTicket(role as never) && (
        <section className="surface-card space-y-3 p-6">
          <h2 className="text-sm font-semibold text-(--color-ink)">+ Add New Service</h2>
          <form action={createTicket} className="space-y-2">
            <input type="hidden" name="clientId" value={client.id} />
            <select name="serviceCatalogId" required className="field-input block w-full">
              <option value="">Select a service from the catalog...</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
            <select name="department" required className="field-input block w-full">
              <option value="publishing">Publishing</option>
              <option value="design">Design</option>
              <option value="development">Development</option>
              <option value="marketing">Marketing</option>
              <option value="general">General</option>
            </select>
            <textarea
              name="brief"
              placeholder="Brief / instructions for the team"
              required
              className="field-input block w-full"
              rows={3}
            />
            <input type="date" name="deadline" className="field-input block w-full" />
            <button className="btn-primary">Create</button>
          </form>
        </section>
      )}
    </div>
  );
}
