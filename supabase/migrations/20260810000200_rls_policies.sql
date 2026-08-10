-- =============================================================================
-- Row Level Security
-- =============================================================================
-- Authorization lives in the database, not only in the application. Even if a
-- service-layer check were bypassed, the anon-key client still cannot read or
-- write past these policies.
--
-- Shape of the model in this phase:
--   * Any authenticated, active user may READ operational reference data.
--   * WRITE is gated on role.
--   * audit_logs is readable by ADMIN/SUPERVISOR/AUDITOR and writable by nobody
--     except the service role.
--   * AI conversations are private to their owner.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------
-- SECURITY DEFINER so a policy can read `profiles` without recursing into the
-- policy on `profiles` itself. search_path is pinned to defeat search-path
-- hijacking of an elevated function.
create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where user_id = auth.uid() and is_active
  limit 1;
$$;

revoke execute on function public.current_app_role() from public;
grant execute on function public.current_app_role() to authenticated;

create or replace function public.has_role(variadic allowed text[])
returns boolean
language sql
stable
as $$
  select public.current_app_role() = any(allowed);
$$;

grant execute on function public.has_role(text[]) to authenticated;

-- Signed in AND not deactivated.
create or replace function public.is_active_user()
returns boolean
language sql
stable
as $$
  select public.current_app_role() is not null;
$$;

grant execute on function public.is_active_user() to authenticated;

-- -----------------------------------------------------------------------------
-- Enable RLS everywhere
-- -----------------------------------------------------------------------------
alter table public.roles             enable row level security;
alter table public.profiles          enable row level security;
alter table public.banks             enable row level security;
alter table public.branches          enable row level security;
alter table public.custodians        enable row level security;
alter table public.engineers         enable row level security;
alter table public.atms              enable row level security;
alter table public.daily_operations  enable row level security;
alter table public.reconciliations   enable row level security;
alter table public.exceptions        enable row level security;
alter table public.documents         enable row level security;
alter table public.reports           enable row level security;
alter table public.notifications     enable row level security;
alter table public.audit_logs        enable row level security;
alter table public.ai_conversations  enable row level security;
alter table public.ai_messages       enable row level security;

-- -----------------------------------------------------------------------------
-- roles — reference data, read-only
-- -----------------------------------------------------------------------------
create policy "roles are readable by signed-in users"
  on public.roles for select
  to authenticated
  using (true);

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create policy "users read their own profile"
  on public.profiles for select
  to authenticated
  using (user_id = auth.uid());

create policy "supervisors and auditors read all profiles"
  on public.profiles for select
  to authenticated
  using (public.has_role('ADMIN', 'SUPERVISOR', 'AUDITOR'));

-- A user may edit their own contact details. The role column is protected by
-- the trigger below so self-promotion is impossible.
create policy "users update their own profile"
  on public.profiles for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "admins manage profiles"
  on public.profiles for all
  to authenticated
  using (public.has_role('ADMIN'))
  with check (public.has_role('ADMIN'));

create or replace function public.guard_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and public.current_app_role() is distinct from 'ADMIN' then
    raise exception 'Only an administrator may change a role.';
  end if;
  if new.is_active is distinct from old.is_active and public.current_app_role() is distinct from 'ADMIN' then
    raise exception 'Only an administrator may activate or deactivate an account.';
  end if;
  return new;
end;
$$;

create trigger guard_profile_role_change
  before update on public.profiles
  for each row execute function public.guard_profile_role_change();

-- -----------------------------------------------------------------------------
-- Reference & operational data
-- -----------------------------------------------------------------------------
-- Read for every active user; write for the roles that own the module.
do $$
declare
  spec record;
begin
  for spec in
    select * from (values
      ('banks',            array['ADMIN']),
      ('branches',         array['ADMIN']),
      ('custodians',       array['ADMIN', 'SUPERVISOR']),
      ('engineers',        array['ADMIN', 'SUPERVISOR']),
      ('atms',             array['ADMIN', 'SUPERVISOR']),
      ('daily_operations', array['ADMIN', 'SUPERVISOR', 'RECONCILIATION_OFFICER', 'CCT']),
      ('reconciliations',  array['ADMIN', 'SUPERVISOR', 'RECONCILIATION_OFFICER']),
      ('exceptions',       array['ADMIN', 'SUPERVISOR', 'RECONCILIATION_OFFICER']),
      ('documents',        array['ADMIN', 'SUPERVISOR', 'RECONCILIATION_OFFICER', 'CCT']),
      ('reports',          array['ADMIN', 'SUPERVISOR', 'RECONCILIATION_OFFICER'])
    ) as t(table_name, writers)
  loop
    execute format(
      'create policy "read %1$s" on public.%1$I for select to authenticated using (public.is_active_user())',
      spec.table_name
    );
    execute format(
      'create policy "write %1$s" on public.%1$I for insert to authenticated with check (public.has_role(variadic %2$L::text[]))',
      spec.table_name, spec.writers
    );
    execute format(
      'create policy "update %1$s" on public.%1$I for update to authenticated
         using (public.has_role(variadic %2$L::text[]))
         with check (public.has_role(variadic %2$L::text[]))',
      spec.table_name, spec.writers
    );
  end loop;
end;
$$;

-- No DELETE policy is created anywhere on purpose. Records are deactivated,
-- never removed, so operational history stays intact and auditable.

-- -----------------------------------------------------------------------------
-- notifications
-- -----------------------------------------------------------------------------
create policy "users read their own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid() or user_id is null);

-- Marking as read is the only user-driven change. Creation is done by the
-- service role, so a user cannot fabricate an alert for someone else.
create policy "users mark their own notifications read"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- audit_logs — read-only for oversight roles, append-only for the system
-- -----------------------------------------------------------------------------
create policy "oversight roles read audit logs"
  on public.audit_logs for select
  to authenticated
  using (public.has_role('ADMIN', 'SUPERVISOR', 'AUDITOR'));

-- -----------------------------------------------------------------------------
-- AI conversations — private to their owner
-- -----------------------------------------------------------------------------
create policy "users manage their own conversations"
  on public.ai_conversations for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "users read messages in their own conversations"
  on public.ai_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.ai_conversations c
      where c.id = ai_messages.conversation_id and c.user_id = auth.uid()
    )
  );

create policy "users write messages in their own conversations"
  on public.ai_messages for insert
  to authenticated
  with check (
    exists (
      select 1 from public.ai_conversations c
      where c.id = ai_messages.conversation_id and c.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- Storage
-- -----------------------------------------------------------------------------
-- Private bucket. Uploads are authorised by server-minted signed URLs and reads
-- go through short-lived signed download links, so no object is ever public.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ebb-documents',
  'ebb-documents',
  false,
  26214400, -- 25 MB, matching MAX_UPLOAD_BYTES in the application
  array[
    'application/pdf',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
)
on conflict (id) do nothing;

create policy "signed-in users read documents bucket"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'ebb-documents' and public.is_active_user());
