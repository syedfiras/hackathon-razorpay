export type PaymentMethod = "upi" | "card" | "netbanking" | "wallet";
export type FailureReason =
  | "insufficient_funds"
  | "bank_timeout"
  | "card_declined"
  | "expired_card"
  | "upi_failure";

export type PaymentStatus =
  | "created"
  | "authorized"
  | "captured"
  | "failed"
  | "recovered"
  | "pending";

export type RecoveryStatus =
  | "open"
  | "in_progress"
  | "recovered"
  | "failed"
  | "escalated";

export type RecoveryActionType =
  | "diagnose"
  | "get_history"
  | "calculate_probability"
  | "ai_decision"
  | "policy_validation"
  | "retry_payment"
  | "create_payment_link"
  | "send_message"
  | "escalate"
  | "record";

export type AIDecisionAction =
  | "retry_payment"
  | "create_payment_link"
  | "send_reminder"
  | "escalate"
  | "wait_and_retry";

export interface TransactionContext {
  transaction: {
    id: string;
    amount: number;
    currency: string;
    payment_method: PaymentMethod;
    failure_reason: FailureReason;
    created_at: string;
    attempt_count: number;
  };
  customer: {
    id: string;
    name: string;
    email: string;
    total_transactions: number;
    successful_transactions: number;
    previous_failures: number;
    lifetime_value: number;
    segment: string;
  };
  history: {
    recent_failures: number;
    recovery_rate: number;
  };
}

export interface AIDecision {
  decision: AIDecisionAction;
  confidence: number;
  reason: string;
  recovery_probability: number;
  fallback_action: AIDecisionAction;
  max_attempts: number;
}

export interface PolicyValidation {
  allowed: boolean;
  finalAction: AIDecisionAction;
  reason: string;
  overridden: boolean;
}

export interface KPIs {
  revenueAtRisk: number;
  revenueRecovered: number;
  recoveryRate: number;
  failedPayments: number;
  successfulRecoveries: number;
  averageRecoveryAmount: number;
  totalPayments: number;
}

export interface RecoveryTimelineItem {
  timestamp: string;
  title: string;
  description: string;
  status: "success" | "pending" | "failed" | "info";
  amount?: number;
}
