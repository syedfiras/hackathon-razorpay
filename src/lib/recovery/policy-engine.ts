import type { AIDecision, PolicyValidation, FailureReason, AIDecisionAction } from "@/types";
import { getStrategy } from "./strategies";

export interface PolicyContext {
  failureReason: FailureReason;
  attemptCount: number;
  maxAttempts: number;
  alreadyRecovered: boolean;
  customerSegment?: string;
  amount?: number;
}

export class PolicyEngine {
  validate(decision: AIDecision, ctx: PolicyContext): PolicyValidation {
    // Already recovered — no further action
    if (ctx.alreadyRecovered) {
      return {
        allowed: false,
        finalAction: "escalate",
        reason: "Payment already recovered — no further action required.",
        overridden: true,
      };
    }

    // Max attempts exceeded
    if (ctx.attemptCount >= ctx.maxAttempts) {
      const strategy = getStrategy(ctx.failureReason);
      // Force fallback or escalate
      const forced: AIDecisionAction =
        ctx.attemptCount >= 3 ? "escalate" : strategy.fallback;
      return {
        allowed: false,
        finalAction: forced,
        reason: `Maximum retry count (${ctx.maxAttempts}) exceeded. Overriding ${decision.decision} -> ${forced}.`,
        overridden: true,
      };
    }

    // Expired card — never retry
    if (ctx.failureReason === "expired_card" && decision.decision === "retry_payment") {
      return {
        allowed: false,
        finalAction: "create_payment_link",
        reason: "Expired card cannot be retried — policy requires payment link with updated method request.",
        overridden: true,
      };
    }

    // Card declined — block repeated retries
    if (
      ctx.failureReason === "card_declined" &&
      decision.decision === "retry_payment" &&
      ctx.attemptCount >= 1
    ) {
      return {
        allowed: false,
        finalAction: "create_payment_link",
        reason: "Card declined — repeated retries blocked. Use payment link for alternative method.",
        overridden: true,
      };
    }

    // Insufficient funds — enforce wait
    if (
      ctx.failureReason === "insufficient_funds" &&
      decision.decision === "retry_payment"
    ) {
      return {
        allowed: false,
        finalAction: "wait_and_retry",
        reason: "Insufficient funds — immediate retry not allowed. Policy enforces wait_and_retry.",
        overridden: true,
      };
    }

    // Bank timeout — allow retry but cap
    if (
      ctx.failureReason === "bank_timeout" &&
      decision.decision === "retry_payment" &&
      ctx.attemptCount >= 2
    ) {
      return {
        allowed: false,
        finalAction: "create_payment_link",
        reason: "Bank timeout retry limit reached — fallback to payment link.",
        overridden: true,
      };
    }

    // Default: allow AI decision
    return {
      allowed: true,
      finalAction: decision.decision,
      reason: `Policy validation passed for ${decision.decision}.`,
      overridden: false,
    };
  }
}

export const policyEngine = new PolicyEngine();
