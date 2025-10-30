export type StripePlanContext = {
  slug?: string | null;
  billing_period?: string | null;
  display_order?: number | null;
};

const NORMALIZED_PRODUCT_MAP: Record<string, Record<string, string> | string> = {
  basico: {
    monthly: "prod_TKFqOM9oytPobP",
  },
  intermediario: {
    monthly: "prod_TKFpXxyUHloJYH",
  },
  pro: {
    monthly: "prod_TKFoYePnxLeeHE",
    yearly: "prod_TKFnZSNuZDxmuQ",
  },
};

const PRODUCT_BY_DISPLAY_ORDER: Record<number, string> = {
  1: "prod_TKFqOM9oytPobP",
  2: "prod_TKFpXxyUHloJYH",
  3: "prod_TKFoYePnxLeeHE",
  4: "prod_TKFnZSNuZDxmuQ",
};

function normalizeSlug(value?: string | null): string {
  return (value || "").trim().toLowerCase();
}

function resolveFromSlug(context: StripePlanContext): string | null {
  const slug = normalizeSlug(context.slug);
  if (!slug) {
    return null;
  }
  const mapped = NORMALIZED_PRODUCT_MAP[slug];
  if (!mapped) {
    return null;
  }
  if (typeof mapped === "string") {
    return mapped;
  }
  const billingKey = normalizeSlug(context.billing_period) || "monthly";
  if (mapped[billingKey]) {
    return mapped[billingKey];
  }
  if (mapped.monthly) {
    return mapped.monthly;
  }
  const firstEntry = Object.values(mapped).find((value) => typeof value === "string" && value.trim().length > 0);
  return firstEntry ?? null;
}

function resolveFromDisplayOrder(context: StripePlanContext): string | null {
  const order = context.display_order;
  if (!order && order !== 0) {
    return null;
  }
  const productId = PRODUCT_BY_DISPLAY_ORDER[order];
  return productId ?? null;
}

export function resolveStripeProductId(context: StripePlanContext): string | null {
  return resolveFromSlug(context) ?? resolveFromDisplayOrder(context) ?? null;
}

export function attachStripeProductId<T extends StripePlanContext & { stripe_product_id?: string | null }>(plan: T): T & {
  stripe_product_id: string | null;
} {
  const currentValue = plan.stripe_product_id?.trim();
  if (currentValue) {
    return { ...plan, stripe_product_id: currentValue };
  }
  const resolved = resolveStripeProductId(plan);
  return {
    ...plan,
    stripe_product_id: resolved ?? null,
  };
}
