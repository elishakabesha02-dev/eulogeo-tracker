-- =============================================================================
-- Synthetic demo data
-- =============================================================================
-- Every value below is fictional. Bank names, staff names, terminal codes and
-- amounts are invented for demonstration only. Phone numbers use the reserved
-- 555 range and are not routable.
--
-- Safe to re-run: each statement is idempotent on its natural key.
--
-- Profiles are NOT seeded. A profile row is created automatically by the
-- `on_auth_user_created` trigger when a user signs up, so create your users in
-- Supabase Auth and then set their role:
--   update public.profiles set role = 'ADMIN' where email = 'you@example.com';
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Banks
-- -----------------------------------------------------------------------------
insert into public.banks (name, code, status) values
  ('Demo Bank A',            'DBA', 'ACTIVE'),
  ('Demo Bank B',            'DBB', 'ACTIVE'),
  ('Demo Bank C',            'DBC', 'ACTIVE'),
  ('Sandbox Trust Bank',     'STB', 'ACTIVE'),
  ('Testfield Cooperative',  'TFC', 'INACTIVE')
on conflict (code) do nothing;

-- -----------------------------------------------------------------------------
-- Branches — three per bank
-- -----------------------------------------------------------------------------
insert into public.branches (bank_id, name, code, city)
select
  b.id,
  city.name || ' Branch',
  b.code || '-' || lpad(city.ordinal::text, 2, '0'),
  city.name
from public.banks b
cross join (values
  (1, 'Northgate'),
  (2, 'Riverside'),
  (3, 'Harbour Point')
) as city(ordinal, name)
on conflict (bank_id, code) do nothing;

-- -----------------------------------------------------------------------------
-- Custodians
-- -----------------------------------------------------------------------------
insert into public.custodians (full_name, employee_id, phone, status, bank_id)
select
  person.full_name,
  person.employee_id,
  '+256 700 555 ' || lpad((100 + person.ordinal)::text, 3, '0'),
  case when person.ordinal <= 8 then 'ACTIVE' else 'INACTIVE' end,
  (select id from public.banks order by code offset (person.ordinal % 4) limit 1)
from (values
  (1, 'Amina Achieng',      'CUS-1000'),
  (2, 'Brian Bwire',        'CUS-1001'),
  (3, 'Catherine Draku',    'CUS-1002'),
  (4, 'Daniel Ekwaro',      'CUS-1003'),
  (5, 'Esther Gumisiriza',  'CUS-1004'),
  (6, 'Felix Habimana',     'CUS-1005'),
  (7, 'Grace Isabirye',     'CUS-1006'),
  (8, 'Henry Juma',         'CUS-1007'),
  (9, 'Irene Cheruiyot',    'CUS-1008'),
  (10, 'Joseph Farida',     'CUS-1009')
) as person(ordinal, full_name, employee_id)
on conflict (employee_id) do nothing;

-- -----------------------------------------------------------------------------
-- Engineers
-- -----------------------------------------------------------------------------
insert into public.engineers (full_name, employee_id, phone, status, specialization)
select
  person.full_name,
  person.employee_id,
  '+256 700 555 ' || lpad((140 + person.ordinal)::text, 3, '0'),
  case when person.ordinal <= 5 then 'ACTIVE' else 'INACTIVE' end,
  person.specialization
from (values
  (1, 'Karen Bwire',      'ENG-2000', 'Cash dispenser'),
  (2, 'Lawrence Achieng', 'ENG-2001', 'Card reader'),
  (3, 'Amina Draku',      'ENG-2002', 'Network & comms'),
  (4, 'Brian Ekwaro',     'ENG-2003', 'Power systems'),
  (5, 'Catherine Juma',   'ENG-2004', 'General hardware'),
  (6, 'Daniel Habimana',  'ENG-2005', 'Cash dispenser')
) as person(ordinal, full_name, employee_id, specialization)
on conflict (employee_id) do nothing;

-- -----------------------------------------------------------------------------
-- ATMs — 20 terminals spread across the four active banks
-- -----------------------------------------------------------------------------
insert into public.atms (atm_code, bank_id, branch_id, location, status, custodian_id, engineer_id, model)
select
  'ATM-' || (1000 + n)::text,
  bank.id,
  branch.id,
  coalesce(branch.city, 'Northgate') || ' — ' ||
    (array['Main Street Lobby', 'Shopping Centre', 'Airport Terminal',
           'Hospital Concourse', 'University Campus', 'Bus Terminal'])[1 + (n % 6)],
  case
    when n in (7, 14) then 'MAINTENANCE'
    when n = 19       then 'INACTIVE'
    else                   'ACTIVE'
  end,
  custodian.id,
  engineer.id,
  (array['NCR SelfServ 22', 'Diebold 429', 'Hyosung MX5600'])[1 + (n % 3)]
from generate_series(1, 20) as n
cross join lateral (
  select id, code from public.banks where status = 'ACTIVE' order by code offset (n % 4) limit 1
) as bank
cross join lateral (
  select id, city from public.branches where bank_id = bank.id order by code offset (n % 3) limit 1
) as branch
cross join lateral (
  select id from public.custodians where status = 'ACTIVE' order by employee_id offset (n % 8) limit 1
) as custodian
cross join lateral (
  select id from public.engineers where status = 'ACTIVE' order by employee_id offset (n % 5) limit 1
) as engineer
on conflict (atm_code) do nothing;

