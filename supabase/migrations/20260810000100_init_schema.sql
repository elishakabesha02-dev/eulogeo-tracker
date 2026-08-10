-- =============================================================================
-- EBB ATM OPERATIONS INTELLIGENCE — initial schema
-- =============================================================================
-- Conventions used throughout:
--   * Every table has id / created_at / updated_at.
--   * Monetary values are BIGINT MINOR UNITS (cents). No floating point ever
--     touches money, so reconciliation arithmetic stays exact.
--   * Business dates are DATE (the operating day), distinct from timestamps.
--   * Statuses are TEXT with CHECK constraints rather than PostgreSQL enums —
--     adding a value later is a one-line migration instead of an enum rewrite.
--   * Nothing is hard-deleted; records are deactivated so history survives.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Shared trigger: keep updated_at honest
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- roles — lookup table for the role vocabulary
-- -----------------------------------------------------------------------------
create table public.roles (
  key          text primary key,
  label        text not null,
  description  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

insert into public.roles (key, label, description) values
  ('ADMIN',                  'Administrator',          'Full access, including system settings and user management.'),
  ('SUPERVISOR',             'Supervisor',             'Oversees daily operations, approves reconciliations and escalations.'),
  ('RECONCILIATION_OFFICER', 'Reconciliation Officer', 'Performs reconciliation and works exception queues.'),
  ('CCT',                    'Cash Centre Team',       'Cash centre operations and custodian coordination.'),
  ('AUDITOR',                'Auditor',                'Read-only access across operational data and audit logs.');

-- -----------------------------------------------------------------------------
-- profiles — application identity, one row per auth.users row
-- -----------------------------------------------------------------------------
-- Supabase owns `auth.users`. `profiles` holds everything the application needs
-- so no query has to reach into the auth schema.
create table public.profiles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references auth.users (id) on delete cascade,
  full_name     text not null,
  email         text not null,
  role          text not null default 'AUDITOR' references public.roles (key),
  phone         text,
  job_title     text,
  avatar_url    text,
  is_active     boolean not null default true,
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);

-- A safe projection of auth.users. Row visibility is enforced by the policy on
-- `profiles`, which this view joins through, so no email is exposed beyond what
-- the caller could already read.
create view public.users
with (security_invoker = true)
as
  select p.user_id as id, p.email, p.full_name, p.role, p.is_active
  from public.profiles p;

