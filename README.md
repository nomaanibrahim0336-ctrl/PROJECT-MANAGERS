## PM SaaS

Project management platform for client-facing creative/technical service teams (book publishing, social media marketing, book cover design, website development, custom projects).

Stack: Next.js (App Router) + TypeScript + Drizzle ORM + PostgreSQL + Auth.js (credentials).

### Setup

1. `npm install`
2. Copy `.env.example` to `.env` and set `DATABASE_URL` (PostgreSQL) and `AUTH_SECRET`.
3. `npm run db:generate` then `npm run db:migrate` to create tables.
4. `npm run db:seed` to create the initial admin user (`admin@example.com` / `ChangeMe123!`) — change the password after first login.
5. `npm run dev`

### Current scope (foundation milestone)

- User roles: admin, project_manager, team_member, client, auditor (`src/db/schema.ts`, `src/lib/rbac.ts`)
- Credentials-based auth with session role/department (`src/auth.ts`, `src/proxy.ts`)
- Leads database with status pipeline and lead → client conversion (`src/app/(app)/leads`)
- Client records (`src/app/(app)/clients`)
- Role-aware dashboard shell with sidebar nav (`src/app/(app)/layout.tsx`)

Not yet built: projects/phases/tasks, budgeting, after-sales tickets, reporting, client portal, integrations. See the original requirements document for full scope.
