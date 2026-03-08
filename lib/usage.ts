import { prisma } from "@/lib/prisma";
import { getMonthlyLimit, parsePlan, type BillingPlan, type GenerationKind } from "@/lib/plans";

export class UsageLimitError extends Error {
  kind: GenerationKind;
  plan: BillingPlan;
  limit: number;
  used: number;

  constructor(params: { kind: GenerationKind; plan: BillingPlan; limit: number; used: number }) {
    super(`Monthly ${params.kind} limit reached for ${params.plan} plan.`);
    this.kind = params.kind;
    this.plan = params.plan;
    this.limit = params.limit;
    this.used = params.used;
  }
}

function getMonthKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export async function consumeGenerationQuota(userId: string, kind: GenerationKind, amount = 1) {
  const now = new Date();
  const currentMonthKey = getMonthKey(now);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        plan: true,
        usageMonthKey: true,
        imageUsed: true,
        videoUsed: true,
      },
    });

    if (!user) {
      throw new Error("User not found.");
    }

    let imageUsed = user.imageUsed;
    let videoUsed = user.videoUsed;

    if (user.usageMonthKey !== currentMonthKey) {
      imageUsed = 0;
      videoUsed = 0;
    }

    const plan = parsePlan(user.plan);
    const used = kind === "image" ? imageUsed : videoUsed;
    const limit = getMonthlyLimit(plan, kind);

    if (used + amount > limit) {
      throw new UsageLimitError({ kind, plan, limit, used });
    }

    const nextImageUsed = kind === "image" ? imageUsed + amount : imageUsed;
    const nextVideoUsed = kind === "video" ? videoUsed + amount : videoUsed;

    const updated = await tx.user.update({
      where: { id: userId },
      data: {
        usageMonthKey: currentMonthKey,
        imageUsed: nextImageUsed,
        videoUsed: nextVideoUsed,
      },
      select: {
        plan: true,
        usageMonthKey: true,
        imageUsed: true,
        videoUsed: true,
      },
    });

    return {
      plan: parsePlan(updated.plan),
      usageMonthKey: updated.usageMonthKey,
      imageUsed: updated.imageUsed,
      videoUsed: updated.videoUsed,
    };
  });
}

export async function refundGenerationQuota(userId: string, kind: GenerationKind, amount = 1) {
  const now = new Date();
  const currentMonthKey = getMonthKey(now);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        usageMonthKey: true,
        imageUsed: true,
        videoUsed: true,
      },
    });

    if (!user) {
      throw new Error("User not found.");
    }

    let imageUsed = user.imageUsed;
    let videoUsed = user.videoUsed;

    if (user.usageMonthKey !== currentMonthKey) {
      imageUsed = 0;
      videoUsed = 0;
    }

    const nextImageUsed = kind === "image" ? Math.max(imageUsed - amount, 0) : imageUsed;
    const nextVideoUsed = kind === "video" ? Math.max(videoUsed - amount, 0) : videoUsed;

    const updated = await tx.user.update({
      where: { id: userId },
      data: {
        usageMonthKey: currentMonthKey,
        imageUsed: nextImageUsed,
        videoUsed: nextVideoUsed,
      },
      select: {
        usageMonthKey: true,
        imageUsed: true,
        videoUsed: true,
      },
    });

    return {
      usageMonthKey: updated.usageMonthKey,
      imageUsed: updated.imageUsed,
      videoUsed: updated.videoUsed,
    };
  });
}
