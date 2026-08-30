import type { FailureReason, AIDecisionAction } from "@/types";

export interface Strategy {
  primary: AIDecisionAction;
  fallback: AIDecisionAction;
  maxAttempts: number;
  delayMinutes?: number;
  description: string;
}

const STRATEGIES: Record<FailureReason, Strategy> = {
  bank_timeout: {
    primary: "retry_payment",
    fallback: "create_payment_link",
    maxAttempts: 3,
    description: "Transient gateway timeout — retry up to 3 times, then fallback to payment link",
  },
  upi_failure: {
    primary: "retry_payment",
    fallback: "create_payment_link",
    maxAttempts: 1,
    description: "UPI network issue — single retry, then payment link",
  },
  insufficient_funds: {
    primary: "wait_and_retry",
    fallback: "create_payment_link",
    maxAttempts: 2,
    delayMinutes: 60,
    description: "Insufficient funds — wait, retry later, then payment link with reminder",
  },
  card_declined: {
    primary: "create_payment_link",
    fallback: "send_reminder",
    maxAttempts: 1,
    description: "Card declined — do not retry, generate link for alternative method",
  },
  expired_card: {
    primary: "create_payment_link",
    fallback: "escalate",
    maxAttempts: 1,
    description: "Expired card — never retry, link + request updated method",
  },
};

export function getStrategy(reason: FailureReason): Strategy {
  return STRATEGIES[reason] || STRATEGIES["bank_timeout"];
}

export function getFallback(reason: FailureReason): Strategy {
  return STRATEGIES[reason];
}
