-- RecoverAI Supabase Migration — replaces prisma/schema.prisma
-- Run in Supabase SQL Editor or via supabase db push
-- Tables: merchants, customers, payments, payment_attempts, failure_events, recovery_cases, agent_decisions, recovery_actions, notifications, webhook_events

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Helper: updated_at trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 1. merchants
create table if not exists merchants (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  email text not null unique,
  razorpay_key_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists update_merchants_updated_at on merchants;
create trigger update_merchants_updated_at before update on merchants for each row execute function update_updated_at_column();

-- 2. customers
create table if not exists customers (
  id text primary key default gen_random_uuid()::text,
  merchant_id text not null references merchants(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  segment text not null default 'new',
  lifetime_value integer not null default 0,
  total_transactions integer not null default 0,
  successful_transactions integer not null default 0,
  previous_failures integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customers_merchant_id_idx on customers(merchant_id);
create index if not exists customers_email_idx on customers(email);
create index if not exists customers_segment_idx on customers(segment);
drop trigger if exists update_customers_updated_at on customers;
create trigger update_customers_updated_at before update on customers for each row execute function update_updated_at_column();

-- 3. payments
create table if not exists payments (
  id text primary key default gen_random_uuid()::text,
  merchant_id text not null references merchants(id) on delete cascade,
  customer_id text not null references customers(id) on delete cascade,
  razorpay_payment_id text unique,
  razorpay_order_id text,
  amount integer not null,
  currency text not null default 'INR',
  payment_method text not null,
  status text not null,
  failure_reason text,
  failed_at timestamptz,
  recovered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payments_merchant_id_status_idx on payments(merchant_id, status);
create index if not exists payments_customer_id_idx on payments(customer_id);
create index if not exists payments_status_idx on payments(status);
create index if not exists payments_payment_method_idx on payments(payment_method);
create index if not exists payments_failure_reason_idx on payments(failure_reason);
create index if not exists payments_created_at_idx on payments(created_at);
drop trigger if exists update_payments_updated_at on payments;
create trigger update_payments_updated_at before update on payments for each row execute function update_updated_at_column();

-- 4. payment_attempts
create table if not exists payment_attempts (
  id text primary key default gen_random_uuid()::text,
  payment_id text not null references payments(id) on delete cascade,
  attempt_no integer not null,
  status text not null,
  error_code text,
  gateway_response jsonb,
  created_at timestamptz not null default now()
);
create index if not exists payment_attempts_payment_id_idx on payment_attempts(payment_id);

-- 5. failure_events
create table if not exists failure_events (
  id text primary key default gen_random_uuid()::text,
  payment_id text not null references payments(id) on delete cascade,
  code text not null,
  reason text not null,
  gateway_response jsonb,
  created_at timestamptz not null default now()
);
create index if not exists failure_events_payment_id_idx on failure_events(payment_id);

-- 6. recovery_cases
create table if not exists recovery_cases (
  id text primary key default gen_random_uuid()::text,
  payment_id text not null unique references payments(id) on delete cascade,
  merchant_id text not null references merchants(id) on delete cascade,
  status text not null default 'open',
  recovery_probability double precision,
  amount_recovered integer not null default 0,
  last_action text,
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists recovery_cases_merchant_id_status_idx on recovery_cases(merchant_id, status);
create index if not exists recovery_cases_status_idx on recovery_cases(status);
drop trigger if exists update_recovery_cases_updated_at on recovery_cases;
create trigger update_recovery_cases_updated_at before update on recovery_cases for each row execute function update_updated_at_column();

-- 7. agent_decisions
create table if not exists agent_decisions (
  id text primary key default gen_random_uuid()::text,
  recovery_case_id text not null references recovery_cases(id) on delete cascade,
  model text not null,
  input_context jsonb not null,
  decision text not null,
  confidence double precision not null,
  reasoning text not null,
  recovery_probability double precision not null,
  fallback_action text,
  max_attempts integer not null default 2,
  policy_verdict text not null,
  policy_reason text,
  executed_action text not null,
  created_at timestamptz not null default now()
);
create index if not exists agent_decisions_recovery_case_id_idx on agent_decisions(recovery_case_id);

-- 8. recovery_actions
create table if not exists recovery_actions (
  id text primary key default gen_random_uuid()::text,
  recovery_case_id text not null references recovery_cases(id) on delete cascade,
  type text not null,
  status text not null,
  input jsonb,
  output jsonb,
  is_simulated boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists recovery_actions_recovery_case_id_idx on recovery_actions(recovery_case_id);
create index if not exists recovery_actions_type_idx on recovery_actions(type);

-- 9. notifications
create table if not exists notifications (
  id text primary key default gen_random_uuid()::text,
  recovery_case_id text not null references recovery_cases(id) on delete cascade,
  channel text not null,
  recipient text not null,
  template text not null,
  payload jsonb,
  status text not null default 'pending',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_recovery_case_id_idx on notifications(recovery_case_id);

-- 10. webhook_events
create table if not exists webhook_events (
  id text primary key default gen_random_uuid()::text,
  razorpay_event_id text not null unique,
  event text not null,
  payload jsonb not null,
  signature_valid boolean not null,
  processed boolean not null default false,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists webhook_events_event_idx on webhook_events(event);
create index if not exists webhook_events_processed_idx on webhook_events(processed);

-- RLS: Disable for hackathon (service_role bypasses RLS). Enable if you want anon policies.
-- To keep simple, disable RLS. If you enable, add policies.
alter table merchants disable row level security;
alter table customers disable row level security;
alter table payments disable row level security;
alter table payment_attempts disable row level security;
alter table failure_events disable row level security;
alter table recovery_cases disable row level security;
alter table agent_decisions disable row level security;
alter table recovery_actions disable row level security;
alter table notifications disable row level security;
alter table webhook_events disable row level security;
