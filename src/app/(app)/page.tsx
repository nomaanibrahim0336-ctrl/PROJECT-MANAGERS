import { auth } from "@/auth";
import { db } from "@/db";
import { clients, leads } from "@/db/schema";
import { count } from "drizzle-orm";

export default async function DashboardPage() {
  const session = await auth();
  const [{ value: leadCount }] = await db.select({ value: count() }).from(leads);
  const [{ value: clientCount }] = await db.select({ value: count() }).from(clients);

  return (
    <div className="mx-auto max-w-5xl p-8">
      <h1 className="mb-1 text-2xl font-semibold text-gray-900">
        Welcome, {session?.user?.name}
      </h1>
      <p className="mb-6 text-sm text-gray-500">Role: {session?.user?.role}</p>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">Total Leads</p>
          <p className="text-3xl font-semibold text-gray-900">{leadCount}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">Total Clients</p>
          <p className="text-3xl font-semibold text-gray-900">{clientCount}</p>
        </div>
      </div>
    </div>
  );
}
