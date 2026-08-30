import type { TransactionContext, AIDecision } from "@/types";

export function deterministicFallback(context: TransactionContext): AIDecision {
  const { failure_reason, payment_method } = context.transaction;
  const { successful_transactions, total_transactions, segment, previous_failures } =
    context.customer;

  const successRate =
    total_transactions > 0 ? successful_transactions / total_transactions : 0.5;

  // Base probabilities per failure reason
  const baseMap: Record<string, number> = {
    bank_timeout: 0.82,
    upi_failure: 0.62,
    insufficient_funds: 0.48,
    card_declined: 0.42,
    expired_card: 0.28,
  };

  let prob = baseMap[failure_reason] ?? 0.5;
  if (segment === "high_value") prob += 0.1;
  else if (segment === "returning") prob += 0.05;
  else if (segment === "at_risk") prob -= 0.08;

  prob += Math.min(successRate * 0.15, 0.12);
  prob -= previous_failures * 0.06;
  prob = Math.max(0.05, Math.min(0.95, prob));

  let decision: AIDecision["decision"] = "create_payment_link";
  let fallback: AIDecision["fallback_action"] = "send_reminder";
  let confidence = 0.72;
  let reason = "";
  let maxAttempts = 2;

  switch (failure_reason) {
    case "bank_timeout":
      decision = "retry_payment";
      fallback = "create_payment_link";
      confidence = 0.88;
      reason =
        successRate > 0.7
          ? "Transient bank timeout with strong customer history — immediate retry has high success likelihood."
          : "Bank timeout is typically transient; a single retry is low-risk.";
      maxAttempts = 2;
      break;
    case "upi_failure":
      decision = previous_failures >= 2 ? "create_payment_link" : "retry_payment";
      fallback = "create_payment_link";
      confidence = 0.75;
      reason =
        "UPI failure may be transient network issue; retry once then fallback to payment link.";
      maxAttempts = 1;
      break;
    case "insufficient_funds":
      decision = "wait_and_retry";
      fallback = "create_payment_link";
      confidence = 0.65;
      reason =
        "Insufficient funds requires waiting for balance; retry later then send payment link for customer convenience.";
      maxAttempts = 2;
      break;
    case "card_declined":
      decision = "create_payment_link";
      fallback = "send_reminder";
      confidence = 0.78;
      reason =
        "Card declined suggests auth issue — avoid repeated retries and offer alternative payment method via link.";
      maxAttempts = 1;
      break;
    case "expired_card":
      decision = "create_payment_link";
      fallback = "escalate";
      confidence = 0.9;
      reason =
        "Expired card cannot be retried — generate payment link and request updated payment method.";
      maxAttempts = 1;
      break;
    default:
      decision = "create_payment_link";
      fallback = "send_reminder";
      reason = "Generic failure — safe fallback to payment link.";
  }

  // Override for at-risk / high previous failures
  if (previous_failures >= 3 && decision === "retry_payment") {
    decision = "create_payment_link";
    reason = "Multiple prior failures — avoid retry, use payment link to reduce friction.";
    confidence = 0.71;
  }

  // Wallet/Netbanking tweak
  if (payment_method === "wallet" && decision === "retry_payment") {
    // wallets rarely benefit from retry
    decision = "create_payment_link";
    confidence = 0.69;
  }

  return {
    decision,
    confidence,
    reason,
    recovery_probability: Math.round(prob * 100) / 100,
    fallback_action: fallback,
    max_attempts: maxAttempts,
  };
}
