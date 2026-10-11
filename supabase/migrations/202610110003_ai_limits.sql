-- Shared, atomic quotas across server instances. No prompt or IP is stored.
create table private.ai_requests (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default clock_timestamp(),
 lease_until timestamptz not null default (clock_timestamp() + interval '90 seconds')
);
create index ai_requests_user_date on private.ai_requests(user_id,created_at);
create index ai_requests_date on private.ai_requests(created_at);
alter table private.ai_requests enable row level security;
revoke all on private.ai_requests from public,anon,authenticated;

create function public.claim_ai_request() returns uuid
language plpgsql security definer set search_path='' as $$
declare who uuid := auth.uid(); current_time_ai timestamptz; token uuid;
begin
 if who is null or not public.is_enabled() then raise exception 'AI_AUTH_REQUIRED'; end if;
 perform pg_catalog.pg_advisory_xact_lock(7910311);
 current_time_ai := clock_timestamp();
 delete from private.ai_requests where created_at <= current_time_ai - interval '24 hours';
 if (select count(*) from private.ai_requests where user_id=who) >= 60
 or (select count(*) from private.ai_requests) >= 500 then raise exception 'AI_RATE_LIMIT:86400'; end if;
 if (select count(*) from private.ai_requests where user_id=who and created_at > current_time_ai - interval '1 minute') >= 6
 or (select count(*) from private.ai_requests where created_at > current_time_ai - interval '1 minute') >= 30 then raise exception 'AI_RATE_LIMIT:60'; end if;
 if exists(select 1 from private.ai_requests where user_id=who and lease_until > current_time_ai)
 or (select count(*) from private.ai_requests where lease_until > current_time_ai) >= 2 then raise exception 'AI_BUSY:15'; end if;
 insert into private.ai_requests(user_id) values(who) returning id into token;
 return token;
end $$;

create function public.release_ai_request(token uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'AI_AUTH_REQUIRED'; end if;
 update private.ai_requests set lease_until=clock_timestamp() where id=token and user_id=auth.uid();
end $$;
revoke all on function public.claim_ai_request(), public.release_ai_request(uuid) from public,anon;
grant execute on function public.claim_ai_request(), public.release_ai_request(uuid) to authenticated;
