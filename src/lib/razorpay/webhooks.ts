import crypto from "crypto";
import { env } from "@/lib/env";

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[Razorpay] RAZORPAY_WEBHOOK_SECRET not set — skipping verification (demo mode)");
    return true;
  }
  if (!signature) return false;
  try {
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    // Use timingSafeEqual
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature, "utf8");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function parseWebhookEvent(payload: any): { event: string; paymentId?: string; orderId?: string } {
  const event = payload.event || "unknown";
  const paymentId = payload.payload?.payment?.entity?.id;
  const orderId = payload.payload?.payment?.entity?.order_id || payload.payload?.order?.entity?.id;
  return { event, paymentId, orderId };
}
