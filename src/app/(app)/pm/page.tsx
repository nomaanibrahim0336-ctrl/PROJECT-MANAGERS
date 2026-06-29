import { auth } from "@/auth";
import { db } from "@/db";
import { clients, leads, tickets, users } from "@/db/schema";
import { canViewPmPanel } from "@/lib/rbac";
import { and, count, eq, isNull, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";

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

export default async function PmPanelPage() {
  const session = await auth();
  if (!session?.user || !canViewPmPanel(session.user.role as never)) redirect("/");

  const myId = session.user.id;

  const [myOpenCount] = await db
    .select({ value: count() })
    .from(tickets)
    .where(and(eq(tickets.createdByPmId, myId), ne(tickets.status, "approved")));

  const [needsReviewCount] = await db
    .select({ value: count() })
    .from(tickets)
    .where(and(eq(tickets.createdByPmId, myId), eq(tickets.status, "pending_pm_review")));

  const [myLeadCount] = await db
    .select({ value: count() })
    .from(leads)
    .where(eq(leads.assignedManagerId, myId));

  const myTickets = await db
    .select({
      id: tickets.id,
      serviceName: tickets.serviceName,
      status: tickets.status,
      revisionNumber: tickets.revisionNumber,
      deadline: tickets.deadline,
      clientName: clients.companyOrName,
      clientId: clients.id,
      assigneeName: users.name,
    })
    .from(tickets)
    .leftJoin(clients, eq(tickets.clientId, clients.id))
    .leftJoin(users, eq(tickets.assignedToId, users.id))
    .where(and(eq(tickets.createdByPmId, myId), ne(tickets.status, "approved")))
    .orderBy(tickets.updatedAt);

  const myLeads = await db
    .select()
    .from(leads)
    .where(and(eq(leads.assignedManagerId, myId), ne(leads.status, "converted")))
    .orderBy(leads.createdAt)
    .limit(10);

  const myTeamMembers = await db
    .select({ id: users.id, name: users.name, department: users.department, status: users.status })
    .from(users)
    .where(and(isNull(users.deletedAt), eq(users.role, "team_member"), eq(users.status, "active")))
    .orderBy(users.department, users.name);

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-8">
      <div>
        <p className="text-sm font-medium text-(--color-slate)">Project Manager Panel</p>
        <h1 className="text-[18px] font-semibold text-(--color-ink)">
          Welcome, {session.user.name}
        </h1>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-3 gap-5">
        <div className="kpi-card">
          <p className="relative z-10 text-sm font-medium text-white/80">My Open Tickets</p>
          <p className="kpi-glow-text relative z-10 mt-3 text-[32px] font-bold text-white">
            {myOpenCount.value}
          </p>
        </div>
        <div className="metric-card">
          <p className="text-sm font-medium text-(--color-slate)">Needs My Review</p>
          <p className="mt-3 text-[32px] font-bold text-(--color-ink)">{needsReviewCount.value}</p>
        </div>
        <div className="metric-card">
          <p className="text-sm font-medium text-(--color-slate)">My Active Leads</p>
          <p className="text-gradient-hero mt-3 text-[32px] font-bold">{myLeadCount.value}</p>
        </div>
      </div>

      {/* Active Tickets */}
      <section className="surface-card overflow-hidden">
        <div className="border-b border-(--color-border) px-6 py-4">
          <h2 className="text-sm font-semibold text-(--color-ink)">My Active Tickets</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-(--color-border) text-left text-(--color-slate)">
              <th className="px-6 py-3 font-medium">Service</th>
              <th className="px-6 py-3 font-medium">Client</th>
              <th className="px-6 py-3 font-medium">Assigned To</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Deadline</th>
            </tr>
          </thead>
          <tbody>
            {myTickets.map((ticket) => (
              <tr key={ticket.id} className="border-b border-(--color-border) last:border-0">
                <td className="px-6 py-3">
                  <Link
                    href={`/tickets/${ticket.id}`}
                    className="font-medium text-(--color-cobalt) hover:underline"
                  >
                    {ticket.serviceName}
                  </Link>
                  <span className="ml-2 text-xs text-(--color-slate)">V{ticket.revisionNumber}</span>
                </td>
                <td className="px-6 py-3 text-(--color-slate)">
                  <Link href={`/clients/${ticket.clientId}`} className="hover:underline">
                    {ticket.clientName}
                  </Link>
                </td>
                <td className="px-6 py-3 text-(--color-slate)">
                  {ticket.assigneeName ?? <span className="italic text-(--color-slate)/60">Unassigned</span>}
                </td>
                <td className="px-6 py-3">
                  <span className={`badge ${STATUS_COLORS[ticket.status]}`}>
                    {STATUS_LABELS[ticket.status]}
                  </span>
                </td>
                <td className="px-6 py-3 text-(--color-slate)">
                  {ticket.deadline
                    ? new Date(ticket.deadline).toLocaleDateString()
                    : "—"}
                </td>
              </tr>
            ))}
            {myTickets.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-6 text-center text-(--color-slate)">
                  No active tickets yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* My Leads */}
        <section className="surface-card overflow-hidden">
          <div className="border-b border-(--color-border) px-6 py-4">
            <h2 className="text-sm font-semibold text-(--color-ink)">My Active Leads</h2>
          </div>
          <ul className="divide-y divide-(--color-border)">
            {myLeads.map((lead) => (
              <li key={lead.id} className="flex items-center justify-between px-6 py-3 text-sm">
                <span className="font-medium text-(--color-ink)">{lead.name}</span>
                <span className="badge bg-[#EEF1F6] text-(--color-slate)">{lead.status}</span>
              </li>
            ))}
            {myLeads.length === 0 && (
              <li className="px-6 py-4 text-sm text-(--color-slate)">No leads assigned yet.</li>
            )}
          </ul>
          <div className="border-t border-(--color-border) px-6 py-3">
            <Link href="/leads" className="text-xs text-(--color-cobalt) hover:underline">
              View all leads →
            </Link>
          </div>
        </section>

        {/* Team Members */}
        <section className="surface-card overflow-hidden">
          <div className="border-b border-(--color-border) px-6 py-4">
            <h2 className="text-sm font-semibold text-(--color-ink)">Team Members</h2>
          </div>
          <ul className="divide-y divide-(--color-border)">
            {myTeamMembers.map((member) => (
              <li key={member.id} className="flex items-center justify-between px-6 py-3 text-sm">
                <span className="font-medium text-(--color-ink)">{member.name}</span>
                <span className="badge bg-[#EEF1F6] text-(--color-slate) capitalize">
                  {member.department}
                </span>
              </li>
            ))}
            {myTeamMembers.length === 0 && (
              <li className="px-6 py-4 text-sm text-(--color-slate)">
                No active team members yet.
              </li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
