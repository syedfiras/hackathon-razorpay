import { env } from "@/lib/env";

export const AI_CONFIG = {
  get model() {
    return env.OPENROUTER_MODEL;
  },
  get apiKey() {
    return env.OPENROUTER_API_KEY;
  },
  baseUrl: "https://openrouter.ai/api/v1",
  timeoutMs: 8000,
  maxRetries: 1,
} as const;

export const ALLOWED_ACTIONS = [
  "retry_payment",
  "create_payment_link",
  "send_reminder",
  "escalate",
  "wait_and_retry",
] as const;
