import { auth } from "@/auth";
import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { canViewAuditLogs } from "@/lib/rbac";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ actorId?: string; action?: string; from?: string; to?: string }>;
}) {
  const session = await auth();
  if (!session?.user || !canViewAuditLogs(session.user.role as never)) {
    redirect("/");
  }

  const { actorId, action, from, to } = await searchParams;

  const conditions = [];
  if (actorId) conditions.push(eq(auditLogs.actorId, actorId));
  if (action) conditions.push(eq(auditLogs.action, action));
  if (from) conditions.push(gte(auditLogs.createdAt, new Date(from)));
  if (to) conditions.push(lte(auditLogs.createdAt, new Date(to)));

  const logs = await db
    .select()
    .from(auditLogs)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(200);

  const allUsers = await db.select({ id: users.id, name: users.name }).from(users).orderBy(users.name);

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-8">
      <div>
        <h1 className="text-[18px] font-semibold text-(--color-ink)">Audit Log</h1>
        <p className="text-sm text-(--color-slate)">
          Login attempts, permission changes, and CRUD actions across the system. Showing the
          latest 200 matching entries. Logs are retained indefinitely in the database (no
          automatic 90-day purge job is configured yet).
        </p>
      </div>

      <form className="surface-card grid grid-cols-4 gap-3 p-4">
        <select name="actorId" defaultValue={actorId ?? ""} className="field-input">
          <option value="">All users</option>
          {allUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <input
          name="action"
          placeholder="Action type (e.g. login_failed)"
          defaultValue={action ?? ""}
          className="field-input"
        />
        <input type="date" name="from" defaultValue={from ?? ""} className="field-input" />
        <input type="date" name="to" defaultValue={to ?? ""} className="field-input" />
        <button className="btn-primary col-span-4">Filter</button>
      </form>

      <div className="surface-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-(--color-border) text-left text-(--color-slate)">
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Actor</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Entity</th>
              <th className="px-4 py-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-(--color-border) last:border-0 align-top">
                <td className="px-4 py-3 whitespace-nowrap text-(--color-slate)">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-(--color-ink)">{log.actorEmail ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className="badge bg-[#EEF1F6] text-(--color-slate)">{log.action}</span>
                </td>
                <td className="px-4 py-3 text-(--color-slate)">
                  {log.entityType}
                  {log.entityId && ` · ${log.entityId.slice(0, 8)}`}
                </td>
                <td className="px-4 py-3 text-xs text-(--color-slate)">{log.metadata}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-(--color-slate)">
                  No matching log entries.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
