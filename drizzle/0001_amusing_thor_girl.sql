CREATE TYPE "public"."deliverable_kind" AS ENUM('file', 'link', 'data');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('in_progress', 'pending_pm_review', 'pending_client_approval', 'revision_required', 'approved');--> statement-breakpoint
CREATE TABLE "deliverables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"uploader_id" uuid NOT NULL,
	"kind" "deliverable_kind" DEFAULT 'link' NOT NULL,
	"content" text NOT NULL,
	"revision_number" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"default_department" "department" DEFAULT 'general' NOT NULL,
	"is_custom" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "service_catalog_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "ticket_client_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"body" text NOT NULL,
	"revision_number" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_internal_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"is_revision_instruction" boolean DEFAULT false NOT NULL,
	"revision_number" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"service_catalog_id" uuid NOT NULL,
	"service_name" text NOT NULL,
	"department" "department" DEFAULT 'general' NOT NULL,
	"brief" text NOT NULL,
	"deadline" timestamp,
	"status" "ticket_status" DEFAULT 'in_progress' NOT NULL,
	"revision_number" integer DEFAULT 1 NOT NULL,
	"created_by_pm_id" uuid NOT NULL,
	"client_access_token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tickets_client_access_token_unique" UNIQUE("client_access_token")
);
--> statement-breakpoint
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_uploader_id_users_id_fk" FOREIGN KEY ("uploader_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_client_feedback" ADD CONSTRAINT "ticket_client_feedback_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_internal_comments" ADD CONSTRAINT "ticket_internal_comments_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_internal_comments" ADD CONSTRAINT "ticket_internal_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_service_catalog_id_service_catalog_id_fk" FOREIGN KEY ("service_catalog_id") REFERENCES "public"."service_catalog"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_created_by_pm_id_users_id_fk" FOREIGN KEY ("created_by_pm_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;