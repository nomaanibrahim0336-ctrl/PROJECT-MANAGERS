import Link from "next/link";
import { auth, signOut } from "@/auth";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/clients", label: "Clients" },
  { href: "/admin/services", label: "Service Catalog" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-gray-200 bg-white p-4">
        <div className="mb-6 px-2 text-lg font-semibold text-gray-900">PM SaaS</div>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 border-t border-gray-200 pt-4 px-2">
          <p className="text-sm font-medium text-gray-900">{session?.user?.name}</p>
          <p className="text-xs text-gray-500">{session?.user?.role}</p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="mt-2 text-xs text-gray-500 hover:underline">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 bg-gray-50">{children}</main>
    </div>
  );
}
