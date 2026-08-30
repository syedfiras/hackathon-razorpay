import type { TransactionContext, AIDecision } from "@/types";
import { z } from "zod";

export const AIDecisionSchema = z.object({
  decision: z.enum([
    "retry_payment",
    "create_payment_link",
    "send_reminder",
    "escalate",
    "wait_and_retry",
  ]),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(10).max(500),
  recovery_probability: z.number().min(0).max(1),
  fallback_action: z.enum([
    "retry_payment",
    "create_payment_link",
    "send_reminder",
    "escalate",
    "wait_and_retry",
  ]),
  max_attempts: z.number().int().min(1).max(3),
});

export interface AIProvider {
  name: string;
  model: string;
  decide(context: TransactionContext): Promise<AIDecision>;
}

export function validateAIDecision(raw: unknown): AIDecision {
  const parsed = AIDecisionSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Invalid AI decision: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")}`
    );
  }
  return parsed.data;
}

export function parseAIJson(content: string): unknown {
  // Free models sometimes wrap in markdown code blocks
  const cleaned = content
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned);
}
