import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [client] = await db.select().from(clients).where(eq(clients.id, id)).limit(1);

  if (!client) notFound();

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">{client.companyOrName}</h1>
      <p className="text-sm text-gray-500">{client.email}</p>
      <p className="text-sm text-gray-500">{client.phone}</p>
      {client.notes && <p className="mt-4 text-sm text-gray-700">{client.notes}</p>}
      <p className="mt-6 text-sm text-gray-400">No projects yet for this client.</p>
    </div>
  );
}
