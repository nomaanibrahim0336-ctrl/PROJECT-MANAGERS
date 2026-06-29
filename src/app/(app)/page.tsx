import { auth } from "@/auth";
import { db } from "@/db";
import { clients, leads, tickets } from "@/db/schema";
import { avg, count, eq, ne, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (session?.user?.role === "project_manager") redirect("/pm");
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

  const maxBar = Math.max(1, ...revisionsByClient.map((r) => Number(r.maxRevisions)));

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-8">
      <div>
        <p className="text-sm font-medium text-(--color-slate)">Overview</p>
        <h1 className="text-[18px] font-semibold text-(--color-ink)">
          Welcome, {session?.user?.name}
        </h1>
        <p className="text-sm text-(--color-slate)">Role: {session?.user?.role}</p>
      </div>

      <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
        <div className="kpi-card md:col-span-2 md:row-span-1">
          <div className="relative z-10 flex items-center gap-2 text-sm font-medium text-white/80">
            <ClientsIcon /> Total Clients
          </div>
          <p className="kpi-glow-text relative z-10 mt-3 text-[32px] font-bold text-white">
            {clientCount}
          </p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-2 text-sm font-medium text-(--color-slate)">
            <LeadsIcon /> Total Leads
          </div>
          <p className="mt-3 text-[32px] font-bold text-(--color-ink)">{leadCount}</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-2 text-sm font-medium text-(--color-slate)">
            <ServicesIcon /> Active Services
          </div>
          <p className="text-gradient-hero mt-3 text-[32px] font-bold">{activeTicketCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="metric-card">
          <div className="flex items-center gap-2 text-sm font-medium text-(--color-slate)">
            <ClockIcon /> Pending PM Review
          </div>
          <p className="mt-3 text-[32px] font-bold text-(--color-ink)">{pendingPmCount}</p>
        </div>
        <div className="metric-card">
          <div className="flex items-center gap-2 text-sm font-medium text-(--color-slate)">
            <ClockIcon /> Pending Client Approval
          </div>
          <p className="mt-3 text-[32px] font-bold text-(--color-ink)">{pendingClientCount}</p>
        </div>
      </div>

      <section className="surface-card p-6">
        <h2 className="mb-5 text-[18px] font-semibold text-(--color-ink)">
          Most Revisions by Client
        </h2>
        <ul className="space-y-4">
          {revisionsByClient.map((row) => {
            const widthPct = (Number(row.maxRevisions) / maxBar) * 100;
            return (
              <li key={row.clientName} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-(--color-ink)">{row.clientName}</span>
                  <span className="text-(--color-slate)">
                    avg {Number(row.avgRevisions).toFixed(1)} · max V{row.maxRevisions}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#E2E8F0]">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-(--color-navy) to-(--color-cobalt)"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </li>
            );
          })}
          {revisionsByClient.length === 0 && (
            <p className="text-sm text-(--color-slate)">No services created yet.</p>
          )}
        </ul>
      </section>
    </div>
  );
}

function ClientsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LeadsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 12l18-9-9 18-2-7-7-2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ServicesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
