/**
 * Utility functions for calculating marketing and business metrics
 */

/**
 * Calculate CPL (Cost Per Lead)
 * @param spend - Total advertising spend
 * @param leads - Number of leads generated
 * @returns CPL value or null if leads is 0
 */
export function calculateCPL(spend: number, leads: number): number | null {
  if (leads === 0) return null;
  return spend / leads;
}

/**
 * Calculate ROAS (Return on Ad Spend)
 * @param revenue - Total revenue generated
 * @param spend - Total advertising spend
 * @returns ROAS value or null if spend is 0
 */
export function calculateROAS(revenue: number, spend: number): number | null {
  if (spend === 0) return null;
  return revenue / spend;
}

/**
 * Calculate CTR (Click Through Rate)
 * @param clicks - Number of clicks
 * @param impressions - Number of impressions
 * @returns CTR as percentage or null if impressions is 0
 */
export function calculateCTR(clicks: number, impressions: number): number | null {
  if (impressions === 0) return null;
  return (clicks / impressions) * 100;
}

/**
 * Calculate conversion rate
 * @param conversions - Number of conversions (e.g., sales)
 * @param leads - Number of leads
 * @returns Conversion rate as percentage or null if leads is 0
 */
export function calculateConversionRate(conversions: number, leads: number): number | null {
  if (leads === 0) return null;
  return (conversions / leads) * 100;
}

/**
 * Calculate CPA (Cost Per Acquisition)
 * @param spend - Total advertising spend
 * @param acquisitions - Number of acquisitions (customers)
 * @returns CPA value or null if acquisitions is 0
 */
export function calculateCPA(spend: number, acquisitions: number): number | null {
  if (acquisitions === 0) return null;
  return spend / acquisitions;
}

/**
 * Calculate CAC (Customer Acquisition Cost)
 * @param totalMarketingSpend - Total marketing and sales spend
 * @param newCustomers - Number of new customers acquired
 * @returns CAC value or null if newCustomers is 0
 */
export function calculateCAC(totalMarketingSpend: number, newCustomers: number): number | null {
  if (newCustomers === 0) return null;
  return totalMarketingSpend / newCustomers;
}

/**
 * Calculate LTV (Lifetime Value) - simplified version
 * @param averageOrderValue - Average order value
 * @param purchaseFrequency - Number of purchases per year
 * @param customerLifespan - Customer lifespan in years
 * @returns LTV value
 */
export function calculateLTV(
  averageOrderValue: number,
  purchaseFrequency: number,
  customerLifespan: number
): number {
  return averageOrderValue * purchaseFrequency * customerLifespan;
}

/**
 * Calculate LTV:CAC ratio
 * @param ltv - Lifetime value
 * @param cac - Customer acquisition cost
 * @returns LTV:CAC ratio or null if CAC is 0
 */
export function calculateLTVtoCAC(ltv: number, cac: number): number | null {
  if (cac === 0) return null;
  return ltv / cac;
}

/**
 * Calculate goal progress percentage
 * @param achieved - Amount achieved
 * @param goal - Goal amount
 * @returns Progress percentage
 */
export function calculateGoalProgress(achieved: number, goal: number): number {
  if (goal === 0) return 0;
  return Math.min((achieved / goal) * 100, 100);
}

/**
 * Calculate percentage change between two values
 * @param current - Current value
 * @param previous - Previous value
 * @returns Percentage change or null if previous is 0
 */
export function calculatePercentageChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/**
 * Get status color based on metric performance
 * @param value - Current value
 * @param target - Target value
 * @param thresholds - Optional custom thresholds (defaults: excellent >= 90%, good >= 70%, warning >= 50%)
 * @returns Color class name
 */
export function getMetricStatusColor(
  value: number,
  target: number,
  thresholds = { excellent: 90, good: 70, warning: 50 }
): string {
  const percentage = (value / target) * 100;

  if (percentage >= thresholds.excellent) return 'text-success';
  if (percentage >= thresholds.good) return 'text-primary';
  if (percentage >= thresholds.warning) return 'text-warning';
  return 'text-destructive';
}

/**
 * Get badge color based on metric performance
 * @param value - Current value
 * @param target - Target value
 * @param thresholds - Optional custom thresholds
 * @returns Badge variant class
 */
export function getMetricStatusBadge(
  value: number,
  target: number,
  thresholds = { excellent: 90, good: 70, warning: 50 }
): string {
  const percentage = (value / target) * 100;

  if (percentage >= thresholds.excellent) return 'bg-success text-success-foreground';
  if (percentage >= thresholds.good) return 'bg-primary text-primary-foreground';
  if (percentage >= thresholds.warning) return 'bg-warning text-warning-foreground';
  return 'bg-destructive text-destructive-foreground';
}

/**
 * Calculate average from array of numbers
 * @param values - Array of numbers
 * @returns Average value or 0 if array is empty
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate sum from array of numbers
 * @param values - Array of numbers
 * @returns Sum of all values
 */
export function calculateSum(values: number[]): number {
  return values.reduce((sum, val) => sum + val, 0);
}

/**
 * Determine if ROAS is healthy
 * @param roas - ROAS value
 * @returns boolean indicating if ROAS is healthy (>= 3)
 */
export function isHealthyROAS(roas: number | null): boolean {
  if (roas === null) return false;
  return roas >= 3;
}

/**
 * Determine if CTR is healthy
 * @param ctr - CTR percentage
 * @returns boolean indicating if CTR is healthy (>= 1%)
 */
export function isHealthyCTR(ctr: number | null): boolean {
  if (ctr === null) return false;
  return ctr >= 1;
}

/**
 * Determine if conversion rate is healthy
 * @param conversionRate - Conversion rate percentage
 * @returns boolean indicating if conversion rate is healthy (>= 2%)
 */
export function isHealthyConversionRate(conversionRate: number | null): boolean {
  if (conversionRate === null) return false;
  return conversionRate >= 2;
}
