import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db/supabase";
import { verifyWebhookSignature } from "@/lib/razorpay/webhooks";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") || "";

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const signatureValid = verifyWebhookSignature(rawBody, signature);
  const razorpayEventId = payload.entity || `evt_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
  const event = payload.event || payload.entity || "unknown";

  // Idempotency: check existing
  try {
    const { data: existing } = await supabase
      .from("webhook_events")
      .select("*")
      .eq("razorpay_event_id", razorpayEventId)
      .maybeSingle();
    if ((existing as any)?.processed) {
      return NextResponse.json({ received: true, duplicate: true });
    }
    if (!existing) {
      await supabase.from("webhook_events").insert({
        razorpay_event_id: razorpayEventId,
        event,
        payload: payload as any,
        signature_valid: signatureValid,
        processed: false,
      });
    }
  } catch (e) {
    console.warn("[webhook] idempotency check failed, continuing", e);
  }

  if (!signatureValid) {
    console.warn("[webhook] invalid signature");
  }

  // Handle payment.failed
  if (event === "payment.failed" || payload.payload?.payment?.entity) {
    const paymentEntity = payload.payload?.payment?.entity || payload;
    const razorpayPaymentId = paymentEntity.id;
    const amount = paymentEntity.amount || 0;
    const failureReason = paymentEntity.error_code || paymentEntity.error_reason || "bank_timeout";

    try {
      // Find payment by razorpayPaymentId, or create demo payment
      let payment: any = null;
      if (razorpayPaymentId) {
        const { data } = await supabase
          .from("payments")
          .select("*")
          .eq("razorpay_payment_id", razorpayPaymentId)
          .maybeSingle();
        payment = data;
      }
      if (!payment) {
        const { data: merchants } = await supabase.from("merchants").select("*").limit(1);
        const { data: customers } = await supabase.from("customers").select("*").limit(1);
        const merchant = merchants?.[0] as any;
        const customer = customers?.[0] as any;
        if (merchant && customer) {
          const { data: newPayment } = await supabase
            .from("payments")
            .insert({
              merchant_id: merchant.id,
              customer_id: customer.id,
              razorpay_payment_id: razorpayPaymentId || `pay_${Date.now()}`,
              amount: amount || 499900,
              payment_method: paymentEntity.method || "card",
              status: "failed",
              failure_reason: typeof failureReason === "string" ? failureReason : "bank_timeout",
              failed_at: new Date().toISOString(),
            })
            .select()
            .single();
          payment = newPayment;
          await supabase.from("failure_events").insert({
            payment_id: (payment as any).id,
            code: String(failureReason),
            reason: String(failureReason),
          });
        }
      } else if ((payment as any).status !== "failed") {
        await supabase
          .from("payments")
          .update({
            status: "failed",
            failure_reason: String(failureReason),
            failed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", (payment as any).id);
        await supabase.from("failure_events").insert({
          payment_id: (payment as any).id,
          code: String(failureReason),
          reason: String(failureReason),
        });
      }

      if (payment) {
        // Create or get recovery case
        const { data: existingCase } = await supabase
          .from("recovery_cases")
          .select("*")
          .eq("payment_id", (payment as any).id)
          .maybeSingle();
        let recoveryCase: any = existingCase;
        if (!recoveryCase) {
          const { data: newCase } = await supabase
            .from("recovery_cases")
            .insert({
              payment_id: (payment as any).id,
              merchant_id: (payment as any).merchant_id,
              status: "open",
            })
            .select()
            .single();
          recoveryCase = newCase;
        }

        // Trigger recovery (sync for webhook)
        try {
          const { recoveryEngine } = await import("@/lib/recovery/engine");
          await recoveryEngine.run((recoveryCase as any).id);
        } catch (engineErr) {
          console.error("[webhook] engine error", engineErr);
        }

        await supabase
          .from("webhook_events")
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq("razorpay_event_id", razorpayEventId);
      }
    } catch (inner) {
      console.error("[webhook] handling failed", inner);
      await supabase
        .from("webhook_events")
        .update({ processed: false, error: String(inner) })
        .eq("razorpay_event_id", razorpayEventId);
    }
  } else {
    // Acknowledge other events
    try {
      await supabase
        .from("webhook_events")
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq("razorpay_event_id", razorpayEventId);
    } catch {}
  }

  return NextResponse.json({ received: true });
}

export async function GET() {
  return NextResponse.json({ status: "ok", endpoint: "/api/webhooks/razorpay", test: "POST with x-razorpay-signature" });
}
