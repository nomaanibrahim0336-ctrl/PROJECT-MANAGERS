ALTER TABLE "clients" ADD COLUMN "services_engaged_ids" uuid[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "service_catalog_ids" uuid[] DEFAULT '{}' NOT NULL;