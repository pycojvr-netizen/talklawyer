-- Talklawyer MVP. Run with Supabase CLI or SQL Editor as postgres.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 role text not null check (role in ('client','lawyer','company')),
 full_name text not null check (char_length(full_name) between 3 and 100),
 city text not null default '' check (char_length(city)<=80),
 state text not null default '' check(state='' or state in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
 company_name text not null default '' check(char_length(company_name)<=150),
 terms_version text not null, terms_accepted_at timestamptz not null default now(),
 disabled_at timestamptz, created_at timestamptz not null default now()
);
create table private.admin_roles (user_id uuid primary key references public.profiles(id) on delete cascade);
create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.admin_roles a join public.profiles p on p.id=a.user_id where a.user_id=auth.uid() and p.disabled_at is null);
$$;
create function public.is_enabled() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and disabled_at is null);
$$;
create function public.normalize_search(value text) returns text language sql immutable strict parallel safe set search_path='' as $$
 select translate(lower(value),'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc');
$$;
create table public.lawyer_profiles (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 display_name text not null check(char_length(display_name) between 3 and 100),
 bio text not null default '' check(char_length(bio)<=2000),
 oab_number text not null default '' check(oab_number='' or oab_number ~ '^\d{1,10}$'),
 oab_state text not null default '' check(oab_state='' or oab_state in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
 city text not null default '' check(char_length(city)<=80), state text not null default '' check(state='' or state in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
 areas text[] not null default '{}' check(cardinality(areas)<=12 and areas <@ array['Civil','Família e Sucessões','Trabalhista','Empresarial','Tributário','Previdenciário','Consumidor','Criminal','Imobiliário','Ambiental','Digital','Administrativo']::text[]),
 experience_years integer not null default 0 check(experience_years between 0 and 80),
 available boolean not null default true,
 avatar_url text not null default '' check(char_length(avatar_url)<=1000 and (avatar_url='' or avatar_url ~ '^https?://')),
 verification_status text not null default 'pending' check(verification_status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(),
 search_vector tsvector generated always as (to_tsvector('simple',public.normalize_search(display_name || ' ' || city || ' ' || state))) stored
);
create unique index lawyer_oab_unique on public.lawyer_profiles(oab_state,oab_number) where oab_number<>'';
create index lawyer_search on public.lawyer_profiles using gin(search_vector);
create index lawyer_areas on public.lawyer_profiles using gin(areas);
create index lawyer_location on public.lawyer_profiles(state,city,display_name) where verification_status='approved';
create table public.contact_requests (
 id uuid primary key default gen_random_uuid(), requester_id uuid not null references public.profiles(id),
 lawyer_id uuid not null references public.lawyer_profiles(user_id),
 subject text not null check(char_length(subject) between 5 and 120),
 description text not null check(char_length(description) between 10 and 2000),
 status text not null default 'pending' check(status in ('pending','accepted','rejected','closed')),
 created_at timestamptz not null default now(), unique(requester_id,lawyer_id), check(requester_id<>lawyer_id)
);
create index contacts_requester on public.contact_requests(requester_id,created_at desc);
create index contacts_lawyer on public.contact_requests(lawyer_id,created_at desc);
create table public.conversations (
 id uuid primary key default gen_random_uuid(), request_id uuid unique not null references public.contact_requests(id),
 requester_id uuid not null references public.profiles(id),lawyer_id uuid not null references public.profiles(id),
 active boolean not null default true,created_at timestamptz not null default now()
);
create index conversations_requester on public.conversations(requester_id);
create index conversations_lawyer on public.conversations(lawyer_id);
create function public.can_chat(cid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_enabled() and exists(select 1 from public.conversations c
 join public.profiles p1 on p1.id=c.requester_id join public.profiles p2 on p2.id=c.lawyer_id
 where c.id=cid and auth.uid() in (c.requester_id,c.lawyer_id) and p1.disabled_at is null and p2.disabled_at is null);
$$;
create table public.messages (
 id uuid primary key default gen_random_uuid(),conversation_id uuid not null references public.conversations(id),
 sender_id uuid not null references public.profiles(id),body text not null check(char_length(trim(body)) between 1 and 4000),
 created_at timestamptz not null default now()
);
create index messages_conversation on public.messages(conversation_id,created_at desc,id);
create index messages_rate on public.messages(sender_id,created_at);
create table public.conversation_reads (
 conversation_id uuid not null references public.conversations(id), user_id uuid not null references public.profiles(id),
 read_at timestamptz not null default now(),primary key(conversation_id,user_id)
);
create table public.documents (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references public.profiles(id),
 name text not null check(char_length(name) between 1 and 150),storage_path text unique not null,
 created_at timestamptz not null default now(),check(storage_path like owner_id::text || '/%')
);
create table public.document_shares (
 document_id uuid not null references public.documents(id) on delete cascade,
 user_id uuid not null references public.profiles(id),primary key(document_id,user_id)
);
create index documents_owner on public.documents(owner_id);
create index shares_user on public.document_shares(user_id);
create function public.can_read_document(path text) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_enabled() and exists(select 1 from public.documents d where d.storage_path=path and
 (d.owner_id=auth.uid() or exists(select 1 from public.document_shares s where s.document_id=d.id and s.user_id=auth.uid())));
$$;
create table public.reports (
 id uuid primary key default gen_random_uuid(),reporter_id uuid not null references public.profiles(id),
 target_id uuid not null references public.lawyer_profiles(user_id),reason text not null check(char_length(reason) between 10 and 2000),
 status text not null default 'open' check(status in ('open','resolved','dismissed')),
 created_at timestamptz not null default now()
);
create table public.privacy_requests (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),
 kind text not null check(kind in ('access','correction','deletion','portability')),
 details text not null check(char_length(details) between 10 and 2000),status text not null default 'open' check(status in ('open','completed')),
 created_at timestamptz not null default now()
);
create table public.admin_audit (
 id uuid primary key default gen_random_uuid(),actor_id uuid not null references public.profiles(id),
 action text not null,target_id uuid not null,note text not null check(char_length(note) between 10 and 1000),created_at timestamptz not null default now()
);

create function private.on_signup() returns trigger language plpgsql security definer set search_path='' as $$
declare r text:=new.raw_user_meta_data->>'role';n text:=trim(new.raw_user_meta_data->>'full_name');
begin
 if r is null or r not in ('client','lawyer','company') or n is null or char_length(n) not between 3 and 100
 or coalesce(new.raw_user_meta_data->>'terms_accepted','false')<>'true'
 or new.raw_user_meta_data->>'terms_version' is distinct from '2026-10-11' then raise exception 'Cadastro inválido';end if;
 insert into public.profiles(id,role,full_name,terms_version) values(new.id,r,n,'2026-10-11');
 if r='lawyer' then insert into public.lawyer_profiles(user_id,display_name) values(new.id,n);end if;
 return new;
end;$$;
create trigger signup after insert on auth.users for each row execute function private.on_signup();
create function private.reset_verification() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (new.display_name,new.bio,new.oab_number,new.oab_state,new.city,new.state,new.areas,new.experience_years,new.avatar_url)
 is distinct from (old.display_name,old.bio,old.oab_number,old.oab_state,old.city,old.state,old.areas,old.experience_years,old.avatar_url)
 then new.verification_status:='pending';end if;
 return new;
end;$$;
create trigger lawyer_review before update on public.lawyer_profiles for each row execute function private.reset_verification();

-- Functions own state transitions; callers cannot write membership/status directly.
create function public.create_contact(lawyer uuid,title text,details text) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not public.is_enabled() or not exists(select 1 from public.profiles where id=auth.uid() and role in ('client','company'))
 or not exists(select 1 from public.lawyer_profiles l join public.profiles p on p.id=l.user_id where l.user_id=lawyer and l.verification_status='approved' and l.available and p.disabled_at is null)
 then raise exception 'Contato não autorizado';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 if (select count(*) from public.contact_requests where requester_id=auth.uid() and created_at>now()-interval '1 hour')>=10 then raise exception 'Limite de solicitações';end if;
 if exists(select 1 from public.contact_requests where requester_id=auth.uid() and lawyer_id=lawyer) then raise exception 'Solicitação já existente';end if;
 insert into public.contact_requests(requester_id,lawyer_id,subject,description) values(auth.uid(),lawyer,trim(title),trim(details)) returning id into result;
 return result;
end;$$;
create function public.decide_contact(request uuid,decision text) returns void language plpgsql security definer set search_path='' as $$
declare r public.contact_requests;
begin
 select * into r from public.contact_requests where id=request for update;
 if not public.is_enabled() or r.id is null then raise exception 'Acesso negado';end if;
 if decision in ('accepted','rejected') then
 if r.lawyer_id<>auth.uid() or r.status<>'pending' or not exists(select 1 from public.lawyer_profiles where user_id=auth.uid() and verification_status='approved') then raise exception 'Acesso negado';end if;
 elsif decision='closed' then
 if auth.uid() not in (r.requester_id,r.lawyer_id) or r.status not in ('pending','accepted') then raise exception 'Acesso negado';end if;
 else raise exception 'Acesso negado';end if;
 update public.contact_requests set status=decision where id=request;
 if decision='accepted' then insert into public.conversations(request_id,requester_id,lawyer_id) values(r.id,r.requester_id,r.lawyer_id);end if;
 if decision='closed' then update public.conversations set active=false where request_id=r.id;end if;
end;$$;
create function public.send_message(conversation uuid,content text) returns public.messages language plpgsql security definer set search_path='' as $$
declare result public.messages;
begin
 if not public.can_chat(conversation) or not exists(select 1 from public.conversations where id=conversation and active) then raise exception 'Conversa não autorizada';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,1));
 if (select count(*) from public.messages where sender_id=auth.uid() and created_at>now()-interval '1 minute')>=60 then raise exception 'Limite de mensagens';end if;
 insert into public.messages(conversation_id,sender_id,body) values(conversation,auth.uid(),trim(content)) returning * into result;
 return result;
end;$$;
create function public.mark_read(conversation uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.can_chat(conversation) then raise exception 'Acesso negado';end if;
 insert into public.conversation_reads(conversation_id,user_id,read_at) values(conversation,auth.uid(),now())
 on conflict(conversation_id,user_id) do update set read_at=excluded.read_at;
end;$$;
create function public.share_document(doc uuid,recipient uuid,remove_share boolean default false) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_enabled() or not exists(select 1 from public.documents where id=doc and owner_id=auth.uid()) then raise exception 'Documento não autorizado';end if;
 if remove_share then delete from public.document_shares where document_id=doc and user_id=recipient;return;end if;
 if not exists(select 1 from public.conversations c join public.profiles p on p.id=recipient where c.active and p.disabled_at is null
 and ((c.requester_id=auth.uid() and c.lawyer_id=recipient) or (c.lawyer_id=auth.uid() and c.requester_id=recipient))) then raise exception 'Documento não autorizado';end if;
 insert into public.document_shares values(doc,recipient) on conflict do nothing;
end;$$;
create function public.verify_lawyer(target uuid,decision text,evidence text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() or decision not in ('approved','rejected') or char_length(trim(evidence)) not between 10 and 1000 then raise exception 'Acesso negado';end if;
 perform 1 from public.lawyer_profiles where user_id=target for update;
 if decision='approved' and not exists(select 1 from public.lawyer_profiles l join public.profiles p on p.id=l.user_id where l.user_id=target and p.disabled_at is null and char_length(l.bio)>=30 and l.oab_number<>'' and l.oab_state<>'' and l.city<>'' and l.state<>'' and cardinality(l.areas)>0) then raise exception 'Perfil indisponível';end if;
 update public.lawyer_profiles set verification_status=decision where user_id=target;
 if not found then raise exception 'Perfil indisponível';end if;
 insert into public.admin_audit(actor_id,action,target_id,note) values(auth.uid(),'verify:'||decision,target,trim(evidence));
end;$$;
create function public.admin_account(target uuid,suspend boolean,reason text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() or target=auth.uid() or exists(select 1 from private.admin_roles where user_id=target) or char_length(trim(reason)) not between 10 and 1000 then raise exception 'Acesso negado';end if;
 update public.profiles set disabled_at=case when suspend then now() else null end where id=target;
 if not found then raise exception 'Acesso negado';end if;
 insert into public.admin_audit(actor_id,action,target_id,note) values(auth.uid(),case when suspend then 'suspend' else 'restore' end,target,trim(reason));
end;$$;
create function public.admin_resolve(target uuid,entity text,decision text,note text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() or char_length(trim(note)) not between 10 and 1000 then raise exception 'Acesso negado';end if;
 if entity='report' and decision in ('resolved','dismissed') then update public.reports set status=decision where id=target;
 elsif entity='privacy' and decision='completed' then update public.privacy_requests set status=decision where id=target;
 else raise exception 'Acesso negado';end if;
 if not found then raise exception 'Acesso negado';end if;
 insert into public.admin_audit(actor_id,action,target_id,note) values(auth.uid(),entity||':'||decision,target,trim(note));
end;$$;
create function public.search_lawyers(query text default '',city_filter text default '',state_filter text default '',area_filter text default '',page_number integer default 1)
returns setof public.lawyer_profiles language sql stable security definer set search_path='' as $$
 select l.* from public.lawyer_profiles l join public.profiles p on p.id=l.user_id
 where l.verification_status='approved' and p.disabled_at is null
 and (query='' or l.search_vector @@ websearch_to_tsquery('simple',public.normalize_search(left(query,100))))
 and (city_filter='' or public.normalize_search(l.city)=public.normalize_search(left(city_filter,80)))
 and (state_filter='' or l.state=state_filter)
 and (area_filter='' or area_filter=any(l.areas))
 order by l.display_name,l.user_id limit 20 offset (greatest(1,least(page_number,500))-1)*20;
$$;
-- Returns only the name of a party with whom the caller already has a contact.
create function public.contact_names() returns table(id uuid,full_name text) language sql stable security definer set search_path='' as $$
 select p.id,p.full_name from public.profiles p where public.is_enabled() and exists(
 select 1 from public.contact_requests r where auth.uid() in (r.requester_id,r.lawyer_id) and p.id in (r.requester_id,r.lawyer_id));
$$;

alter table public.profiles enable row level security;
alter table public.lawyer_profiles enable row level security;
alter table public.contact_requests enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.conversation_reads enable row level security;
alter table public.documents enable row level security;
alter table public.document_shares enable row level security;
alter table public.reports enable row level security;
alter table public.privacy_requests enable row level security;
alter table public.admin_audit enable row level security;
alter table private.admin_roles enable row level security;

create policy profiles_read on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin());
create policy profiles_edit on public.profiles for update to authenticated using(id=auth.uid() and public.is_enabled()) with check(id=auth.uid() and public.is_enabled());
create policy lawyers_read on public.lawyer_profiles for select to anon,authenticated using((verification_status='approved' and exists(select 1 from public.profiles p where p.id=user_id and p.disabled_at is null)) or user_id=auth.uid() or public.is_admin());
-- The public read policy must not depend on private profiles RLS. Use a definer visibility helper.
create function public.lawyer_visible(uid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.lawyer_profiles l join public.profiles p on p.id=l.user_id where l.user_id=uid and l.verification_status='approved' and p.disabled_at is null);
$$;
drop policy lawyers_read on public.lawyer_profiles;
create policy lawyers_read on public.lawyer_profiles for select to anon,authenticated using(public.lawyer_visible(user_id) or user_id=auth.uid() or public.is_admin());
create policy lawyers_edit on public.lawyer_profiles for update to authenticated using(user_id=auth.uid() and public.is_enabled()) with check(user_id=auth.uid() and public.is_enabled());
create policy contacts_read on public.contact_requests for select to authenticated using(public.is_enabled() and auth.uid() in (requester_id,lawyer_id));
create policy conversations_read on public.conversations for select to authenticated using(public.can_chat(id));
create policy messages_read on public.messages for select to authenticated using(public.can_chat(conversation_id));
create policy reads_read on public.conversation_reads for select to authenticated using(user_id=auth.uid() and public.is_enabled());
create policy documents_read on public.documents for select to authenticated using(public.is_enabled() and (owner_id=auth.uid() or public.can_read_document(storage_path)));
create policy documents_insert on public.documents for insert to authenticated with check(owner_id=auth.uid() and public.is_enabled());
create policy documents_delete on public.documents for delete to authenticated using(owner_id=auth.uid() and public.is_enabled());
create policy shares_read on public.document_shares for select to authenticated using(public.is_enabled() and (user_id=auth.uid() or exists(select 1 from public.documents d where d.id=document_id and d.owner_id=auth.uid())));
create policy reports_read on public.reports for select to authenticated using((reporter_id=auth.uid() and public.is_enabled()) or public.is_admin());
create policy reports_insert on public.reports for insert to authenticated with check(reporter_id=auth.uid() and public.is_enabled());
create policy privacy_read on public.privacy_requests for select to authenticated using((user_id=auth.uid() and public.is_enabled()) or public.is_admin());
create policy privacy_insert on public.privacy_requests for insert to authenticated with check(user_id=auth.uid() and public.is_enabled());
create policy audit_read on public.admin_audit for select to authenticated using(public.is_admin());

-- Remove broad defaults: public metadata cannot confer admin rights; write columns are explicit.
revoke all on all tables in schema public from anon,authenticated;
grant select on public.lawyer_profiles to anon;
grant select on public.profiles,public.lawyer_profiles,public.contact_requests,public.conversations,public.messages,public.conversation_reads,public.documents,public.document_shares,public.reports,public.privacy_requests,public.admin_audit to authenticated;
grant update(full_name,city,state,company_name) on public.profiles to authenticated;
grant update(display_name,bio,oab_number,oab_state,city,state,areas,experience_years,available,avatar_url) on public.lawyer_profiles to authenticated;
grant insert(owner_id,name,storage_path),delete on public.documents to authenticated;
grant insert(reporter_id,target_id,reason) on public.reports to authenticated;
grant insert(user_id,kind,details) on public.privacy_requests to authenticated;
revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function public.is_admin(),public.is_enabled(),public.normalize_search(text),public.lawyer_visible(uuid),public.search_lawyers(text,text,text,text,integer) to anon,authenticated;
grant execute on function public.can_chat(uuid),public.can_read_document(text),public.create_contact(uuid,text,text),public.decide_contact(uuid,text),public.send_message(uuid,text),public.mark_read(uuid),public.share_document(uuid,uuid,boolean),public.verify_lawyer(uuid,text,text),public.admin_account(uuid,boolean,text),public.admin_resolve(uuid,text,text,text),public.contact_names() to authenticated;
revoke all on all functions in schema private from public,anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('documents','documents',false,10485760,array['application/pdf','image/jpeg','image/png']),
 ('avatars','avatars',true,2097152,array['image/jpeg','image/png','image/webp']);
create policy storage_private_read on storage.objects for select to authenticated using(bucket_id='documents' and public.can_read_document(name));
create policy storage_private_upload on storage.objects for insert to authenticated with check(bucket_id='documents' and (storage.foldername(name))[1]=auth.uid()::text and public.is_enabled());
create policy storage_private_delete on storage.objects for delete to authenticated using(bucket_id='documents' and (storage.foldername(name))[1]=auth.uid()::text and public.is_enabled());
create policy avatar_upload on storage.objects for insert to authenticated with check(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text and public.is_enabled());
create policy avatar_delete on storage.objects for delete to authenticated using(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text and public.is_enabled());
create policy avatar_read on storage.objects for select to anon,authenticated using(bucket_id='avatars');
alter publication supabase_realtime add table public.messages,public.contact_requests;
create function public.admin_metrics() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Acesso negado';end if;
 return jsonb_build_object('users',(select count(*) from public.profiles),'pending_lawyers',(select count(*) from public.lawyer_profiles where verification_status='pending'),'open_reports',(select count(*) from public.reports where status='open'));
end;$$;
revoke all on function public.admin_metrics() from public,anon;
grant execute on function public.admin_metrics() to authenticated;
create function public.notification_counts() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
 'pending_contacts',(select count(*) from public.contact_requests r where public.is_enabled() and r.lawyer_id=auth.uid() and r.status='pending'),
 'unread_messages',(select count(*) from public.messages m join public.conversations c on c.id=m.conversation_id
 left join public.conversation_reads cr on cr.conversation_id=c.id and cr.user_id=auth.uid()
 where public.can_chat(c.id) and m.sender_id<>auth.uid() and (cr.read_at is null or m.created_at>cr.read_at))
 );
$$;
revoke all on function public.notification_counts() from public,anon;
grant execute on function public.notification_counts() to authenticated;
