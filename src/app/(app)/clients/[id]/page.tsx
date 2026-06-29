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
      <div>
        <h1 className="mb-2 text-2xl font-semibold text-gray-900">{client.companyOrName}</h1>
        <p className="text-sm text-gray-500">{client.email}</p>
        <p className="text-sm text-gray-500">{client.phone}</p>
        {client.notes && <p className="mt-4 text-sm text-gray-700">{client.notes}</p>}
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          All Active Services for {client.companyOrName}
        </h2>
        <ul className="space-y-2">
          {clientTickets.map((ticket) => (
            <li key={ticket.id}>
              <a
                href={`/tickets/${ticket.id}`}
                className="flex items-center justify-between rounded-md border border-gray-200 p-3 text-sm hover:bg-gray-50"
              >
                <span className="font-medium text-gray-900">{ticket.serviceName}</span>
                <span className="text-xs text-gray-500">
                  {STATUS_LABELS[ticket.status]} · V{ticket.revisionNumber}
                </span>
              </a>
            </li>
          ))}
          {clientTickets.length === 0 && (
            <p className="text-sm text-gray-400">No services yet for this client.</p>
          )}
        </ul>
      </section>

      {canCreateTicket(role as never) && (
        <section className="border-t border-gray-200 pt-6">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">+ Add New Service</h2>
          <form action={createTicket} className="space-y-2">
            <input type="hidden" name="clientId" value={client.id} />
            <select
              name="serviceCatalogId"
              required
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Select a service from the catalog...</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
            <select
              name="department"
              required
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
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
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              rows={3}
            />
            <input
              type="date"
              name="deadline"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <button className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white">
              Create
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
