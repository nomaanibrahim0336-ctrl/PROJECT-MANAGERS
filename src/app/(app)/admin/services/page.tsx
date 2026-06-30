import { auth } from "@/auth";
import { db } from "@/db";
import { serviceCatalog } from "@/db/schema";
import { canManageServiceCatalog } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { createCustomService } from "./actions";

export default async function ServiceCatalogAdminPage() {
  const session = await auth();
  if (!session?.user || !canManageServiceCatalog(session.user.role as never)) redirect("/");

  const services = await db.select().from(serviceCatalog).orderBy(serviceCatalog.name);

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-8">
      <h1 className="text-[18px] font-semibold text-(--color-ink)">Global Service Catalog</h1>

      <ul className="space-y-2">
        {services.map((service) => (
          <li key={service.id} className="surface-card flex items-center justify-between p-3 text-sm">
            <span className="font-medium text-(--color-ink)">{service.name}</span>
            <span className="badge bg-[#EEF1F6] text-(--color-slate)">
              {service.defaultDepartment}
              {service.isCustom && " · custom"}
            </span>
          </li>
        ))}
      </ul>

      <section className="surface-card space-y-3 p-6">
        <h2 className="text-sm font-semibold text-(--color-ink)">Add Custom Service</h2>
        <form action={createCustomService} className="space-y-2">
          <input
            name="name"
            placeholder="Service name (e.g. Podcast Production)"
            required
            className="field-input block w-full"
          />
          <select name="defaultDepartment" required className="field-input block w-full">
            <option value="publishing">Publishing</option>
            <option value="design">Design</option>
            <option value="development">Development</option>
            <option value="marketing">Marketing</option>
            <option value="general">General</option>
          </select>
          <button className="btn-primary">Add to Catalog</button>
        </form>
      </section>
    </div>
  );
}
