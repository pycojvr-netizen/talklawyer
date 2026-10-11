import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll,afterAll,test,expect } from 'vitest';
const db=new PGlite();
const ids={admin:'00000000-0000-4000-8000-000000000001',client:'00000000-0000-4000-8000-000000000002',lawyer:'00000000-0000-4000-8000-000000000003',outsider:'00000000-0000-4000-8000-000000000004',lawyer2:'00000000-0000-4000-8000-000000000005'};
async function as(id:string|null,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec(`set role ${role}`);}
async function rows<T=Record<string,unknown>>(sql:string,params:unknown[]=[]){return (await db.query<T>(sql,params)).rows;}
let request:string,conversation:string,document:string;
beforeAll(async()=>{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 grant usage on schema storage to anon,authenticated;grant select,insert,delete on storage.objects to anon,authenticated;
 create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
 create publication supabase_realtime;`);
 await db.exec(readFileSync('supabase/migrations/202610110001_mvp.sql','utf8'));
 await db.exec(readFileSync('supabase/migrations/202610110002_case_records.sql','utf8'));
 await db.exec(readFileSync('supabase/migrations/202610110003_ai_limits.sql','utf8'));
 for(const [name,id] of Object.entries(ids)){await db.query('insert into auth.users values($1,$2)',[id,JSON.stringify({role:name.startsWith('lawyer')?'lawyer':'client',full_name:`Conta ${name}`,terms_accepted:true,terms_version:'2026-10-11'})]);}
 await db.query('insert into private.admin_roles values($1)',[ids.admin]);
},120000);
afterAll(async()=>{await db.close();});

test('IA exige autenticação e quota não pode ser manipulada diretamente',async()=>{
 await as(null,'anon');await expect(db.query('select public.claim_ai_request()')).rejects.toThrow();
 await as(ids.client);await expect(db.query('select * from private.ai_requests')).rejects.toThrow();
 await expect(db.query('insert into private.ai_requests(user_id) values($1)',[ids.client])).rejects.toThrow();
});

test('IA serializa concorrência e só o dono libera a sua reserva',async()=>{
 await as(null,'postgres');await db.exec('truncate private.ai_requests');
 await as(ids.client);const token=(await rows<{token:string}>('select public.claim_ai_request() as token'))[0].token;
 await expect(db.query('select public.claim_ai_request()')).rejects.toThrow('AI_BUSY:15');
 await as(ids.outsider);await db.query('select public.release_ai_request($1)',[token]);
 const other=(await rows<{token:string}>('select public.claim_ai_request() as token'))[0].token;
 await as(ids.lawyer);await expect(db.query('select public.claim_ai_request()')).rejects.toThrow('AI_BUSY:15');
 await as(ids.client);await expect(db.query('select public.claim_ai_request()')).rejects.toThrow('AI_BUSY:15');
 await db.query('select public.release_ai_request($1)',[token]);
 await as(ids.lawyer);const third=(await rows<{token:string}>('select public.claim_ai_request() as token'))[0].token;
 await db.query('select public.release_ai_request($1)',[third]);
 await as(ids.outsider);await db.query('select public.release_ai_request($1)',[other]);
});

test('IA limita seis chamadas por minuto e sessenta em 24 horas por usuário',async()=>{
 await as(null,'postgres');await db.exec('truncate private.ai_requests');
 await as(ids.client);
 for(let i=0;i<6;i++){const token=(await rows<{token:string}>('select public.claim_ai_request() as token'))[0].token;await db.query('select public.release_ai_request($1)',[token]);}
 await expect(db.query('select public.claim_ai_request()')).rejects.toThrow('AI_RATE_LIMIT:60');
 await as(null,'postgres');await db.exec('truncate private.ai_requests');
 await db.query("insert into private.ai_requests(user_id,created_at,lease_until) select $1,now()-interval '2 hours',now()-interval '2 hours' from generate_series(1,60)",[ids.client]);
 await as(ids.client);await expect(db.query('select public.claim_ai_request()')).rejects.toThrow('AI_RATE_LIMIT:86400');
});

test('IA aplica orçamento global e expira reservas após queda do servidor',async()=>{
 await as(null,'postgres');await db.exec('truncate private.ai_requests');
 await db.query("insert into private.ai_requests(user_id,lease_until) select $1,now()-interval '1 second' from generate_series(1,30)",[ids.client]);
 await as(ids.outsider);await expect(db.query('select public.claim_ai_request()')).rejects.toThrow('AI_RATE_LIMIT:60');
 await as(null,'postgres');await db.exec('truncate private.ai_requests');
 await db.query("insert into private.ai_requests(user_id,created_at,lease_until) select $1,now()-interval '2 hours',now()-interval '2 hours' from generate_series(1,500)",[ids.client]);
 await as(ids.outsider);await expect(db.query('select public.claim_ai_request()')).rejects.toThrow('AI_RATE_LIMIT:86400');
 await as(null,'postgres');await db.exec('truncate private.ai_requests');
 await db.query("insert into private.ai_requests(user_id,created_at,lease_until) values($1,now()-interval '25 hours',now()-interval '25 hours'),($1,now()-interval '2 minutes',now()-interval '1 second')",[ids.client]);
 await as(ids.client);await expect(db.query('select public.claim_ai_request()')).resolves.toBeDefined();
 await as(null,'postgres');expect((await rows('select * from private.ai_requests')).length).toBe(2);await db.exec('truncate private.ai_requests');
});
test('metadata não cria administrador e role inválida é rejeitada',async()=>{
 await as(ids.client);expect((await rows<{is_admin:boolean}>('select public.is_admin()'))[0].is_admin).toBe(false);
 await expect(db.query('update public.profiles set role=$1 where id=$2',['lawyer',ids.client])).rejects.toThrow();
 await expect(db.query('insert into private.admin_roles values($1)',[ids.client])).rejects.toThrow();
 await as(null,'postgres');await expect(db.query('insert into auth.users values($1,$2)',['00000000-0000-4000-8000-000000000006',JSON.stringify({role:'admin',full_name:'Administrador fraudulento',terms_accepted:true,terms_version:'2026-10-11'})])).rejects.toThrow('Cadastro inválido');
});
test('perfis pessoais são privados e profissional não pode se aprovar',async()=>{
 await as(ids.lawyer);await db.query(`update public.lawyer_profiles set display_name='Advogada Teste',bio='Profissional de teste com atuação exclusivamente informativa.',oab_number='12345',oab_state='RS',city='Bagé',state='RS',areas=array['Civil'] where user_id=$1`,[ids.lawyer]);
 await expect(db.query("update public.lawyer_profiles set verification_status='approved' where user_id=$1",[ids.lawyer])).rejects.toThrow();
 await expect(db.query("select public.verify_lawyer($1,'approved','Consulta fraudulenta')",[ids.lawyer])).rejects.toThrow('Acesso negado');
 await as(ids.client);expect((await rows('select * from public.profiles')).length).toBe(1);expect((await rows('select * from public.lawyer_profiles')).length).toBe(0);
 await expect(db.query('select public.create_contact($1,$2,$3)',[ids.lawyer,'Teste contato','Descrição de um contato legítimo.'])).rejects.toThrow('Contato não autorizado');
});
test('aprovação gera auditoria e pesquisa só exibe perfil aprovado',async()=>{
 await as(ids.admin);await db.query("select public.verify_lawyer($1,'approved','Consulta oficial OAB em 11/10/2026: inscrição ativa e identidade conferida')",[ids.lawyer]);
 expect((await rows('select * from public.admin_audit')).length).toBe(1);
 await as(null,'anon');expect((await rows('select * from public.search_lawyers()')).length).toBe(1);expect((await rows("select * from public.search_lawyers('Teste','Bagé','RS','Civil',1)")).length).toBe(1);
 expect((await rows("select * from public.search_lawyers('','bage','RS','Civil',1)")).length).toBe(1);
 expect((await rows("select * from public.search_lawyers('','','SC','Civil',1)")).length).toBe(0);
 await expect(db.query('select * from public.profiles')).rejects.toThrow();
});
test('solicitação é persistente, única e aceite somente pelo destinatário',async()=>{
 await as(ids.client);request=(await rows<{id:string}>("select public.create_contact($1,'Dúvida sobre contrato','Preciso conversar sobre um contrato empresarial.') as id",[ids.lawyer]))[0].id;
 await expect(db.query("select public.create_contact($1,'Dúvida sobre contrato','Nova tentativa de contato.')",[ids.lawyer])).rejects.toThrow('Solicitação já existente');
 await expect(db.query("select public.decide_contact($1,'accepted')",[request])).rejects.toThrow('Acesso negado');
 await as(ids.outsider);expect((await rows('select * from public.contact_requests')).length).toBe(0);expect((await rows('select * from public.contact_names()')).length).toBe(0);
 await as(ids.lawyer);await db.query("select public.decide_contact($1,'accepted')",[request]);conversation=(await rows<{id:string}>('select id from public.conversations'))[0].id;
 await expect(db.query('insert into public.conversations(request_id,requester_id,lawyer_id) values($1,$2,$3)',[request,ids.outsider,ids.lawyer])).rejects.toThrow();
});
test('mensagens são persistentes e terceiros e admins não têm acesso',async()=>{
 await as(ids.client);await db.query("select public.send_message($1,'Mensagem privada do cliente')",[conversation]);
 await db.query('select public.mark_read($1)',[conversation]);expect((await rows('select * from public.conversation_reads')).length).toBe(1);
 await as(ids.lawyer);expect((await rows('select * from public.messages')).length).toBe(1);await db.query("select public.send_message($1,'Resposta do advogado')",[conversation]);
 await as(ids.client);const alerts=(await rows<{notification_counts:{unread_messages:number}}>('select public.notification_counts()'))[0].notification_counts;expect(alerts.unread_messages).toBe(1);
 await db.query('select public.mark_read($1)',[conversation]);expect((await rows<{notification_counts:{unread_messages:number}}>('select public.notification_counts()'))[0].notification_counts.unread_messages).toBe(0);
 for(const id of [ids.outsider,ids.admin]){await as(id);expect((await rows('select * from public.messages')).length).toBe(0);expect((await rows('select * from public.conversations')).length).toBe(0);await expect(db.query("select public.send_message($1,'Invasão de conversa')",[conversation])).rejects.toThrow('Conversa não autorizada');}
});
test('armazenamento privado exige proprietário e compartilhamento autorizado',async()=>{
 const path=`${ids.client}/contrato.pdf`;
 await as(ids.client);await db.query("insert into storage.objects(bucket_id,name) values('documents',$1)",[path]);
 await expect(db.query("insert into storage.objects(bucket_id,name) values('documents',$1)",[`${ids.outsider}/fraude.pdf`])).rejects.toThrow();
 document=(await rows<{id:string}>('insert into public.documents(owner_id,name,storage_path) values($1,$2,$3) returning id',[ids.client,'Contrato.pdf',path]))[0].id;
 await as(ids.outsider);expect((await rows("select * from storage.objects where bucket_id='documents'")).length).toBe(0);expect((await rows('select * from public.documents')).length).toBe(0);
 await as(ids.admin);expect((await rows('select * from public.documents')).length).toBe(0);
 await as(ids.client);await expect(db.query('select public.share_document($1,$2,false)',[document,ids.outsider])).rejects.toThrow('Documento não autorizado');await db.query('select public.share_document($1,$2,false)',[document,ids.lawyer]);
 await as(ids.lawyer);expect((await rows('select * from public.documents')).length).toBe(1);expect((await rows("select * from storage.objects where bucket_id='documents'")).length).toBe(1);
 await expect(db.query('delete from public.documents where id=$1 returning id',[document]).then(r=>{if(r.rows.length===0)throw Error('not permitted');})).rejects.toThrow('not permitted');
 await as(ids.client);await db.query('select public.share_document($1,$2,true)',[document,ids.lawyer]);await as(ids.lawyer);expect((await rows('select * from public.documents')).length).toBe(0);
});
test('mudança profissional remove selo e encerramento bloqueia novas mensagens',async()=>{
 await as(ids.lawyer);await db.query("update public.lawyer_profiles set bio='Biografia alterada e sujeita a uma nova verificação administrativa.' where user_id=$1",[ids.lawyer]);
 expect((await rows<{verification_status:string}>('select verification_status from public.lawyer_profiles'))[0].verification_status).toBe('pending');
 await as(null,'anon');expect((await rows('select * from public.search_lawyers()')).length).toBe(0);
 await as(ids.client);await db.query("select public.decide_contact($1,'closed')",[request]);await expect(db.query("select public.send_message($1,'Tentativa após encerrar')",[conversation])).rejects.toThrow('Conversa não autorizada');expect((await rows('select * from public.messages')).length).toBe(2);
});
test('denúncias e pedidos de titulares são privados, ações administrativas auditadas',async()=>{
 await as(ids.client);const report=(await rows<{id:string}>("insert into public.reports(reporter_id,target_id,reason) values($1,$2,'Dados inconsistentes no perfil informado') returning id",[ids.client,ids.lawyer]))[0].id;
 await db.query("insert into public.privacy_requests(user_id,kind,details) values($1,'access','Solicito o acesso aos meus dados pessoais.')",[ids.client]);
 await as(ids.outsider);expect((await rows('select * from public.reports')).length).toBe(0);expect((await rows('select * from public.privacy_requests')).length).toBe(0);await expect(db.query('select public.admin_metrics()')).rejects.toThrow('Acesso negado');
 await as(ids.admin);await db.query("select public.admin_resolve($1,'report','resolved','Perfil revisado e divergência confirmada.')",[report]);expect((await rows('select * from public.privacy_requests')).length).toBe(1);const stats=(await rows<{admin_metrics:{users:number}}>('select public.admin_metrics()'))[0].admin_metrics;expect(stats.users).toBe(5);
 await db.query("select public.admin_account($1,true,'Suspensão de teste por violação de regras.')",[ids.client]);
 await as(ids.client);expect((await rows<{is_enabled:boolean}>('select public.is_enabled()'))[0].is_enabled).toBe(false);expect((await rows('select * from public.messages')).length).toBe(0);await expect(db.query("select public.send_message($1,'Acesso indevido')",[conversation])).rejects.toThrow();
});

test('mensagens têm limite transacional no banco e não permitem corpo vazio',async()=>{
 await as(ids.admin);await db.query("select public.admin_account($1,false,'Reativação da conta para teste de limites.')",[ids.client]);
 await as(ids.lawyer2);await db.query("update public.lawyer_profiles set bio='Profissional de teste com atuação informativa e dados completos.',oab_number='77777',oab_state='RS',city='Bagé',state='RS',areas=array['Civil'] where user_id=$1",[ids.lawyer2]);
 await as(ids.admin);await db.query("select public.verify_lawyer($1,'approved','Consulta oficial realizada para teste de limites.')",[ids.lawyer2]);
 await as(ids.client);const req=(await rows<{id:string}>("select public.create_contact($1,'Teste de limites','Contato legítimo para testar limites de envio.') as id",[ids.lawyer2]))[0].id;
 await as(ids.lawyer2);await db.query("select public.decide_contact($1,'accepted')",[req]);const cid=(await rows<{id:string}>('select id from public.conversations where request_id=$1',[req]))[0].id;
 await expect(db.query("select public.send_message($1,'   ')",[cid])).rejects.toThrow();
 for(let i=0;i<60;i++)await db.query('select public.send_message($1,$2)',[cid,`Mensagem ${i}`]);
 await expect(db.query("select public.send_message($1,'Acima do limite')",[cid])).rejects.toThrow('Limite de mensagens');
});
test('andamentos são privados inclusive para administradores e não permitem forjar proprietário',async()=>{
 await as(ids.client);
 const entry=(await rows<{id:string}>("insert into public.case_records(owner_id,title,movement,movement_date) values($1,'Contrato privado','Documento juntado para análise','2026-10-11') returning id",[ids.client]))[0].id;
 expect((await rows('select * from public.case_records where id=$1',[entry])).length).toBe(1);
 await expect(db.query("insert into public.case_records(owner_id,title,movement,movement_date) values($1,'Registro forjado','Movimentação falsa','2026-10-11')",[ids.outsider])).rejects.toThrow();
 for(const id of [ids.outsider,ids.admin,ids.lawyer]){
  await as(id);expect((await rows('select * from public.case_records where id=$1',[entry])).length).toBe(0);
 }
 await as(null,'anon');await expect(db.query('select * from public.case_records')).rejects.toThrow();
});

