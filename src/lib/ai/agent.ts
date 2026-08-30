import type { TransactionContext, AIDecision } from "@/types";
import type { AIProvider } from "./provider";
import { OpenRouterProvider } from "./openrouter";
import { deterministicFallback } from "./fallback";
import { AI_CONFIG } from "./config";

export class AIAgent {
  private provider: AIProvider;
  private fallbackEnabled: boolean;

  constructor(provider?: AIProvider, fallbackEnabled = true) {
    this.provider = provider || new OpenRouterProvider(AI_CONFIG.model);
    this.fallbackEnabled = fallbackEnabled;
  }

  async decide(
    context: TransactionContext
  ): Promise<{ decision: AIDecision; model: string; isFallback: boolean; error?: string }> {
    // Try provider, fallback to deterministic on failure
    try {
      const decision = await this.provider.decide(context);
      return {
        decision: this.sanitize(decision),
        model: this.provider.model,
        isFallback: false,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown AI error";
      console.warn(`[AIAgent] Provider failed (${error}), using fallback`);
      if (!this.fallbackEnabled) throw err;
      const fallbackDecision = deterministicFallback(context);
      return {
        decision: fallbackDecision,
        model: `fallback/deterministic`,
        isFallback: true,
        error,
      };
    }
  }

  private sanitize(d: AIDecision): AIDecision {
    // Clamp and round
    return {
      ...d,
      confidence: Math.max(0, Math.min(1, Math.round(d.confidence * 100) / 100)),
      recovery_probability: Math.max(
        0.05,
        Math.min(0.95, Math.round(d.recovery_probability * 100) / 100)
      ),
      max_attempts: Math.max(1, Math.min(3, Math.round(d.max_attempts))),
    };
  }
}

export const agent = new AIAgent();
