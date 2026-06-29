import { db } from "@/db";
import { serviceCatalog } from "@/db/schema";
import { createCustomService } from "./actions";

export default async function ServiceCatalogAdminPage() {
  const services = await db.select().from(serviceCatalog).orderBy(serviceCatalog.name);

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-8">
      <h1 className="text-2xl font-semibold text-gray-900">Global Service Catalog</h1>

      <ul className="space-y-2">
        {services.map((service) => (
          <li
            key={service.id}
            className="flex items-center justify-between rounded-md border border-gray-200 p-3 text-sm"
          >
            <span className="font-medium text-gray-900">{service.name}</span>
            <span className="text-xs text-gray-500">
              {service.defaultDepartment}
              {service.isCustom && " · custom"}
            </span>
          </li>
        ))}
      </ul>

      <section className="border-t border-gray-200 pt-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Add Custom Service</h2>
        <form action={createCustomService} className="space-y-2">
          <input
            name="name"
            placeholder="Service name (e.g. Podcast Production)"
            required
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <select
            name="defaultDepartment"
            required
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="publishing">Publishing</option>
            <option value="design">Design</option>
            <option value="development">Development</option>
            <option value="marketing">Marketing</option>
            <option value="general">General</option>
          </select>
          <button className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white">
            Add to Catalog
          </button>
        </form>
      </section>
    </div>
  );
}
