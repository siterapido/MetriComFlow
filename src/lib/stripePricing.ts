const STRIPE_PRICE_IDS: Record<string, string> = {
  basico: "price_1SO7VUJa5tHS2rd0mccenEt7",
  intermediario: "price_1SO7VcJa5tHS2rd0GNuq7QCO",
  pro: "price_1SO7VmJa5tHS2rd06pyBODW3",
};

export function getStripePriceIdForPlanSlug(slug: string | null | undefined) {
  if (!slug) return null;
  return STRIPE_PRICE_IDS[slug] ?? null;
}

export { STRIPE_PRICE_IDS };
