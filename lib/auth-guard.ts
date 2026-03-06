import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function getServerSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

function parseRoles(role: string | null | undefined): string[] {
  if (!role) {
    return [];
  }
  return role
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireUser() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireUser();
  const roles = parseRoles(session.user.role);
  if (!roles.includes("admin")) {
    redirect("/");
  }
  return session;
}
