import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Indian synthetic data
const firstNames = [
  "Aarav","Vivaan","Aditya","Vikram","Arjun","Sai","Reyansh","Ayaan","Krishna","Ishaan",
  "Rahul","Ananya","Diya","Priya","Sneha","Kavya","Isha","Meera","Pooja","Nisha",
  "Amit","Suresh","Ramesh","Sanjay","Neha","Anjali","Riya","Shreya","Aditi","Karan",
  "Rohan","Siddharth","Harsh","Nikhil","Varun","Gaurav","Deepak","Manoj","Sunita","Lakshmi",
  "Kiran","Swati","Divya","Shalini","Rakesh","Vinay","Prakash","Ashok","Geeta","Seema",
];
const lastNames = [
  "Sharma","Verma","Gupta","Mehta","Patel","Singh","Kumar","Reddy","Nair","Iyer",
  "Joshi","Desai","Kapoor","Malhotra","Rao","Chopra","Bhat","Shetty","Agarwal","Jain",
  "Mishra","Yadav","Pandey","Trivedi","Chauhan","Khan","Ansari","Qureshi","Banerjee","Das",
];

const paymentMethods = ["upi","card","netbanking","wallet"] as const;
const failureReasons = ["insufficient_funds","bank_timeout","card_declined","expired_card","upi_failure"] as const;
const segments = ["new","returning","high_value","at_risk"] as const;

// Weighted random
function pickWeighted<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a,b)=>a+b,0);
  let r = Math.random()*total;
  for(let i=0;i<items.length;i++){
    r -= weights[i];
    if(r<=0) return items[i];
  }
  return items[items.length-1];
}

function randomAmount(): number {
  // Amount in paise, ₹299 to ₹49999
  const tiers = [
    { min: 29900, max: 99900, weight: 25 }, // 299-999
    { min: 100000, max: 499900, weight: 35 }, // 1k-5k
    { min: 500000, max: 1499000, weight: 20 }, // 5k-15k
    { min: 1500000, max: 4999900, weight: 15 }, // 15k-50k
    { min: 5000000, max: 9999000, weight: 5 }, // 50k-100k
  ];
  const tier = pickWeighted(tiers, tiers.map(t=>t.weight));
  return Math.floor(Math.random()*(tier.max - tier.min) + tier.min);
}

function randomDate(daysAgo: number): Date {
  const now = Date.now();
  const offset = Math.random()*daysAgo*24*60*60*1000;
  return new Date(now - offset);
}

function formatId(prefix: string, n: number): string {
  return `${prefix}_${String(n).padStart(6,"0")}`;
}

