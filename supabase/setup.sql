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

alter table public.supplier_messages enable row level security;

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
