import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

function hasAdminRole(role: string | null | undefined) {
  if (!role) return false;
  return role
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .some((item) => item === "admin");
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!hasAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
    },
  });
}