async function main() {
  console.log("🌱 Seeding RecoverAI...");

  // Clean existing
  await prisma.recoveryAction.deleteMany();
  await prisma.agentDecision.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.recoveryCase.deleteMany();
  await prisma.failureEvent.deleteMany();
  await prisma.paymentAttempt.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.merchant.deleteMany();
  await prisma.webhookEvent.deleteMany();

  const merchant = await prisma.merchant.create({
    data: {
      name: "Razorpay Demo Store",
      email: "merchant@recoverai.demo",
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || "rzp_test_demo",
    }
  });
  console.log(`Merchant: ${merchant.id}`);

  // Customers - 120
  const customers: any[] = [];
  for(let i=0;i<120;i++){
    const first = firstNames[Math.floor(Math.random()*firstNames.length)];
    const last = lastNames[Math.floor(Math.random()*lastNames.length)];
    const name = `${first} ${last}`;
    const email = `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`;
    const phone = `+91${Math.floor(7000000000 + Math.random()*2000000000)}`;
    const segment = pickWeighted([...segments], [20,40,20,20]);
    let lifetimeValue = 0;
    if(segment==="high_value") lifetimeValue = Math.floor(5000000 + Math.random()*5000000);
    else if(segment==="returning") lifetimeValue = Math.floor(1000000 + Math.random()*4000000);
    else if(segment==="new") lifetimeValue = Math.floor(10000 + Math.random()*500000);
    else lifetimeValue = Math.floor(50000 + Math.random()*1000000);

    const c = await prisma.customer.create({
      data: {
        merchantId: merchant.id,
        name, email, phone, segment,
        lifetimeValue,
        totalTransactions: 0,
        successfulTransactions: 0,
        previousFailures: 0,
      }
    });
    customers.push(c);
  }
  console.log(`Created ${customers.length} customers`);

  // Payments - 650
  const payments: any[] = [];
  let failedCount = 0;
  let recoveredCount = 0;

  for(let i=0;i<650;i++){
    const customer = customers[Math.floor(Math.random()*customers.length)];
    const amount = randomAmount();
    const method = pickWeighted([...paymentMethods], [45,35,12,8]);
    // 65% success, 35% failed
    const isFailed = Math.random() < 0.35;
    const failureReason = isFailed ? pickWeighted([...failureReasons], [25,30,20,10,15]) : null;
    const status = isFailed ? "failed" : (Math.random()<0.92 ? "captured" : "authorized");
    const createdAt = randomDate(30);
    // For failed, also set failedAt
    const failedAt = isFailed ? new Date(createdAt.getTime() + Math.floor(Math.random()*60000)) : null;

    const payment = await prisma.payment.create({
      data: {
        merchantId: merchant.id,
        customerId: customer.id,
        razorpayPaymentId: `pay_${Math.random().toString(36).slice(2,12)}`,
        razorpayOrderId: `order_${Math.random().toString(36).slice(2,12)}`,
        amount,
        currency: "INR",
        paymentMethod: method,
        status,
        failureReason,
        failedAt,
        createdAt,
        updatedAt: failedAt || createdAt,
      }
    });

    // Update customer stats
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        totalTransactions: { increment: 1 },
        successfulTransactions: { increment: isFailed ? 0 : 1 },
        previousFailures: { increment: isFailed ? 1 : 0 },
      }
    });

    // PaymentAttempt
    await prisma.paymentAttempt.create({
      data: {
        paymentId: payment.id,
        attemptNo: 1,
        status: isFailed ? "failed" : "success",
        errorCode: isFailed ? failureReason : null,
        gatewayResponse: isFailed ? { error: failureReason, code: "GATEWAY_ERROR" } : { status: "captured" },
        createdAt,
      }
    });

    if(isFailed){
      await prisma.failureEvent.create({
        data: {
          paymentId: payment.id,
          code: failureReason!,
          reason: getFailureReasonLabel(failureReason!),
          gatewayResponse: { reason: failureReason, timestamp: createdAt.toISOString() },
          createdAt: failedAt!,
        }
      });

      // 75% of failed get a recovery case
      if(Math.random()<0.85){
        const willRecover = Math.random() < 0.64; // 64% recovery rate
        const recoveredAt = willRecover ? new Date(failedAt!.getTime() + Math.floor(Math.random()*3600000*24)) : null;
        const recoveryProb = calculateProb(failureReason!, method, customer.segment);
        // If willRecover, bump prob
        const finalProb = willRecover ? Math.min(0.95, recoveryProb + 0.15) : Math.max(0.1, recoveryProb - 0.1);
        const rcStatus = willRecover ? "recovered" : (Math.random()<0.4 ? "failed" : (Math.random()<0.5 ? "in_progress" : "open"));

        const recoveryCase = await prisma.recoveryCase.create({
          data: {
            paymentId: payment.id,
            merchantId: merchant.id,
            status: rcStatus,
            recoveryProbability: Math.round(finalProb*100)/100,
            amountRecovered: willRecover ? amount : 0,
            lastAction: getLastAction(failureReason!),
            attemptCount: willRecover ? (failureReason==="bank_timeout" ? 1 : 1) : Math.floor(Math.random()*2)+1,
            maxAttempts: 3,
            createdAt: failedAt!,
            updatedAt: recoveredAt || new Date(),
          }
        });

        if(willRecover){
          // Update payment to recovered
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: "recovered", recoveredAt, updatedAt: recoveredAt! }
          });
          recoveredCount++;
        }
        failedCount++;

        // Create AgentDecision + RecoveryActions for audit
        const decision = getDecisionForReason(failureReason!);
        const model = pickWeighted(
          ["meta-llama/llama-3.1-8b-instruct:free","google/gemini-flash-1.5-8b:free","fallback/deterministic"],
          [50,30,20]
        );
        const confidence = 0.65 + Math.random()*0.25;
        await prisma.agentDecision.create({
          data: {
            recoveryCaseId: recoveryCase.id,
            model,
            inputContext: {
              transaction: { id: payment.id, amount, payment_method: method, failure_reason: failureReason },
              customer: { id: customer.id, segment: customer.segment, total_transactions: customer.totalTransactions }
            },
            decision: decision,
            confidence: Math.round(confidence*100)/100,
            reasoning: getReasoning(failureReason!, customer.segment),
            recoveryProbability: Math.round(finalProb*100)/100,
            fallbackAction: decision==="retry_payment" ? "create_payment_link" : "send_reminder",
            maxAttempts: decision==="retry_payment" ? 2 : 1,
            policyVerdict: Math.random()<0.85 ? "allowed" : "overridden",
            policyReason: Math.random()<0.85 ? "Policy validation passed." : "Overridden due to max attempts.",
            executedAction: decision,
            createdAt: new Date(failedAt!.getTime() + 1000),
          }
        });

        // Timeline actions
        const actions = [
          { type: "diagnose", status: "success" },
          { type: "get_history", status: "success" },
          { type: "calculate_probability", status: "success" },
          { type: "ai_decision", status: "success" },
          { type: "policy_validation", status: "success" },
          { type: decision, status: willRecover ? "success" : (rcStatus==="failed"?"failed":"success") },
        ];
        for(let idx=0; idx<actions.length; idx++){
          await prisma.recoveryAction.create({
            data: {
              recoveryCaseId: recoveryCase.id,
              type: actions[idx].type,
              status: actions[idx].status,
              output: { step: idx, simulated: true },
              isSimulated: true,
              createdAt: new Date(failedAt!.getTime() + (idx+1)*1000),
            }
          });
        }

        if(decision==="create_payment_link" || decision==="retry_payment"){
          await prisma.notification.create({
            data: {
              recoveryCaseId: recoveryCase.id,
              channel: "in_app",
              recipient: customer.email,
              template: willRecover ? "payment_link_sent" : "recovery_reminder",
              payload: { amount, method },
              status: "sent",
              sentAt: new Date(failedAt!.getTime() + 5000),
            }
          });
        }
      }
    }

    payments.push(payment);
  }

  console.log(`Created ${payments.length} payments`);
  console.log(`Failed: ${failedCount}, Recovered: ${recoveredCount}, Recovery Rate: ${((recoveredCount/failedCount)*100).toFixed(1)}%`);

  // Webhook events sample
  for(let i=0;i<10;i++){
    await prisma.webhookEvent.create({
      data: {
        razorpayEventId: `evt_${Math.random().toString(36).slice(2,14)}`,
        event: pickWeighted(["payment.failed","payment.captured","payment.authorized"], [40,40,20]),
        payload: { simulated: true, index: i },
        signatureValid: true,
        processed: Math.random()<0.9,
        processedAt: randomDate(2),
      }
    });
  }

  console.log("✅ Seed completed");
}

