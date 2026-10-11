-- Private, user-provided court updates. No automated court consultation.
create table public.case_records (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.profiles(id) on delete cascade,
 title text not null check(char_length(trim(title)) between 3 and 120),
 number text not null default '' check(char_length(number)<=40),
 court text not null default '' check(char_length(court)<=100),
 movement text not null check(char_length(trim(movement)) between 3 and 3000),
 movement_date date not null,
 source_url text not null default '' check(char_length(source_url)<=1000 and (source_url='' or source_url like 'https://%')),
 updated_at timestamptz not null default now()
);
create index case_records_owner on public.case_records(owner_id,updated_at desc);
alter table public.case_records enable row level security;
revoke all on public.case_records from anon, authenticated;
grant select,insert on public.case_records to authenticated;
create policy case_records_select on public.case_records for select to authenticated
 using(owner_id=auth.uid() and public.is_enabled());
create policy case_records_insert on public.case_records for insert to authenticated
 with check(owner_id=auth.uid() and public.is_enabled());
