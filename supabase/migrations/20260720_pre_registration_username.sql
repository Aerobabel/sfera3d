alter table public.pre_registrations
    add column if not exists username text;

create unique index if not exists pre_registrations_username_ci_unique
    on public.pre_registrations (lower(username))
    where username is not null;