function getFailureReasonLabel(reason: string): string {
  const map: Record<string,string> = {
    insufficient_funds: "Insufficient funds in customer account",
    bank_timeout: "Bank gateway timeout — no response from issuer",
    card_declined: "Card declined by issuing bank",
    expired_card: "Card expired — invalid expiry date",
    upi_failure: "UPI transaction failed — collect request expired",
  };
  return map[reason] || reason;
}

function calculateProb(reason: string, method: string, segment: string): number {
  const base: Record<string,number> = {
    bank_timeout: 0.85, upi_failure: 0.6, insufficient_funds: 0.55, card_declined: 0.45, expired_card: 0.3
  };
  let p = base[reason] || 0.5;
  if(segment==="high_value") p+=0.1;
  if(segment==="returning") p+=0.05;
  if(segment==="at_risk") p-=0.1;
  return Math.max(0.05, Math.min(0.95, p));
}

function getLastAction(reason: string): string {
  const map: Record<string,string> = {
    bank_timeout: "retry_payment",
    upi_failure: "retry_payment",
    insufficient_funds: "wait_and_retry",
    card_declined: "create_payment_link",
    expired_card: "create_payment_link",
  };
  return map[reason] || "create_payment_link";
}

function getDecisionForReason(reason: string): string {
  return getLastAction(reason);
}

function getReasoning(reason: string, segment: string): string {
  if(reason==="bank_timeout") return `Transient bank timeout with ${segment} customer — immediate retry has high success likelihood.`;
  if(reason==="insufficient_funds") return `Insufficient funds requires waiting for balance refresh; fallback to payment link for ${segment} segment.`;
  if(reason==="card_declined") return `Card declined — avoid repeated retries, offer alternative payment method via secure link.`;
  if(reason==="expired_card") return `Expired card cannot be retried — generate payment link and request updated card details.`;
  return `UPI failure may be transient network issue; retry once then fallback to link for ${segment} customer.`;
}

main()
  .catch((e)=>{ console.error(e); process.exit(1); })
  .finally(async()=>{ await prisma.$disconnect(); });
