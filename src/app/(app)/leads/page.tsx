import { db } from "@/db";
import { leads, serviceCatalog } from "@/db/schema";
import { desc } from "drizzle-orm";
import { createLead, convertLeadToClient, updateLeadStatus } from "./actions";

const STATUS_OPTIONS = ["new", "contacted", "qualified", "converted", "lost"] as const;

export default async function LeadsPage() {
  const allLeads = await db.select().from(leads).orderBy(desc(leads.createdAt));
  const services = await db.select().from(serviceCatalog).orderBy(serviceCatalog.name);
  const serviceNameById = new Map(services.map((s) => [s.id, s.name]));

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-8">
      <h1 className="text-[18px] font-semibold text-(--color-ink)">Leads</h1>

      <form action={createLead} className="surface-card grid grid-cols-2 gap-4 p-6">
        <input name="name" placeholder="Name / Company" required className="field-input" />
        <input name="email" type="email" placeholder="Email" className="field-input" />
        <input name="phone" placeholder="Phone" className="field-input" />
        <input name="source" placeholder="Source" className="field-input" />
        <fieldset className="col-span-2 space-y-2">
          <legend className="text-sm font-medium text-(--color-ink)">Services Interested In</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {services.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm text-(--color-slate)">
                <input type="checkbox" name="serviceCatalogIds" value={s.id} className="rounded border-(--color-border)" />
                {s.name}
              </label>
            ))}
          </div>
        </fieldset>
        <textarea name="notes" placeholder="Notes" className="field-input col-span-2" />
        <button type="submit" className="btn-primary col-span-2">
          Add Lead
        </button>
      </form>

      <div className="surface-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-(--color-border) text-left text-(--color-slate)">
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Service</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {allLeads.map((lead) => (
              <tr key={lead.id} className="border-b border-(--color-border) last:border-0">
                <td className="px-6 py-3 font-medium text-(--color-ink)">{lead.name}</td>
                <td className="px-6 py-3 text-(--color-slate)">
                  {lead.serviceCatalogIds.map((id) => serviceNameById.get(id) ?? "Unknown").join(", ") || "—"}
                </td>
                <td className="px-6 py-3">
                  <form action={updateLeadStatus.bind(null, lead.id)}>
                    <select
                      name="status"
                      defaultValue={lead.status}
                      onChange={(e) => e.currentTarget.form?.requestSubmit()}
                      className="field-input py-1 text-xs"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </form>
                </td>
                <td className="px-6 py-3">
                  {lead.status !== "converted" && (
                    <form action={convertLeadToClient.bind(null, lead.id)}>
                      <button
                        type="submit"
                        className="text-xs font-medium text-(--color-cobalt) hover:underline"
                      >
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
    </div>
  );
}
