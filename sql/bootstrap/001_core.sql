create extension if not exists pgcrypto;

-- users
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  name text,
  phone_number text,
  birth_date date,
  gender text,
  role text default 'client',
  created_at timestamptz default now(),
  nickname text,
  profile_image text,
  position text,
  employee_type text,
  resident_number text,
  address text,
  id_card_url text,
  id_card_verified boolean default false
);

-- organizations
create table if not exists public.test_organizations (
  id uuid primary key default gen_random_uuid(),
  name varchar,
  business_number varchar,
  address text,
  phone varchar,
  email varchar,
  representative_name varchar,
  representative_position varchar,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- cases
create table if not exists public.test_cases (
  id uuid primary key default gen_random_uuid(),
  case_type varchar,
  status varchar,
  filing_date date,
  principal_amount numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  debt_category text
);

-- case interests
create table if not exists public.test_case_interests (
  id uuid primary key default gen_random_uuid(),
  case_id uuid,
  start_date date,
  end_date date,
  rate numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- case expenses
create table if not exists public.test_case_expenses (
  id uuid primary key default gen_random_uuid(),
  case_id uuid,
  expense_type varchar,
  amount numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- case clients
create table if not exists public.test_case_clients (
  id uuid primary key default gen_random_uuid(),
  case_id uuid,
  client_type varchar,
  individual_id uuid,
  organization_id uuid,
  position varchar,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- case parties
create table if not exists public.test_case_parties (
  id uuid primary key default gen_random_uuid(),
  case_id uuid,
  party_type text,
  entity_type text,
  name varchar,
  company_name varchar,
  corporate_registration_number varchar,
  position varchar,
  phone varchar,
  address text,
  email varchar,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  resident_number varchar,
  corporate_number varchar,
  representative_name text,
  representative_position text,
  kcb_checked boolean default false,
  kcb_checked_date date,
  payment_notification_sent boolean default false,
  payment_notification_date date
);

-- case handlers
create table if not exists public.test_case_handlers (
  id uuid primary key default gen_random_uuid(),
  case_id uuid,
  user_id uuid,
  role text,
  created_at date default current_date,
  updated_at date default current_date
);

-- lawsuits
create table if not exists public.test_case_lawsuits (
  id uuid primary key default gen_random_uuid(),
  case_id uuid,
  lawsuit_type text,
  court_name text,
  case_number text,
  type text,
  filing_date timestamptz,
  description text,
  status text,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- lawsuit parties
create table if not exists public.test_lawsuit_parties (
  id uuid primary key default gen_random_uuid(),
  lawsuit_id uuid,
  party_id uuid,
  party_type text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- lawsuit submissions
create table if not exists public.test_lawsuit_submissions (
  id uuid primary key default gen_random_uuid(),
  lawsuit_id uuid,
  submission_type varchar,
  document_type varchar,
  submission_date date,
  description text,
  file_url text,
  status text,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- individual notifications
create table if not exists public.test_individual_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  case_id uuid,
  title text,
  message text,
  notification_type text,
  is_read boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  related_id uuid
);

-- payment plans
create table if not exists public.test_payment_plans (
  id uuid primary key default gen_random_uuid(),
  case_id uuid,
  lawsuit_id uuid,
  debtor_id uuid,
  total_amount numeric,
  monthly_amount numeric,
  installment_count integer,
  payment_day integer,
  start_date date,
  end_date date,
  current_status text,
  interest_rate numeric,
  agreement_file_url text,
  notes text,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- recovery activities
create table if not exists public.test_recovery_activities (
  id uuid primary key default gen_random_uuid(),
  case_id uuid,
  activity_type varchar,
  date date,
  description text,
  notes text,
  amount numeric,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  status text,
  file_url text
);

-- related lawsuits
create table if not exists public.test_related_lawsuits (
  id uuid primary key default gen_random_uuid(),
  lawsuit_id uuid,
  court_name text,
  case_number text,
  type text,
  description text,
  created_at timestamptz default now(),
  created_by uuid,
  updated_at timestamptz default now(),
  lawsuit_type text
);

-- schedules
create table if not exists public.test_schedules (
  id uuid primary key default gen_random_uuid(),
  title text,
  event_type text,
  event_date timestamptz,
  end_date timestamptz,
  case_id uuid,
  lawsuit_id uuid,
  location text,
  description text,
  is_important boolean default false,
  is_completed boolean default false,
  court_name text,
  case_number text,
  related_entity text,
  related_id uuid,
  color text,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  file_url text
);