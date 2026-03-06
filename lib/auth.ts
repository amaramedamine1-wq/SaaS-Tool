import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { prisma } from "@/lib/prisma";

function getBaseURL() {
  return process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  baseURL: getBaseURL(),
  secret:
    process.env.BETTER_AUTH_SECRET ?? "dev-only-change-this-better-auth-secret-at-least-32-chars",
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      // Replace with your real mail provider (Resend, SMTP, etc.).
      console.log(`[better-auth] Reset password for ${user.email}: ${url}`);
    },
    onPasswordReset: async ({ user }) => {
      console.log(`[better-auth] Password reset completed for ${user.email}`);
    },
  },
  plugins: [
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
