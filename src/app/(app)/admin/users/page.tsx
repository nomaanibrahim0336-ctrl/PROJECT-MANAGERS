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

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  project_manager: "Project Manager",
  team_member: "Team Member",
  client: "Client",
  auditor: "Auditor",
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-800",
  admin: "bg-blue-100 text-blue-800",
  project_manager: "bg-cyan-100 text-cyan-800",
  team_member: "bg-slate-100 text-slate-700",
  client: "bg-amber-100 text-amber-800",
  auditor: "bg-green-100 text-green-800",
};

export default async function UsersAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; error?: string; edit?: string }>;
}) {
  const session = await auth();
  if (!session?.user || !canManageMembers(session.user.role as never)) {
    redirect("/");
  }

  const { created, error, edit } = await searchParams;

  const allUsers = await db.select().from(users).where(isNull(users.deletedAt)).orderBy(users.name);

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-8">
      <div>
        <h1 className="text-[18px] font-semibold text-(--color-ink)">Team Members</h1>
        <p className="text-sm text-(--color-slate)">
          Manage all members — edit details, reset passwords, suspend or remove access.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {created && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          Member <strong>{created}</strong> created. Share their email and password with them.
        </div>
      )}

      {/* Add Member */}
      <section className="surface-card p-6">
        <h2 className="mb-4 text-sm font-semibold text-(--color-ink)">+ Add New Member</h2>
        <form action={createMember} className="grid grid-cols-2 gap-3">
          <input name="name" placeholder="Full name" required className="field-input" />
          <input name="email" type="email" placeholder="Email address" required className="field-input" />
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
              <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
            ))}
          </select>
          <select name="department" className="field-input col-span-2">
            <option value="">No specific department (e.g. Admin / PM)</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
            ))}
          </select>
          <button className="btn-primary col-span-2">Add Member</button>
        </form>
      </section>

      {/* Members List */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-(--color-ink)">
            All Members <span className="ml-1 text-(--color-slate)">({allUsers.length})</span>
          </h2>
        </div>

        <div className="overflow-hidden rounded-xl border border-(--color-border) bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-(--color-border) bg-[#F8FAFC]">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-(--color-slate)">Member</th>
                <th className="px-4 py-3 text-left font-medium text-(--color-slate)">Role</th>
                <th className="px-4 py-3 text-left font-medium text-(--color-slate)">Department</th>
                <th className="px-4 py-3 text-left font-medium text-(--color-slate)">Status</th>
                <th className="px-4 py-3 text-left font-medium text-(--color-slate)">Last Login</th>
                <th className="px-4 py-3 text-right font-medium text-(--color-slate)">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--color-border)">
              {allUsers.map((user) => {
                const isSelf = user.id === session.user.id;
                const isEditing = edit === user.id;
                return (
                  <tr key={user.id} className={isEditing ? "bg-blue-50" : "hover:bg-[#F8FAFC]"}>
                    {isEditing ? (
                      <td colSpan={6} className="p-4">
                        <form action={editMember.bind(null, user.id)} className="space-y-3">
                          <p className="text-xs font-semibold text-(--color-slate) uppercase tracking-wide">
                            Editing: {user.name}
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            <input name="name" defaultValue={user.name} placeholder="Full name" required className="field-input" />
                            <input name="email" type="email" defaultValue={user.email} placeholder="Email" required className="field-input" />
                            <select name="role" defaultValue={user.role} className="field-input">
                              {ROLES.map((r) => (
                                <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                              ))}
                            </select>
                            <select name="department" defaultValue={user.department ?? ""} className="field-input">
                              <option value="">No specific department</option>
                              {DEPARTMENTS.map((d) => (
                                <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <button className="btn-primary text-sm">Save Changes</button>
                            <a href="/admin/users" className="btn-secondary text-sm">Cancel</a>
                          </div>
                        </form>

                        <div className="mt-4 border-t border-(--color-border) pt-4 flex flex-wrap gap-3 items-center">
                          <span className="text-xs font-medium text-(--color-slate)">Password:</span>
                          <form action={forcePasswordReset.bind(null, user.id)} className="flex items-center gap-2">
                            <input
                              name="password"
                              type="password"
                              placeholder="New password (min 8 chars)"
                              required
                              minLength={8}
                              className="field-input py-1 text-xs w-52"
                            />
                            <button className="btn-secondary text-xs">Set Password</button>
                          </form>

                          <span className="text-xs font-medium text-(--color-slate) ml-4">Status:</span>
                          <form action={setMemberStatus.bind(null, user.id, user.status === "active" ? "suspended" : "active")}>
                            <button
                              className={`text-xs rounded-lg border px-3 py-1.5 font-medium ${user.status === "active" ? "border-amber-300 text-amber-700 hover:bg-amber-50" : "border-green-300 text-green-700 hover:bg-green-50"}`}
                              disabled={isSelf}
                            >
                              {user.status === "active" ? "Suspend Account" : "Activate Account"}
                            </button>
                          </form>

                          {!isSelf && (
                            <form
                              action={softDeleteMember.bind(null, user.id)}
                              onSubmit={(e) => { if (!confirm(`Delete ${user.name}? This cannot be undone.`)) e.preventDefault(); }}
                            >
                              <button className="text-xs rounded-lg border border-red-300 px-3 py-1.5 font-medium text-red-700 hover:bg-red-50">
                                Delete Member
                              </button>
                            </form>
                          )}
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="px-4 py-3">
                          <p className="font-medium text-(--color-ink)">
                            {user.name}
                            {isSelf && <span className="ml-1 text-xs text-(--color-slate)">(you)</span>}
                          </p>
                          <p className="text-xs text-(--color-slate)">{user.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[user.role] ?? "bg-slate-100 text-slate-700"}`}>
                            {ROLE_LABELS[user.role] ?? user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-(--color-slate) capitalize">
                          {user.department ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${user.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-(--color-slate)">
                          {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <a
                            href={`/admin/users?edit=${user.id}`}
                            className="inline-block rounded-lg border border-(--color-border) px-3 py-1.5 text-xs font-medium text-(--color-ink) hover:bg-(--color-cobalt) hover:text-white hover:border-(--color-cobalt) transition-colors"
                          >
                            Edit
                          </a>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {allUsers.length === 0 && (
            <div className="py-12 text-center text-sm text-(--color-slate)">No members yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}
