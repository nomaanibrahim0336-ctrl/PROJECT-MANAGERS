import Link from "next/link";
import { auth, signOut } from "@/auth";
import { NavLink } from "./nav-link";
import { canManageMembers, canViewAuditLogs, canViewPmPanel } from "@/lib/rbac";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const initial = session?.user?.name?.charAt(0)?.toUpperCase() ?? "?";
  const role = session?.user?.role as never;

  const navItems = [
    canViewPmPanel(role)
      ? { href: "/pm", label: "My Panel" }
      : { href: "/", label: "Dashboard" },
    ...(role === "admin" ? [{ href: "/", label: "Dashboard" }] : []),
    { href: "/leads", label: "Leads" },
    { href: "/clients", label: "Clients" },
    ...(role === "admin" ? [{ href: "/admin/services", label: "Service Catalog" }] : []),
    ...(canManageMembers(role) ? [{ href: "/admin/users", label: "Team Members" }] : []),
    ...(canViewAuditLogs(role) ? [{ href: "/admin/audit-logs", label: "Audit Log" }] : []),
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <div className="accent-bar" />
      <div className="flex flex-1">
        <aside className="app-sidebar w-60 shrink-0 p-4">
          <div className="relative z-10 mb-8 px-2 text-lg font-semibold text-white">
            PM SaaS
          </div>
          <nav className="relative z-10 space-y-1">
            {navItems.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} />
            ))}
          </nav>
          <div className="relative z-10 mt-10 border-t border-white/10 pt-4 px-2">
            <p className="text-sm font-medium text-white">{session?.user?.name}</p>
            <p className="text-xs text-slate-400">{session?.user?.role}</p>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="mt-2 text-xs text-slate-400 transition hover:text-cyan-300 hover:underline"
              >
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <div className="flex flex-1 flex-col">
          <header className="app-topbar sticky top-0 z-10 flex items-center justify-between gap-4 px-8 py-3">
            <input
              type="search"
              placeholder="Search…"
              className="w-72 rounded-lg border border-(--color-cobalt)/40 bg-white/70 px-3 py-1.5 text-sm text-(--color-ink) placeholder:text-(--color-slate) focus:outline-none focus:ring-2 focus:ring-(--color-cobalt)/30"
            />
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-(--color-navy) to-(--color-cobalt) text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(37,99,235,0.5)]"
            >
              {initial}
            </Link>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
