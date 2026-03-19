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
