import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

function getBaseURL() {
  return process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
}

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  const portRaw = process.env.SMTP_PORT;
  const secureRaw = process.env.SMTP_SECURE;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  const port = portRaw ? Number(portRaw) : NaN;
  const secure = secureRaw ? secureRaw === "true" : port === 465;

  if (!host || !Number.isFinite(port) || !user || !pass) {
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });

  return cachedTransporter;
}

async function sendAuthEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const transporter = getTransporter();
  const from = process.env.MAIL_FROM ?? process.env.SMTP_USER;

  if (!transporter || !from) {
    console.log(`[mail-disabled] ${params.subject} -> ${params.to}`);
    console.log(params.text);
    return;
  }

  await transporter.sendMail({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });
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
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendAuthEmail({
        to: user.email,
        subject: "Passwort zuruecksetzen",
        text: `Hallo ${user.name ?? ""},\n\nsetze dein Passwort hier zurueck:\n${url}\n`,
        html: `
          <p>Hallo ${user.name ?? ""},</p>
          <p>setze dein Passwort hier zurueck:</p>
          <p><a href="${url}">${url}</a></p>
        `,
      });
    },
    onPasswordReset: async ({ user }) => {
      console.log(`[better-auth] Password reset completed for ${user.email}`);
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendAuthEmail({
        to: user.email,
        subject: "Einladung: Account bestaetigen",
        text: `Hallo ${user.name ?? ""},\n\ndas ist dein Einladungslink zur Registrierung:\n${url}\n`,
        html: `
          <p>Hallo ${user.name ?? ""},</p>
          <p>das ist dein Einladungslink zur Registrierung:</p>
          <p><a href="${url}">${url}</a></p>
        `,
      });
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
