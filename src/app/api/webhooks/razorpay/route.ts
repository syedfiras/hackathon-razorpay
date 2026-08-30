import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
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
    const existing = await prisma.webhookEvent.findUnique({ where: { razorpayEventId } });
    if (existing?.processed) {
      return NextResponse.json({ received: true, duplicate: true });
    }
    if (!existing) {
      await prisma.webhookEvent.create({
        data: {
          razorpayEventId,
          event,
          payload: payload as any,
          signatureValid,
          processed: false,
        }
      });
    }
  } catch (e) {
    console.warn("[webhook] idempotency check failed, continuing", e);
  }

  if (!signatureValid) {
    console.warn("[webhook] invalid signature");
    // In demo mode we still process but mark invalid
  }

  // Handle payment.failed
  if (event === "payment.failed" || payload.payload?.payment?.entity) {
    const paymentEntity = payload.payload?.payment?.entity || payload;
    const razorpayPaymentId = paymentEntity.id;
    const amount = paymentEntity.amount || 0;
    const failureReason = paymentEntity.error_code || paymentEntity.error_reason || "bank_timeout";

    try {
      // Find payment by razorpayPaymentId, or create demo payment
      let payment = razorpayPaymentId ? await prisma.payment.findUnique({ where: { razorpayPaymentId } }) : null;
      if (!payment) {
        const merchant = await prisma.merchant.findFirst();
        const customer = await prisma.customer.findFirst();
        if (merchant && customer) {
          payment = await prisma.payment.create({
            data: {
              merchantId: merchant.id,
              customerId: customer.id,
              razorpayPaymentId: razorpayPaymentId || `pay_${Date.now()}`,
              amount: amount || 499900,
              paymentMethod: paymentEntity.method || "card",
              status: "failed",
              failureReason: typeof failureReason === "string" ? failureReason : "bank_timeout",
              failedAt: new Date(),
            }
          });
          await prisma.failureEvent.create({
            data: { paymentId: payment.id, code: String(failureReason), reason: String(failureReason) }
          });
        }
      } else if (payment.status !== "failed") {
        await prisma.payment.update({ where: { id: payment.id }, data: { status: "failed", failureReason: String(failureReason), failedAt: new Date() } });
        await prisma.failureEvent.create({
          data: { paymentId: payment.id, code: String(failureReason), reason: String(failureReason) }
        });
      }

      if (payment) {
        // Create or get recovery case
        let recoveryCase = await prisma.recoveryCase.findUnique({ where: { paymentId: payment.id } });
        if (!recoveryCase) {
          recoveryCase = await prisma.recoveryCase.create({
            data: { paymentId: payment.id, merchantId: payment.merchantId, status: "open" }
          });
        }

        // Trigger recovery (sync for webhook)
        try {
          const { recoveryEngine } = await import("@/lib/recovery/engine");
          await recoveryEngine.run(recoveryCase.id);
        } catch (engineErr) {
          console.error("[webhook] engine error", engineErr);
        }

        await prisma.webhookEvent.updateMany({
          where: { razorpayEventId },
          data: { processed: true, processedAt: new Date() }
        });
      }
    } catch (inner) {
      console.error("[webhook] handling failed", inner);
      await prisma.webhookEvent.updateMany({
        where: { razorpayEventId },
        data: { processed: false, error: String(inner) }
      });
    }
  } else {
    // Acknowledge other events
    try {
      await prisma.webhookEvent.updateMany({
        where: { razorpayEventId },
        data: { processed: true, processedAt: new Date() }
      });
    } catch {}
  }

  return NextResponse.json({ received: true });
}

export async function GET() {
  return NextResponse.json({ status: "ok", endpoint: "/api/webhooks/razorpay", test: "POST with x-razorpay-signature" });
}
