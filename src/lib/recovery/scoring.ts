import type { TransactionContext } from "@/types";

const FAILURE_WEIGHTS: Record<string, number> = {
  bank_timeout: 0.85,
  upi_failure: 0.6,
  insufficient_funds: 0.55,
  card_declined: 0.45,
  expired_card: 0.3,
};

export function calculateRecoveryProbability(ctx: TransactionContext): number {
  const base = FAILURE_WEIGHTS[ctx.transaction.failure_reason] ?? 0.5;
  let score = base;

  const { successful_transactions, total_transactions, segment, previous_failures } =
    ctx.customer;

  const successRate =
    total_transactions > 0 ? successful_transactions / total_transactions : 0.5;

  score += Math.min(successRate * 0.2, 0.15);

  if (segment === "high_value") score += 0.1;
  else if (segment === "returning") score += 0.05;
  else if (segment === "at_risk") score -= 0.1;

  score -= ctx.transaction.attempt_count * 0.12;
  score -= (ctx.transaction.amount > 1000000 ? 0.05 : 0); // > ₹10k
  score -= previous_failures * 0.04;

  return Math.max(0.05, Math.min(0.95, Math.round(score * 100) / 100));
}

export function probabilityLabel(p: number): string {
  if (p >= 0.8) return "Very High";
  if (p >= 0.65) return "High";
  if (p >= 0.45) return "Medium";
  if (p >= 0.25) return "Low";
  return "Very Low";
}

export function probabilityColor(p: number): string {
  if (p >= 0.8) return "text-emerald-600 bg-emerald-50 border-emerald-200";
  if (p >= 0.65) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (p >= 0.45) return "text-amber-700 bg-amber-50 border-amber-200";
  if (p >= 0.25) return "text-orange-700 bg-orange-50 border-orange-200";
  return "text-red-700 bg-red-50 border-red-200";
}
