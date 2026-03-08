export type BillingPlan = "free" | "pro";
export type GenerationKind = "image" | "video";

export type PlanConfig = {
  priceEurMonthly: number;
  monthly: {
    image: number;
    video: number;
  };
};

export const PLAN_CONFIG: Record<BillingPlan, PlanConfig> = {
  free: {
    priceEurMonthly: 0,
    monthly: {
      image: Number(process.env.FREE_IMAGE_LIMIT ?? 10),
      video: Number(process.env.FREE_VIDEO_LIMIT ?? 1),
    },
  },
  pro: {
    priceEurMonthly: Number(process.env.PRO_PRICE_EUR ?? 19),
    monthly: {
      image: Number(process.env.PRO_IMAGE_LIMIT ?? 200),
      video: Number(process.env.PRO_VIDEO_LIMIT ?? 20),
    },
  },
};

export function parsePlan(input: string | null | undefined): BillingPlan {
  return input === "pro" ? "pro" : "free";
}

export function getMonthlyLimit(plan: BillingPlan, kind: GenerationKind): number {
  return PLAN_CONFIG[plan].monthly[kind];
}
