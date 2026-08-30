import type { TransactionContext, AIDecision } from "@/types";
import type { AIProvider } from "./provider";
import { parseAIJson, validateAIDecision } from "./provider";
import { buildMessages } from "./prompts";
import { AI_CONFIG } from "./config";

export class OpenRouterProvider implements AIProvider {
  name = "openrouter";
  model: string;

  constructor(model?: string) {
    this.model = model || AI_CONFIG.model;
  }

  async decide(context: TransactionContext): Promise<AIDecision> {
    if (!AI_CONFIG.apiKey) {
      throw new Error("OPENROUTER_API_KEY not configured");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_CONFIG.timeoutMs);

    try {
      const res = await fetch(`${AI_CONFIG.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AI_CONFIG.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          "X-Title": "RecoverAI",
        },
        body: JSON.stringify({
          model: this.model,
          messages: buildMessages(context),
          temperature: 0.2,
          max_tokens: 600,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`OpenRouter ${res.status}: ${text.slice(0, 400)}`);
      }

      const json = await res.json() as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const content = json.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty response from OpenRouter");

      const parsed = parseAIJson(content);
      return validateAIDecision(parsed);
    } finally {
      clearTimeout(timeout);
    }
  }
}
