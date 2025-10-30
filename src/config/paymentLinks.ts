type PlanSlug = "basico" | "intermediario" | "pro";

type PaymentLinkConfig = {
  url: string;
  /** Optional Stripe price id. Helps backend match plan when metadata is absent. */
  priceId?: string;
  /** Optional Stripe product id. */
  productId?: string;
};

export const PAYMENT_LINKS: Record<PlanSlug, PaymentLinkConfig> = {
  basico: {
    url: "https://buy.stripe.com/test_aFacN73WR2pn8MB1rB3Nm00",
  },
  intermediario: {
    url: "https://buy.stripe.com/test_4gM28t64Z1ljfaZ0nx3Nm01",
  },
  pro: {
    url: "https://buy.stripe.com/test_4gM28t64Z1ljfaZ0nx3Nm01",
  },
};

export function getPaymentLink(planSlug: PlanSlug | string | null | undefined): string | null {
  if (!planSlug) return null;
  const normalized = normalizePlanSlug(planSlug);
  return normalized ? PAYMENT_LINKS[normalized]?.url ?? null : null;
}

export function normalizePlanSlug(value: string | null | undefined): PlanSlug | null {
  if (!value) return null;
  const normalized = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (normalized === "basic" || normalized === "starter") return "basico";
  if (normalized === "intermediate") return "intermediario";
  if (normalized === "premium") return "pro";
  if (normalized === "basico" || normalized === "intermediario" || normalized === "pro") {
    return normalized as PlanSlug;
  }
  return null;
}

export const PLAN_SLUGS: PlanSlug[] = ["basico", "intermediario", "pro"];
