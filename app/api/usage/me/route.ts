import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMonthlyLimit, parsePlan } from "@/lib/plans";

function getMonthKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      plan: true,
      usageMonthKey: true,
      imageUsed: true,
      videoUsed: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const currentMonthKey = getMonthKey(new Date());
  const plan = parsePlan(user.plan);
  const imageUsed = user.usageMonthKey === currentMonthKey ? user.imageUsed : 0;
  const videoUsed = user.usageMonthKey === currentMonthKey ? user.videoUsed : 0;

  return NextResponse.json({
    plan,
    month: currentMonthKey,
    image: {
      used: imageUsed,
      limit: getMonthlyLimit(plan, "image"),
    },
    video: {
      used: videoUsed,
      limit: getMonthlyLimit(plan, "video"),
    },
  });
}
