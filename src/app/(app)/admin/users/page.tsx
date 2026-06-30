import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { canManageMembers } from "@/lib/rbac";
import { isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import {
  createMember,
  editMember,
  forcePasswordReset,
  setMemberStatus,
  softDeleteMember,
} from "./actions";

const ROLES = ["super_admin", "admin", "project_manager", "team_member", "client", "auditor"] as const;
const DEPARTMENTS = ["publishing", "design", "development", "marketing", "general"] as const;

export default async function UsersAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const session = await auth();
  if (!session?.user || !canManageMembers(session.user.role as never)) {
    redirect("/");
  }

  const { created } = await searchParams;

  const allUsers = await db.select().from(users).where(isNull(users.deletedAt)).orderBy(users.name);

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-8">
      <div>
        <h1 className="text-[18px] font-semibold text-(--color-ink)">Team Members</h1>
        <p className="text-sm text-(--color-slate)">
          Add, edit, suspend, or reset access for users. You set each member&apos;s password
          yourself when adding them or resetting access.
        </p>
      </div>

      {created && (
        <div className="surface-card border-l-4 border-(--color-cobalt) p-4 text-sm">
          <p className="text-(--color-ink)">
            Created <strong>{created}</strong>. Share the email and password you set with them.
          </p>
        </div>
      )}

      <section className="surface-card space-y-3 p-6">
        <h2 className="text-sm font-semibold text-(--color-ink)">+ Add Member</h2>
        <form action={createMember} className="grid grid-cols-2 gap-3">
          <input name="name" placeholder="Full name" required className="field-input" />
          <input name="email" type="email" placeholder="Email" required className="field-input" />
          <input
            name="password"
            type="password"
            placeholder="Password (min 8 characters)"
            required
            minLength={8}
            className="field-input"
          />
          <select name="role" required className="field-input">
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <select name="department" className="field-input col-span-2">
            <option value="">No specific department (e.g. PM/Admin)</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <button className="btn-primary col-span-2">Add Member</button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-(--color-ink)">All Members</h2>
        <ul className="space-y-3">
          {allUsers.map((user) => (
            <li key={user.id} className="surface-card space-y-3 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-(--color-ink)">
                    {user.name}{" "}
                    {user.id === session.user.id && (
                      <span className="text-xs text-(--color-slate)">(you)</span>
                    )}
                  </p>
                  <p className="text-xs text-(--color-slate)">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`badge ${user.status === "active" ? "badge-positive" : "badge-negative"}`}
                  >
                    {user.status}
                  </span>
                  <span className="text-xs text-(--color-slate)">
                    Last login:{" "}
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "never"}
                  </span>
                </div>
              </div>

              <form action={editMember.bind(null, user.id)} className="grid grid-cols-3 gap-2">
                <input name="name" defaultValue={user.name} className="field-input" />
                <input name="email" type="email" defaultValue={user.email} className="field-input" />
                <select name="role" defaultValue={user.role} className="field-input">
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
                <select name="department" defaultValue={user.department ?? ""} className="field-input col-span-3">
                  <option value="">No specific department</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <button className="btn-secondary col-span-3">Save Changes</button>
              </form>

              <div className="flex gap-2">
                <form action={setMemberStatus.bind(null, user.id, user.status === "active" ? "suspended" : "active")}>
                  <button className="btn-secondary text-xs" disabled={user.id === session.user.id}>
                    {user.status === "active" ? "Suspend" : "Activate"}
                  </button>
                </form>
                <form
                  action={forcePasswordReset.bind(null, user.id)}
                  className="flex items-center gap-2"
                >
                  <input
                    name="password"
                    type="password"
                    placeholder="New password"
                    required
                    minLength={8}
                    className="field-input py-1 text-xs"
                  />
                  <button className="btn-secondary text-xs">Set Password</button>
                </form>
                <form action={softDeleteMember.bind(null, user.id)}>
                  <button className="btn-secondary text-xs text-(--color-red)" disabled={user.id === session.user.id}>
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
