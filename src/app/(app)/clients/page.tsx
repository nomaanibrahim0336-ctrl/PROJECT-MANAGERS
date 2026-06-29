import { db } from "@/db";
import { clients } from "@/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";

export default async function ClientsPage() {
  const allClients = await db.select().from(clients).orderBy(desc(clients.createdAt));

  return (
    <div className="mx-auto max-w-5xl p-8">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Clients</h1>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="py-2">Name</th>
            <th className="py-2">Email</th>
            <th className="py-2">Phone</th>
          </tr>
        </thead>
        <tbody>
          {allClients.map((client) => (
            <tr key={client.id} className="border-b border-gray-100">
              <td className="py-2">
                <Link href={`/clients/${client.id}`} className="text-blue-600 hover:underline">
                  {client.companyOrName}
                </Link>
              </td>
              <td className="py-2">{client.email}</td>
              <td className="py-2">{client.phone}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