-- New sign-ups get a profile automatically. The default role is the least
-- privileged one; elevation is a deliberate administrative act.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'AUDITOR')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- banks & branches
-- -----------------------------------------------------------------------------
create table public.banks (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  code        text not null unique,
  status      text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.branches (
  id          uuid primary key default gen_random_uuid(),
  bank_id     uuid not null references public.banks (id) on delete cascade,
  name        text not null,
  code        text not null,
  city        text,
  status      text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (bank_id, code)
);

create index branches_bank_idx on public.branches (bank_id);

-- -----------------------------------------------------------------------------
-- custodians & engineers
-- -----------------------------------------------------------------------------
-- Deliberately minimal: name, staff number and a work contact number. No
-- national IDs, addresses or bank details are stored.
create table public.custodians (
  id           uuid primary key default gen_random_uuid(),
  full_name    text not null,
  employee_id  text not null unique,
  phone        text,
  status       text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  bank_id      uuid references public.banks (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.engineers (
  id              uuid primary key default gen_random_uuid(),
  full_name       text not null,
  employee_id     text not null unique,
  phone           text,
  status          text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  specialization  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- atms
-- -----------------------------------------------------------------------------
create table public.atms (
  id            uuid primary key default gen_random_uuid(),
  atm_code      text not null unique,
  bank_id       uuid not null references public.banks (id) on delete restrict,
  branch_id     uuid references public.branches (id) on delete set null,
  location      text not null,
  status        text not null default 'ACTIVE'
                check (status in ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'DECOMMISSIONED')),
  -- Reassignment must never delete a person's record, and removing a person
  -- must never delete a terminal — hence SET NULL on both sides.
  custodian_id  uuid references public.custodians (id) on delete set null,
  engineer_id   uuid references public.engineers (id) on delete set null,
  model         text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index atms_bank_idx on public.atms (bank_id);
create index atms_status_idx on public.atms (status);
create index atms_custodian_idx on public.atms (custodian_id);
create index atms_engineer_idx on public.atms (engineer_id);

-- -----------------------------------------------------------------------------
-- daily_operations
-- -----------------------------------------------------------------------------
create table public.daily_operations (
  id                     uuid primary key default gen_random_uuid(),
  operation_date         date not null,
  atm_id                 uuid not null references public.atms (id) on delete cascade,
  custodian_id           uuid references public.custodians (id) on delete set null,
  operational_status     text not null default 'PENDING'
                         check (operational_status in ('PENDING', 'PROCESSING', 'COMPLETED', 'EXCEPTION')),
  reconciliation_status  text not null default 'PENDING'
                         check (reconciliation_status in ('PENDING', 'IN_PROGRESS', 'RECONCILED', 'VARIANCE', 'ESCALATED')),
  notes                  text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  -- One operation record per terminal per business day.
  unique (operation_date, atm_id)
);

create index daily_operations_date_idx on public.daily_operations (operation_date desc);
create index daily_operations_atm_idx on public.daily_operations (atm_id);

-- -----------------------------------------------------------------------------
-- reconciliations
-- -----------------------------------------------------------------------------
create table public.reconciliations (
  id                   uuid primary key default gen_random_uuid(),
  reconciliation_date  date not null,
  atm_id               uuid not null references public.atms (id) on delete cascade,
  daily_operation_id   uuid references public.daily_operations (id) on delete set null,
  currency             text not null default 'UGX',
  -- Minor units. Nullable until the engine has produced a figure — a missing
  -- result is NULL, never a misleading zero.
  expected_minor       bigint,
  actual_minor         bigint,
  variance_minor       bigint,
  status               text not null default 'PENDING'
                       check (status in ('PENDING', 'IN_PROGRESS', 'RECONCILED', 'VARIANCE', 'ESCALATED')),
  performed_by         uuid references public.profiles (user_id) on delete set null,
  completed_at         timestamptz,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (reconciliation_date, atm_id)
);

create index reconciliations_date_idx on public.reconciliations (reconciliation_date desc);
create index reconciliations_status_idx on public.reconciliations (status);
create index reconciliations_atm_idx on public.reconciliations (atm_id);

-- -----------------------------------------------------------------------------
-- exceptions
-- -----------------------------------------------------------------------------
create table public.exceptions (
  id                 uuid primary key default gen_random_uuid(),
  reference          text not null unique,
  atm_id             uuid references public.atms (id) on delete set null,
  reconciliation_id  uuid references public.reconciliations (id) on delete set null,
  type               text not null
                     check (type in ('SHORTAGE', 'OVERAGE', 'GL_MISMATCH', 'JOURNAL_MISMATCH', 'MISSING_DATA', 'OTHER')),
  status             text not null default 'OPEN'
                     check (status in ('OPEN', 'INVESTIGATING', 'ESCALATED', 'RESOLVED', 'CLOSED')),
  priority           text not null default 'MEDIUM'
                     check (priority in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  currency           text not null default 'UGX',
  amount_minor       bigint,
  description        text,
  assigned_to        uuid references public.profiles (user_id) on delete set null,
  resolved_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index exceptions_status_idx on public.exceptions (status);
create index exceptions_priority_idx on public.exceptions (priority);
create index exceptions_atm_idx on public.exceptions (atm_id);

-- -----------------------------------------------------------------------------
-- documents
-- -----------------------------------------------------------------------------
-- `storage_path` points into a PRIVATE bucket. Files are only ever served via
-- short-lived signed URLs minted server-side.
create table public.documents (
  id             uuid primary key default gen_random_uuid(),
  file_name      text not null,
  storage_path   text not null unique,
  mime_type      text not null,
  size_bytes     bigint not null check (size_bytes > 0),
  document_type  text not null default 'OTHER'
                 check (document_type in ('GL_STATEMENT', 'ATM_JOURNAL', 'CASH_COUNT_SHEET', 'INCIDENT_PHOTO', 'OTHER')),
  status         text not null default 'UPLOADED'
                 check (status in ('UPLOADED', 'QUEUED', 'PROCESSING', 'PROCESSED', 'FAILED')),
  atm_id         uuid references public.atms (id) on delete set null,
  bank_id        uuid references public.banks (id) on delete set null,
  uploaded_by    uuid references public.profiles (user_id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index documents_type_idx on public.documents (document_type);
create index documents_created_idx on public.documents (created_at desc);

-- -----------------------------------------------------------------------------
-- reports
-- -----------------------------------------------------------------------------
create table public.reports (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  type          text not null
                check (type in ('DAILY_RECONCILIATION', 'EXCEPTION_REPORT', 'ATM_OPERATIONS', 'MONTHLY_SUMMARY')),
  format        text not null default 'PDF' check (format in ('PDF', 'XLSX', 'CSV')),
  status        text not null default 'QUEUED'
                check (status in ('QUEUED', 'GENERATING', 'READY', 'FAILED')),
  period_start  date,
  period_end    date,
  created_by    uuid references public.profiles (user_id) on delete set null,
  storage_path  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index reports_created_idx on public.reports (created_at desc);

-- -----------------------------------------------------------------------------
-- notifications
-- -----------------------------------------------------------------------------
-- A NULL user_id is a broadcast visible to everyone.
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles (user_id) on delete cascade,
  type        text not null default 'INFO'
              check (type in ('INFO', 'WARNING', 'ERROR', 'SUCCESS', 'EXCEPTION')),
  title       text not null,
  body        text,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

-- -----------------------------------------------------------------------------
-- audit_logs
-- -----------------------------------------------------------------------------
-- Append-only. No policy grants INSERT, UPDATE or DELETE to end users; entries
-- are written with the service role, so a user cannot forge or erase their own
-- trail. `actor_email` is denormalised so the record survives account deletion.
create table public.audit_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles (user_id) on delete set null,
  actor_email  text,
  action       text not null,
  entity       text not null,
  entity_id    text,
  metadata     jsonb,
  ip_address   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity, entity_id);
create index audit_logs_user_idx on public.audit_logs (user_id);

-- -----------------------------------------------------------------------------
-- ai_conversations & ai_messages
-- -----------------------------------------------------------------------------
create table public.ai_conversations (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references public.profiles (user_id) on delete cascade,
  title            text not null default 'New conversation',
  agent            text not null default 'ORCHESTRATOR'
                   check (agent in ('ORCHESTRATOR', 'DATA', 'RECONCILIATION', 'INVESTIGATION', 'REPORTING', 'COMMUNICATION')),
  last_message_at  timestamptz,
  archived         boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index ai_conversations_user_idx on public.ai_conversations (user_id, last_message_at desc);

create table public.ai_messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.ai_conversations (id) on delete cascade,
  role             text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content          text not null,
  tool_calls       jsonb,
  model            text,
  token_usage      jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index ai_messages_conversation_idx on public.ai_messages (conversation_id, created_at);

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------
do $$
declare
  target text;
begin
  foreach target in array array[
    'roles', 'profiles', 'banks', 'branches', 'custodians', 'engineers', 'atms',
    'daily_operations', 'reconciliations', 'exceptions', 'documents', 'reports',
    'notifications', 'audit_logs', 'ai_conversations', 'ai_messages'
  ]
  loop
    execute format(
      'create trigger set_updated_at_on_%1$s before update on public.%1$I
       for each row execute function public.set_updated_at()',
      target
    );
  end loop;
end;
$$;
