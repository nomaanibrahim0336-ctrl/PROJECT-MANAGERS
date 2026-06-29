import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  varchar,
  boolean,
  integer,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "project_manager",
  "team_member",
  "client",
  "auditor",
]);

export const departmentEnum = pgEnum("department", [
  "publishing",
  "design",
  "development",
  "marketing",
  "general",
]);

export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "contacted",
  "qualified",
  "converted",
  "lost",
]);

export const serviceTypeEnum = pgEnum("service_type", [
  "book_publishing",
  "social_media_marketing",
  "book_cover_design",
  "website_development",
  "custom",
]);

export const ticketStatusEnum = pgEnum("ticket_status", [
  "in_progress",
  "pending_pm_review",
  "pending_client_approval",
  "revision_required",
  "approved",
]);

export const deliverableKindEnum = pgEnum("deliverable_kind", [
  "file",
  "link",
  "data",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("team_member"),
  department: departmentEnum("department").notNull().default("general"),
  phone: text("phone"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: text("source"),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }),
  phone: text("phone"),
  serviceInterest: serviceTypeEnum("service_interest").notNull(),
  notes: text("notes"),
  status: leadStatusEnum("status").notNull().default("new"),
  assignedManagerId: uuid("assigned_manager_id").references(() => users.id),
  convertedClientId: uuid("converted_client_id").references(() => clients.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyOrName: text("company_or_name").notNull(),
  email: varchar("email", { length: 255 }),
  phone: text("phone"),
  notes: text("notes"),
  sourceLeadId: uuid("source_lead_id"),
  portalUserId: uuid("portal_user_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const clientContacts = pgTable("client_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }),
  phone: text("phone"),
  title: text("title"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const serviceCatalog = pgTable("service_catalog", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  defaultDepartment: departmentEnum("default_department").notNull().default("general"),
  isCustom: boolean("is_custom").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tickets = pgTable("tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  serviceCatalogId: uuid("service_catalog_id")
    .notNull()
    .references(() => serviceCatalog.id),
  serviceName: text("service_name").notNull(),
  department: departmentEnum("department").notNull().default("general"),
  brief: text("brief").notNull(),
  deadline: timestamp("deadline"),
  status: ticketStatusEnum("status").notNull().default("in_progress"),
  revisionNumber: integer("revision_number").notNull().default(1),
  createdByPmId: uuid("created_by_pm_id")
    .notNull()
    .references(() => users.id),
  clientAccessToken: uuid("client_access_token").notNull().defaultRandom().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const deliverables = pgTable("deliverables", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketId: uuid("ticket_id")
    .notNull()
    .references(() => tickets.id),
  uploaderId: uuid("uploader_id")
    .notNull()
    .references(() => users.id),
  kind: deliverableKindEnum("kind").notNull().default("link"),
  content: text("content").notNull(),
  revisionNumber: integer("revision_number").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const ticketInternalComments = pgTable("ticket_internal_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketId: uuid("ticket_id")
    .notNull()
    .references(() => tickets.id),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id),
  body: text("body").notNull(),
  isRevisionInstruction: boolean("is_revision_instruction").notNull().default(false),
  revisionNumber: integer("revision_number").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const ticketClientFeedback = pgTable("ticket_client_feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketId: uuid("ticket_id")
    .notNull()
    .references(() => tickets.id),
  body: text("body").notNull(),
  revisionNumber: integer("revision_number").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
