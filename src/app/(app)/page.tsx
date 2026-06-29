import { auth } from "@/auth";
import { db } from "@/db";
import { clients, leads, tickets } from "@/db/schema";
import { avg, count, eq, ne, sql } from "drizzle-orm";

export default async function DashboardPage() {
  const session = await auth();
  const [{ value: leadCount }] = await db.select({ value: count() }).from(leads);
  const [{ value: clientCount }] = await db.select({ value: count() }).from(clients);
  const [{ value: activeTicketCount }] = await db
    .select({ value: count() })
    .from(tickets)
    .where(ne(tickets.status, "approved"));
  const [{ value: pendingPmCount }] = await db
    .select({ value: count() })
    .from(tickets)
    .where(eq(tickets.status, "pending_pm_review"));
  const [{ value: pendingClientCount }] = await db
    .select({ value: count() })
    .from(tickets)
    .where(eq(tickets.status, "pending_client_approval"));

  const revisionsByClient = await db
    .select({
      clientName: clients.companyOrName,
      avgRevisions: avg(tickets.revisionNumber),
      maxRevisions: sql<number>`max(${tickets.revisionNumber})`,
    })
    .from(tickets)
    .innerJoin(clients, eq(tickets.clientId, clients.id))
    .groupBy(clients.id, clients.companyOrName)
    .orderBy(sql`max(${tickets.revisionNumber}) desc`)
    .limit(5);

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-8">
      <div>
        <h1 className="mb-1 text-2xl font-semibold text-gray-900">
          Welcome, {session?.user?.name}
        </h1>
        <p className="text-sm text-gray-500">Role: {session?.user?.role}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">Total Clients</p>
          <p className="text-3xl font-semibold text-gray-900">{clientCount}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">Total Leads</p>
          <p className="text-3xl font-semibold text-gray-900">{leadCount}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">Active Services</p>
          <p className="text-3xl font-semibold text-gray-900">{activeTicketCount}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">Pending PM / Client</p>
          <p className="text-3xl font-semibold text-gray-900">
            {pendingPmCount} / {pendingClientCount}
          </p>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Most Revisions by Client</h2>
        <ul className="space-y-2">
          {revisionsByClient.map((row) => (
            <li
              key={row.clientName}
              className="flex justify-between rounded-md border border-gray-200 bg-white p-3 text-sm"
            >
              <span className="text-gray-900">{row.clientName}</span>
              <span className="text-gray-500">
                avg {Number(row.avgRevisions).toFixed(1)} revisions (max V{row.maxRevisions})
              </span>
            </li>
          ))}
          {revisionsByClient.length === 0 && (
            <p className="text-sm text-gray-400">No services created yet.</p>
          )}
        </ul>
      </section>
    </div>
  );
}
