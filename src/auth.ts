import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { eq, isNull, and } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { logAudit } from "@/lib/audit";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const IDLE_SESSION_SECONDS = 60 * 60; // 1 hour
const REMEMBER_ME_SECONDS = 60 * 60 * 24 * 30; // 30 days

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt", maxAge: IDLE_SESSION_SECONDS, updateAge: 60 * 15 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
        remember: {},
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        const remember = credentials?.remember === "true";
        if (!email || !password) return null;

        const [user] = await db
          .select()
          .from(users)
          .where(and(eq(users.email, email), isNull(users.deletedAt)))
          .limit(1);

        if (!user) {
          await logAudit({ action: "login_failed", entityType: "user", metadata: { email, reason: "not_found" } });
          return null;
        }

        if (user.status === "suspended") {
          await logAudit({ actorId: user.id, actorEmail: user.email, action: "login_failed", entityType: "user", entityId: user.id, metadata: { reason: "suspended" } });
          return null;
        }

        if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
          await logAudit({ actorId: user.id, actorEmail: user.email, action: "login_failed", entityType: "user", entityId: user.id, metadata: { reason: "locked" } });
          return null;
        }

        const valid = await compare(password, user.passwordHash);
        if (!valid) {
          const attempts = user.failedLoginAttempts + 1;
          const lockedUntil =
            attempts >= MAX_FAILED_ATTEMPTS
              ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
              : null;
          await db
            .update(users)
            .set({ failedLoginAttempts: attempts, lockedUntil })
            .where(eq(users.id, user.id));
          await logAudit({ actorId: user.id, actorEmail: user.email, action: "login_failed", entityType: "user", entityId: user.id, metadata: { reason: "bad_password", attempts } });
          return null;
        }

        await db
          .update(users)
          .set({ failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() })
          .where(eq(users.id, user.id));
        await logAudit({ actorId: user.id, actorEmail: user.email, action: "login_success", entityType: "user", entityId: user.id });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          remember,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = user.role;
        token.department = user.department;
        if ((user as { remember?: boolean }).remember) {
          token.exp = Math.floor(Date.now() / 1000) + REMEMBER_ME_SECONDS;
        }
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.department = token.department as string;
        session.user.id = token.sub as string;
      }
      return session;
    },
  },
});
