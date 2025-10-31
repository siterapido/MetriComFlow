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
    url: "https://buy.stripe.com/test_eVqcN66x75qIcpc1C94ow03",
    priceId: "price_1SO7VUJa5tHS2rd0mccenEt7",
    productId: "prod_TKn5KxljdPu8xg",
  },
  intermediario: {
    url: "https://buy.stripe.com/test_8x2cN6g7H1as0GueoV4ow04",
    priceId: "price_1SO7VcJa5tHS2rd0GNuq7QCO",
    productId: "prod_TKn5x6gdY9NKJT",
  },
  pro: {
    url: "https://buy.stripe.com/test_fZudRa3kVaL2dtgbcJ4ow05",
    priceId: "price_1SO7VmJa5tHS2rd06pyBODW3",
    productId: "prod_TKn5fkLPEfHdVT",
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
