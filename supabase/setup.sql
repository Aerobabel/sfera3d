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
