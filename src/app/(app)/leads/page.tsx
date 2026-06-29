import { db } from "@/db";
import { leads } from "@/db/schema";
import { desc } from "drizzle-orm";
import { createLead, convertLeadToClient, updateLeadStatus } from "./actions";

const STATUS_OPTIONS = ["new", "contacted", "qualified", "converted", "lost"] as const;
const SERVICE_OPTIONS = [
  "book_publishing",
  "social_media_marketing",
  "book_cover_design",
  "website_development",
  "custom",
] as const;

export default async function LeadsPage() {
  const allLeads = await db.select().from(leads).orderBy(desc(leads.createdAt));

  return (
    <div className="mx-auto max-w-5xl p-8">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Leads</h1>

      <form action={createLead} className="mb-8 grid grid-cols-2 gap-4 rounded-lg border border-gray-200 p-6">
        <input name="name" placeholder="Name / Company" required className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <input name="email" type="email" placeholder="Email" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <input name="phone" placeholder="Phone" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <input name="source" placeholder="Source" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <select name="serviceInterest" required className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          {SERVICE_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <textarea name="notes" placeholder="Notes" className="col-span-2 rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <button type="submit" className="col-span-2 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800">
          Add Lead
        </button>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="py-2">Name</th>
            <th className="py-2">Service</th>
            <th className="py-2">Status</th>
            <th className="py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {allLeads.map((lead) => (
            <tr key={lead.id} className="border-b border-gray-100">
              <td className="py-2">{lead.name}</td>
              <td className="py-2">{lead.serviceInterest.replace(/_/g, " ")}</td>
              <td className="py-2">
                <form action={updateLeadStatus.bind(null, lead.id)}>
                  <select
                    name="status"
                    defaultValue={lead.status}
                    onChange={(e) => e.currentTarget.form?.requestSubmit()}
                    className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </form>
              </td>
              <td className="py-2">
                {lead.status !== "converted" && (
                  <form action={convertLeadToClient.bind(null, lead.id)}>
                    <button type="submit" className="text-xs font-medium text-blue-600 hover:underline">
                      Convert to Client
                    </button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
