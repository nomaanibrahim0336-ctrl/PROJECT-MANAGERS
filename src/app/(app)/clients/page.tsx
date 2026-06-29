import { db } from "@/db";
import { clients } from "@/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";

export default async function ClientsPage() {
  const allClients = await db.select().from(clients).orderBy(desc(clients.createdAt));

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <h1 className="text-[18px] font-semibold text-(--color-ink)">Clients</h1>
      <div className="surface-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-(--color-border) text-left text-(--color-slate)">
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Email</th>
              <th className="px-6 py-3 font-medium">Phone</th>
            </tr>
          </thead>
          <tbody>
            {allClients.map((client) => (
              <tr key={client.id} className="border-b border-(--color-border) last:border-0">
                <td className="px-6 py-3">
                  <Link
                    href={`/clients/${client.id}`}
                    className="font-medium text-(--color-cobalt) hover:underline"
                  >
                    {client.companyOrName}
                  </Link>
                </td>
                <td className="px-6 py-3 text-(--color-slate)">{client.email}</td>
                <td className="px-6 py-3 text-(--color-slate)">{client.phone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
