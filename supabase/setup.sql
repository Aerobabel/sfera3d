create table if not exists public.supplier_messages (
    id uuid primary key default gen_random_uuid(),
    supplier_id text not null,
    sender_role text not null check (sender_role in ('buyer', 'supplier')),
    sender_name text not null,
    message text not null,
    created_at timestamptz not null default now()
);

create index if not exists supplier_messages_supplier_created_idx
    on public.supplier_messages (supplier_id, created_at);

create table if not exists public.supplier_message_translations (
    message_id uuid not null references public.supplier_messages(id) on delete cascade,
    language text not null check (language in ('en', 'ru', 'zh')),
    translated_text text not null,
    created_at timestamptz not null default now(),
    primary key (message_id, language)
);

create index if not exists supplier_message_translations_language_idx
    on public.supplier_message_translations (language, created_at);

alter table public.supplier_messages enable row level security;
alter table public.supplier_message_translations enable row level security;

drop policy if exists "supplier_messages_read_all" on public.supplier_messages;
create policy "supplier_messages_read_all"
    on public.supplier_messages
    for select
    using (true);

drop policy if exists "supplier_messages_insert_all" on public.supplier_messages;
create policy "supplier_messages_insert_all"
    on public.supplier_messages
    for insert
    with check (true);

drop policy if exists "supplier_message_translations_read_all" on public.supplier_message_translations;
create policy "supplier_message_translations_read_all"
    on public.supplier_message_translations
    for select
    using (true);

drop policy if exists "supplier_message_translations_insert_all" on public.supplier_message_translations;
create policy "supplier_message_translations_insert_all"
    on public.supplier_message_translations
    for insert
    with check (true);

-- Pavilion contact requests: anonymous visitors can submit; supplier staff read.
create table if not exists public.pavilion_contact_requests (
    id uuid primary key default gen_random_uuid(),
    pavilion_id text not null,
    name text not null,
    company text,
    email text not null,
    phone text,
    message text not null,
    created_at timestamptz not null default now()
);

create index if not exists pavilion_contact_requests_pavilion_created_idx
    on public.pavilion_contact_requests (pavilion_id, created_at);

-- Pavilion meeting bookings: anonymous visitors can request slots.
create table if not exists public.pavilion_bookings (
    id uuid primary key default gen_random_uuid(),
    pavilion_id text not null,
    name text not null,
    email text not null,
    company text,
    slot_at timestamptz not null,
    duration_minutes int not null default 30,
    notes text,
    status text not null default 'requested' check (status in ('requested', 'confirmed', 'cancelled', 'completed')),
    created_at timestamptz not null default now()
);

create index if not exists pavilion_bookings_pavilion_slot_idx
    on public.pavilion_bookings (pavilion_id, slot_at);

alter table public.pavilion_contact_requests enable row level security;
alter table public.pavilion_bookings enable row level security;

drop policy if exists "pavilion_contact_requests_insert_all" on public.pavilion_contact_requests;
create policy "pavilion_contact_requests_insert_all"
    on public.pavilion_contact_requests
    for insert
    with check (true);

drop policy if exists "pavilion_bookings_insert_all" on public.pavilion_bookings;
create policy "pavilion_bookings_insert_all"
    on public.pavilion_bookings
    for insert
    with check (true);

drop policy if exists "pavilion_bookings_read_all" on public.pavilion_bookings;
create policy "pavilion_bookings_read_all"
    on public.pavilion_bookings
    for select
    using (true);

-- Pavilion threaded chat. Each row is one message in a thread keyed by
-- (pavilion_id, counterparty_user_id). `counterparty_user_id` is the
-- user on the OTHER side of the pavilion — always the visitor /
-- other-pavilion-staff, never the pavilion itself. `sender_kind` tells
-- us which bubble to render: 'visitor' is the right-hand side, 'pavilion'
-- is the left-hand (staff) reply.
create table if not exists public.pavilion_messages (
    id uuid primary key default gen_random_uuid(),
    pavilion_id text not null,
    counterparty_user_id uuid not null,
    sender_kind text not null check (sender_kind in ('visitor', 'pavilion')),
    sender_user_id uuid not null,
    sender_display_name text,
    body text not null,
    created_at timestamptz not null default now()
);