-- -----------------------------------------------------------------------------
-- Daily operations — today and the two preceding business days
-- -----------------------------------------------------------------------------
insert into public.daily_operations (operation_date, atm_id, custodian_id, operational_status, reconciliation_status)
select
  day.date,
  a.id,
  a.custodian_id,
  case
    when day.date < current_date then 'COMPLETED'
    when (row_number() over (partition by day.date order by a.atm_code)) % 5 = 0 then 'EXCEPTION'
    when (row_number() over (partition by day.date order by a.atm_code)) % 5 = 1 then 'PENDING'
    when (row_number() over (partition by day.date order by a.atm_code)) % 5 = 2 then 'PROCESSING'
    else 'COMPLETED'
  end,
  case
    when day.date < current_date then 'RECONCILED'
    when (row_number() over (partition by day.date order by a.atm_code)) % 5 = 0 then 'VARIANCE'
    when (row_number() over (partition by day.date order by a.atm_code)) % 5 = 1 then 'PENDING'
    when (row_number() over (partition by day.date order by a.atm_code)) % 5 = 2 then 'IN_PROGRESS'
    else 'RECONCILED'
  end
from public.atms a
cross join (
  select current_date - offset_days as date
  from generate_series(0, 2) as offset_days
) as day
where a.status in ('ACTIVE', 'MAINTENANCE')
on conflict (operation_date, atm_id) do nothing;

-- -----------------------------------------------------------------------------
-- Reconciliations — one per operation for the current business date
-- -----------------------------------------------------------------------------
-- Amounts are integer minor units. These are STORED SAMPLE VALUES, not the
-- output of any calculation; the reconciliation engine is not implemented yet.
insert into public.reconciliations (
  reconciliation_date, atm_id, daily_operation_id, currency,
  expected_minor, actual_minor, variance_minor, status
)
select
  op.operation_date,
  op.atm_id,
  op.id,
  'UGX',
  expected.value,
  case
    when op.reconciliation_status in ('PENDING', 'IN_PROGRESS') then null
    when op.reconciliation_status = 'VARIANCE' then expected.value - 1750000
    else expected.value
  end,
  case
    when op.reconciliation_status in ('PENDING', 'IN_PROGRESS') then null
    when op.reconciliation_status = 'VARIANCE' then -1750000
    else 0
  end,
  op.reconciliation_status
from public.daily_operations op
cross join lateral (
  select ((abs(hashtext(op.atm_id::text)) % 50000) + 5000) * 100000 as value
) as expected
where op.operation_date = current_date
on conflict (reconciliation_date, atm_id) do nothing;

-- -----------------------------------------------------------------------------
-- Exceptions — raised against today's variances
-- -----------------------------------------------------------------------------
insert into public.exceptions (reference, atm_id, reconciliation_id, type, status, priority, currency, amount_minor, description)
select
  'EXC-' || (4100 + row_number() over (order by r.atm_id))::text,
  r.atm_id,
  r.id,
  'SHORTAGE',
  'OPEN',
  'HIGH',
  r.currency,
  abs(r.variance_minor),
  'Counted cash is below the expected closing balance.'
from public.reconciliations r
where r.reconciliation_date = current_date
  and r.variance_minor is not null
  and r.variance_minor <> 0
on conflict (reference) do nothing;

insert into public.exceptions (reference, atm_id, type, status, priority, currency, amount_minor, description, resolved_at)
select
  'EXC-4090',
  (select id from public.atms order by atm_code limit 1),
  'JOURNAL_MISMATCH',
  'RESOLVED',
  'MEDIUM',
  'UGX',
  8500000,
  'Journal roll gap resolved after terminal clock resync.',
  now() - interval '26 hours'
on conflict (reference) do nothing;

-- -----------------------------------------------------------------------------
-- Reports
-- -----------------------------------------------------------------------------
insert into public.reports (name, type, format, status, period_start, period_end)
values
  ('Daily Reconciliation — ' || current_date::text, 'DAILY_RECONCILIATION', 'PDF',  'READY',      current_date,                 current_date),
  ('Exception Report — current week',               'EXCEPTION_REPORT',     'XLSX', 'READY',      current_date - 6,             current_date),
  ('ATM Operations Report',                         'ATM_OPERATIONS',       'CSV',  'GENERATING', current_date - 29,            current_date),
  ('Monthly Summary — previous month',              'MONTHLY_SUMMARY',      'PDF',  'FAILED',     date_trunc('month', current_date - interval '1 month')::date,
                                                                                                 (date_trunc('month', current_date) - interval '1 day')::date);

-- -----------------------------------------------------------------------------
-- Notifications — broadcast (user_id null) so any signed-in user sees them
-- -----------------------------------------------------------------------------
insert into public.notifications (user_id, type, title, body, link) values
  (null, 'EXCEPTION', 'Variance detected',                 'A variance was raised during today''s reconciliation. Review the exception queue.', '/operations/exceptions'),
  (null, 'WARNING',   'Reconciliation still pending',      'Several terminals have not been reconciled for today''s business date.',            '/operations/reconciliation'),
  (null, 'SUCCESS',   'Daily reconciliation report ready', 'Today''s reconciliation report finished generating.',                               '/intelligence/reports'),
  (null, 'INFO',      'Demo data loaded',                  'Synthetic demo records were seeded into this project.',                             '/dashboard');
