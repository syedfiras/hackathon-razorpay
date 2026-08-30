# RecoverAI — AI Revenue Recovery Platform

**Razorpay AI Buildathon — AI Revenue Recovery track**

Autonomous AI revenue recovery: **Detect → Diagnose → Decide → Act → Measure**

RecoverAI detects failed payments, understands why they failed, selects the best recovery strategy with AI, validates against deterministic business rules, executes recovery, and measures revenue recovered — all as an autonomous agent, not a chatbot.

![Demo Mode](https://img.shields.io/badge/Demo-Test%20Mode-amber) ![No Paid APIs](https://img.shields.io/badge/Cost-%E2%82%B90%20Only-green) ![Stack](https://img.shields.io/badge/Stack-Next.js%20%7C%20Prisma%20%7C%20OpenRouter-blue)

---

## Live Demo Flow (30 seconds)

1. Click **Simulate Failed Payment** → pick amount, failure reason (Bank Timeout, Insufficient Funds, Card Declined, Expired Card, UPI Failure), method (UPI/Card/Netbanking/Wallet)
2. `POST /api/demo/simulate-failure` creates a realistic payment + `RecoveryCase`
3. **Context Builder** pulls payment + customer history + failure
4. **Scoring** calculates deterministic recovery probability
5. **AI Agent** (OpenRouter free model) returns structured JSON decision
6. **Policy Engine** validates/overrides (e.g., never retry expired card)
7. **Recovery Tool** executes simulated retry / payment link
8. **Timeline** shows every step with audit, policy verdict, and revenue recovered
9. **Dashboard KPIs** update instantly: Revenue Recovered, Recovery Rate, etc.

All simulated — **no real money**, clearly labeled `SIMULATED • TEST MODE`.

---

## Tech Stack (exact per spec)

- **Frontend:** Next.js 16 (App Router) • TypeScript strict • Tailwind v4 • shadcn/ui • Lucide • Recharts
- **Backend:** Next.js Route Handlers (server TypeScript only)
- **DB:** Supabase PostgreSQL (free) • Prisma 6 ORM (mock fallback when `DATABASE_URL` not set)
- **AI:** OpenRouter free models • configurable via `OPENROUTER_MODEL` • provider abstraction `lib/ai/provider.ts` — no hard-coded model
- **Payments:** Razorpay Test Mode • `lib/razorpay/*` singleton (no secret on client)
- **Jobs:** Inngest (`lib/jobs/*`) — sync path for demo latency + async for webhooks
- **Deploy:** Vercel

₹0 constraint: OpenRouter `openrouter/free`, Razorpay test keys, simulated notifications (in-app), Supabase free, Vercel hobby.

---

## Quick Start

```bash
git clone <repo> && cd hackathon-razorpay
npm install
cp .env.example .env
# Edit .env — see below
npx prisma generate
# If you have Supabase DATABASE_URL:
npx prisma db push
npm run db:seed   # 120 customers, 650 payments, recovery cases
npm run dev       # http://localhost:3000 → redirects to /dashboard
```

### Environment

```env
DATABASE_URL="postgresql://postgres:[PASS]@[REF].supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[PASS]@[REF].supabase.co:5432/postgres"

OPENROUTER_API_KEY=""  # optional — falls back to deterministic strategy if empty/unreachable
OPENROUTER_MODEL="meta-llama/llama-3.1-8b-instruct:free"
# Alternatives: google/gemini-flash-1.5-8b:free, mistralai/mistral-7b-instruct:free

RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="..."
RAZORPAY_WEBHOOK_SECRET="..."

NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

> **No DB?** The app works with **mock fallback** (`src/lib/mock/generate.ts`): `getKPIs()`, `getPayments()`, `getRecoveryCases()` try Prisma, fall back to deterministic synthetic data. Judges can run without Supabase.

---

## Architecture

```
Razorpay webhook / Demo trigger
  → Failure Detector (api/webhooks/razorpay)
  → Context Builder (lib/recovery/context.ts)
  → Scoring (lib/recovery/scoring.ts)
  → AI Agent (lib/ai/agent.ts → provider.ts → openrouter.ts → prompts.ts)
     ↘ fallback deterministic (lib/ai/fallback.ts) if OpenRouter fails
  → PolicyEngine (lib/recovery/policy-engine.ts) validate/override
  → Recovery Engine (lib/recovery/engine.ts) → tools (retry/link/message)
  → Outcome + Timeline (RecoveryAction) + AgentDecision audit
  → Analytics (KPIs)
```

**Policy examples:**
- `expired_card` → never `retry_payment`, force `create_payment_link`
- `card_declined` → block repeated retries after 1 attempt
- `insufficient_funds` → enforce `wait_and_retry` (60 min), not immediate retry
- `bank_timeout` → allow up to 3 retries then `create_payment_link`
- Max attempts exceeded → override to `create_payment_link` or `escalate`

All decisions stored in `AgentDecision` with: transaction ID, model, input context, AI JSON, confidence, reasoning, policy verdict, executed action, timestamp.

Webhook handling idempotent via `WebhookEvent.razorpayEventId UNIQUE`.

---

## Dashboard Sections

- **Overview:** 6 KPI cards (Revenue At Risk, Revenue Recovered, Recovery Rate, Failed Payments, Successful Recoveries, Avg Recovery), recovery trend (Area), failure distribution (Pie), by payment method (Bar), by segment / AI actions, recent cases
- **Recovery Cases:** table (txn ID, customer, amount, failure reason, probability, AI recommendation, status, amount recovered, last action, time) — click for drawer with timeline + decision JSON + policy + audit
- **Transactions:** filter by status / amount / method / failure reason / date
- **Analytics:** recovery rate over time, revenue recovered, failure reasons, by method, by segment, AI actions vs success
- **Settings:** env status, merchant, architecture diagram, ₹0 notes

---

## Demo Mode — Strongest Asset

`Simulate Failed Payment` button (header + dashboard). Pick:
- Amount: ₹499 / ₹1,999 / ₹4,999 / ₹12,999 / ₹24,999 / ₹49,999
- Failure: Insufficient funds, Bank timeout, Card declined, Expired card, UPI failure
- Method: UPI, Card, Netbanking, Wallet

Triggers full autonomous loop and shows live timeline:

```
Payment failed → Failure diagnosed → Customer history retrieved → Recovery probability 87% → AI decision (retry_payment, confidence 0.91) → Policy validation passed → Retry initiated → Payment recovered → ₹4,999 recovered
```

Try: Bank timeout + returning customer → `retry_payment` (high prob). Expired card → always `create_payment_link` (policy blocks retry).

---

## Database Schema (Prisma)

`Merchant → Customer → Payment → PaymentAttempt / FailureEvent / RecoveryCase → AgentDecision / RecoveryAction` + `Notification` + `WebhookEvent`

See `prisma/schema.prisma`. Seed: `prisma/seed.ts` (Indian names, INR, UPI/Card/Netbanking/Wallet, realistic amounts).

---

## API Routes

- `POST /api/demo/simulate-failure` — demo trigger (DB or mock)
- `POST /api/webhooks/razorpay` — Razorpay webhook (HMAC, idempotent, triggers engine)
- `GET /api/kpis` — KPIs (DB or mock)
- `GET /api/recovery-cases?status=&take=` — cases
- `GET /api/transactions?status=&method=&failureReason=&take=&skip=` — payments
- `GET/POST /api/inngest` — Inngest serve

---

## Testing the Flow Without Keys

- No `OPENROUTER_API_KEY` → deterministic fallback (still validates policy, still shows timeline)
- No `RAZORPAY_*` → simulated client (`lib/razorpay/client.ts` returns `{simulated: true}`)
- No `DATABASE_URL` or unreachable → mock fallback (seed data shown, demo still triggers but not persisted)
- Kill OpenRouter (timeout 8s, 1 retry) → fallback ensures app remains usable

---

## Folder Structure (abridged)

```
app/{dashboard,recovery,transactions,analytics,settings,api/{webhooks/razorpay,demo,kpis,recovery,inngest}}
components/{ui,dashboard,recovery,transactions,demo,layout}
lib/{ai/{provider,openrouter,agent,prompts,tools,fallback,config},razorpay, recovery/{engine,policy-engine,strategies,scoring,context}, db/prisma, jobs/{inngest,functions}, mock/generate, data}
prisma/{schema.prisma, seed.ts}
types/index.ts
```

Clean boundaries: no client secrets, Zod validation, `cn()` utils, loading/error/empty states, responsive (sidebar + mobile nav).

---

## Deployment

Vercel: set env vars, `prisma generate` runs on build, `DATABASE_URL` required for persistence. Inngest dev server optional locally (`npx inngest-cli dev`).

---

## Credits

Built for Razorpay AI Buildathon. Simulates INR payments with Indian customers/methods. All data synthetic, no real PII or money.

```

Why RecoverAI: core metric is **Revenue Recovered**, not AI calls.
```