create index if not exists pavilion_messages_thread_idx
    on public.pavilion_messages (pavilion_id, counterparty_user_id, created_at);

create index if not exists pavilion_messages_inbox_idx
    on public.pavilion_messages (pavilion_id, created_at);

alter table public.pavilion_messages enable row level security;

-- All writes go through the admin-client backed API routes so RLS only
-- needs to allow the server role. Policies left permissive here for
-- easy manual inspection from the Supabase dashboard.
drop policy if exists "pavilion_messages_insert_all" on public.pavilion_messages;
create policy "pavilion_messages_insert_all"
    on public.pavilion_messages for insert with check (true);

drop policy if exists "pavilion_messages_read_all" on public.pavilion_messages;
create policy "pavilion_messages_read_all"
    on public.pavilion_messages for select using (true);

-- Quest system MVP. Definitions are code-owned in src/lib/quests.ts for now;
-- these tables persist user event streams, objective progress snapshots, and
-- earned reward inventory once the app switches from local bridge state to
-- Supabase-backed player profiles.
create table if not exists public.quest_events (
    id uuid primary key default gen_random_uuid(),
    user_id uuid,
    session_id text,
    quest_id text,
    role text check (role in ('player', 'shopper', 'business')),
    event_name text not null,
    payload jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists quest_events_user_created_idx
    on public.quest_events (user_id, created_at desc);

create index if not exists quest_events_session_created_idx
    on public.quest_events (session_id, created_at desc);

create index if not exists quest_events_name_created_idx
    on public.quest_events (event_name, created_at desc);

create table if not exists public.quest_progress (
    user_id uuid not null,
    quest_id text not null,
    role text not null check (role in ('player', 'shopper', 'business')),
    status text not null default 'active' check (status in ('active', 'completed', 'claimed')),
    objectives jsonb not null default '{}'::jsonb,
    completed_at timestamptz,
    updated_at timestamptz not null default now(),
    primary key (user_id, quest_id)
);

create index if not exists quest_progress_role_status_idx
    on public.quest_progress (role, status, updated_at desc);

create table if not exists public.quest_rewards (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null,
    quest_id text not null,
    reward_kind text not null check (reward_kind in ('coins', 'coupon', 'badge', 'sample', 'lead_boost')),
    reward_value text not null,
    status text not null default 'earned' check (status in ('earned', 'claimed', 'expired')),
    earned_at timestamptz not null default now(),
    claimed_at timestamptz
);

create index if not exists quest_rewards_user_status_idx
    on public.quest_rewards (user_id, status, earned_at desc);

alter table public.quest_events enable row level security;
alter table public.quest_progress enable row level security;
alter table public.quest_rewards enable row level security;

drop policy if exists "quest_events_insert_all" on public.quest_events;
create policy "quest_events_insert_all"
    on public.quest_events for insert with check (true);

drop policy if exists "quest_events_read_all" on public.quest_events;
create policy "quest_events_read_all"
    on public.quest_events for select using (true);

drop policy if exists "quest_progress_read_all" on public.quest_progress;
create policy "quest_progress_read_all"
    on public.quest_progress for select using (true);

drop policy if exists "quest_progress_upsert_all" on public.quest_progress;
create policy "quest_progress_upsert_all"
    on public.quest_progress for all using (true) with check (true);

drop policy if exists "quest_rewards_read_all" on public.quest_rewards;
create policy "quest_rewards_read_all"
    on public.quest_rewards for select using (true);

drop policy if exists "quest_rewards_upsert_all" on public.quest_rewards;
create policy "quest_rewards_upsert_all"
    on public.quest_rewards for all using (true) with check (true);

-- Public pre-registration queue. Submissions are written only through the
-- server-side service-role API; no anonymous table access is granted.
create table if not exists public.pre_registrations (
    id uuid primary key default gen_random_uuid(),
    full_name text not null,
    email text not null unique,
    phone text,
    company text,
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

-- Intentionally no anon/authenticated policies. The service-role API bypasses
-- RLS, while public clients cannot enumerate or modify registration requests.
