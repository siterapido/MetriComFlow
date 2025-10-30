const STRIPE_PRICE_IDS: Record<string, string> = {
  basico: "price_1SNxA8RxDd43b7sZ9GlVA2J1",
  intermediario: "price_1SNxEvRxDd43b7sZira7LmiX",
  pro: "price_1SNxFcRxDd43b7sZPC3d8fXf",
};

export function getStripePriceIdForPlanSlug(slug: string | null | undefined) {
  if (!slug) return null;
  return STRIPE_PRICE_IDS[slug] ?? null;
}

export { STRIPE_PRICE_IDS };
