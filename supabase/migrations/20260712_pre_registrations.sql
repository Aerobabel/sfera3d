create table if not exists public.pre_registrations (
    id uuid primary key default gen_random_uuid(),
    full_name text not null,
    email text not null unique,
    phone text,
    company text,
    address text,
    account_type text not null check (account_type in ('player', 'visitor', 'supplier')),
    message text,
    locale text not null default 'en' check (locale in ('en', 'ru', 'zh')),
    source text not null default 'public_pre_registration',
    status text not null default 'pending' check (status in ('pending', 'contacted', 'approved', 'rejected', 'converted')),
    consent_at timestamptz not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists pre_registrations_status_created_idx
    on public.pre_registrations (status, created_at desc);

alter table public.pre_registrations enable row level security;
