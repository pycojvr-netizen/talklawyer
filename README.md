# Talklawyer — MVP jurídico full-stack

Projeto Next.js + React + TypeScript + Tailwind + Supabase preparado para Vercel. Interface PT-BR, azul-marinho/dourado, temas claro/escuro, responsiva. Dados e ações reais, sem perfis demonstrativos.

**Estado:** implementação compilada e testada localmente. Para funcionar com usuários reais, configure seu Supabase, aplique o SQL e execute o roteiro de integração. Sem credenciais externas não foi possível verificar e-mail, WebSocket, Storage assinado ou deploy Vercel. Não trate esses serviços como homologados só porque o build passou.

## 1. Requisitos

- Node.js 22 LTS ou 24 LTS; Next requer ao menos 20.9. Node 24.19.0 foi usado nesta execução.
- npm e um projeto Supabase dedicado.
- Para publicar: conta Vercel. Não é necessário enviar suas chaves no chat.

Versões principais fixadas: Next 16.4.0, React/React DOM 19.3.0, Supabase JS 2.117.3, Supabase SSR 0.12.7. `package-lock.json` fixa a resolução de todas as dependências. Use `npm ci`.

## 2. Instalação (Windows / PowerShell)

Extraia o ZIP, abra o terminal na pasta `talklawyer`:

```powershell
npm ci
Copy-Item .env.example .env.local
```

Em macOS/Linux:

```bash
npm ci
cp .env.example .env.local
```

Edite `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICAVEL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Copie URL e publishable key de **Supabase → Project Settings → API**. Esses valores são públicos por design; a autorização vem da sessão e das políticas RLS. **Nunca coloque service_role em variável NEXT_PUBLIC.** A aplicação não exige service_role.

## 3. Banco e Storage

Use um projeto dedicado, sem tabelas preexistentes da aplicação.

Abra **Supabase → SQL Editor** e execute uma única vez o conteúdo de:

```
supabase/migrations/202610110001_mvp.sql
```

O arquivo cria perfis, solicitações, conversas, mensagens, documentos, denúncias, pedidos de titulares, auditoria, índices, grants por coluna, RLS e buckets. Ativa a publicação Realtime para `messages` e `contact_requests`. A migration é versionada e não foi feita para ser reaplicada manualmente no mesmo banco.

Alternativamente, com Supabase CLI instalado:

```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

O config mínimo da CLI está em `supabase/config.toml`. O CLI/Docker não são necessários para rodar a aplicação conectada ao projeto remoto. Os testes SQL locais usam PGlite.

## 4. Autenticação

Em **Authentication → Providers → Email**:

- Ative email/password e confirmação de e-mail.
- Configure senha mínima de 12 caracteres no provedor, além da validação da interface.
- Configure SMTP de produção e limites de envio apropriados. O serviço padrão tem limites e restrições; teste com seus destinatários.
- Considere CAPTCHA/Turnstile e proteções nativas contra abuso antes de disponibilizar cadastro público. O formulário atual não integra desafio CAPTCHA.

Em **Authentication → URL Configuration**:

- Site URL local: `http://localhost:3000`.
- Redirect URLs: `http://localhost:3000/auth/callback` e `http://localhost:3000/auth/callback?next=/auth?mode=update`.
- Em produção: seu domínio HTTPS e equivalentes `/auth/callback`.
- Para não depender de iniciar cadastro e confirmação no mesmo navegador, ajuste os templates de confirmação/recovery para validar `token_hash` no servidor:

Confirmação:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup">Confirmar meu e-mail</a>
```

Recuperação:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Redefinir minha senha</a>
```

Os dois caminhos de callback são implementados. Configure Site URL corretamente para cada projeto (use projetos separados para produção e desenvolvimento).

## 5. Primeiro administrador

Crie uma conta normal, confirme o e-mail e copie seu UUID em **Authentication → Users**. No SQL Editor, execute substituindo o UUID real:

```sql
insert into private.admin_roles(user_id)
values ('UUID_REAL_DA_CONTA')
on conflict do nothing;
```

Entre novamente e abra `/dashboard/admin`. Ninguém pode se promover por metadata ou pela API pública. Administradores adicionais são provisionados pelo operador no SQL Editor; a UI não concede esse poder.

