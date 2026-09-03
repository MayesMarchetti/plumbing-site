-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query)
-- to create the tables the app expects.

create table if not exists appointments (
  id serial primary key,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  requested_time text not null,
  confirmed_time text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'completed')),
  assigned_employee text,
  service_type text,
  payment_amount numeric,
  google_calendar_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_appointments_status on appointments (status);
create index if not exists idx_appointments_requested_time on appointments (requested_time);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_appointments_updated_at on appointments;
create trigger trg_appointments_updated_at
before update on appointments
for each row execute function set_updated_at();

create table if not exists completed_jobs (
  id serial primary key,
  date text not null,
  employee_name text not null,
  customer_name text not null,
  customer_phone text not null,
  service_type text not null,
  payment_amount numeric not null,
  description text,
  created_at timestamptz not null default now()
);

-- Run this alone if completed_jobs already existed before the description column was added.
alter table completed_jobs add column if not exists description text;

create index if not exists idx_completed_jobs_employee on completed_jobs (employee_name);
create index if not exists idx_completed_jobs_service on completed_jobs (service_type);

-- The app only ever talks to Supabase with the service_role key (server-side,
-- bypasses RLS), so locking these tables down for the anon/authenticated
-- roles by enabling RLS with no policies is the safe default.
alter table appointments enable row level security;
alter table completed_jobs enable row level security;
