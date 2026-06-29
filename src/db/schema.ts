import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  varchar,
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