## 6. Executar

```bash
npm run dev
```

Abra `http://localhost:3000`.

Produção local:

```bash
npm run build
npm run start
```

Sem Supabase configurado, landing, termos e formulários abrem com aviso de configuração. Não existe login fictício nem sucesso simulado.

## 7. Primeiro fluxo real

1. Crie advogado, cliente e empresa com e-mails diferentes e confirme as contas.
2. Advogado: `/dashboard/profile`, preencha biografia, OAB/UF, localização e áreas. Envie foto se desejar.
3. Admin: consulte inscrição e identidade na fonte oficial da OAB; registre fonte/data/conclusão e aprove.
4. Cliente ou empresa: `/lawyers`, pesquise, abra perfil e envie solicitação.
5. Advogado: `/dashboard/contacts`, aceite. A conversa é criada pelo banco.
6. Abra `/dashboard/messages` em dois navegadores com as respectivas contas. Envie mensagens, recarregue, confira histórico e notificações internas.
7. Envie documento privado, compartilhe com esse contato e revogue. Verifique download pelo dono, pelo autorizado e rejeição para terceiro.
8. Encerre o contato. As mensagens anteriores permanecem, novas mensagens são negadas.

## 8. Verificações

```bash
npm test
npm run typecheck
npm run build
npm audit --omit=dev
```

`tests/security.test.ts` executa a migration em PostgreSQL via PGlite e troca papéis `anon`, `authenticated` e operador para testar RLS e privilégios. Auth, Storage e publicação são esquemas de infraestrutura simulados **apenas no banco de testes**. O teste valida SQL/RLS real; não substitui testar os serviços remotos.

Leia `docs/VERIFICATION.md` para os resultados executados e `supabase/tests/INTEGRATION.md` para a homologação obrigatória com o Supabase configurado.

## 9. Deploy Vercel

1. Envie o projeto para um repositório Git de sua escolha (sem `.env.local`).
2. Importe na Vercel, framework Next.js; root directory é a pasta que contém `package.json`.
3. Configure as três variáveis de `.env.example`. `NEXT_PUBLIC_SITE_URL` deve ser a origem HTTPS exata, sem caminho e sem barra final. Configure por ambiente.
4. Build Command: `npm run build`; Install Command: `npm ci`; Node 22 ou 24 LTS.
5. Aplique a migration no projeto Supabase de produção, revise grants/RLS e provisione o admin.
6. Configure Site URL/redirects/SMTP de produção no Supabase e publique.
7. Execute o roteiro de integração em produção antes de admitir usuários externos.

Nenhum deploy foi feito aqui: credenciais e projeto Vercel/Supabase não foram fornecidos. Sites usa outro runtime de hospedagem; esta entrega preserva o Next.js solicitado para Vercel.

## 10. Limites e próximos módulos

Implementados: auth, tipos de conta, perfis, pesquisa, contatos, chat, notificações internas, documentos, admin/moderação, formulários dos titulares e minutas legais.

Próxima etapa: agenda, notificações push/e-mail transacionais de mensagens, equipes empresariais, exportação/exclusão automatizada com política de retenção, verificação OAB integrada quando houver canal autorizado, maior paginação, observabilidade e backup/restauração. Manifest/ícone preparam PWA; não há offline ou service worker.

A consulta da OAB é manual. Termos e privacidade são **minutas**, com dados do operador pendentes; devem ser concluídos e revisados antes do lançamento. Pedidos LGPD são registrados e moderados; marcar um pedido como atendido **não exporta nem exclui dados automaticamente**. Anote as providências realizadas e só finalize após atendimento efetivo.

Não há magistrados no fluxo comercial, leilões, comissões jurídicas, ranking pago ou promessa de resultados.

## Referências

- Next.js: https://nextjs.org/docs/app/getting-started/installation
- Supabase SSR: https://supabase.com/docs/guides/auth/server-side/creating-a-client
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- OAB, Provimento 205/2021: https://www.oab.org.br/leisnormas/legislacao/provimentos/205-2021

Detalhes do modelo, fronteiras de acesso e decisões técnicas: `docs/ARCHITECTURE.md`.
