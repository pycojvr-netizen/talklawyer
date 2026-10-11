# Arquitetura do Talklawyer

## Escopo implementado

MVP de diretório profissional e comunicação: autenticação por e-mail, confirmação, recuperação, contas cliente/advogado/empresa, edição de perfis, diretório de advogados aprovados, solicitações, chat persistente, notificações internas, documentos privados, moderação e direitos dos titulares. Não há dados demonstrativos ou fallback de sucesso falso.

## Fluxo técnico

Browser → Next.js App Router → Supabase (JWT do usuário) → PostgreSQL com RLS.

- Server Components consultam os dados com a identidade da sessão.
- Route Handlers validam sessão, origem das mutações e entradas com Zod.
- `proxy.ts` renova cookies de autenticação. `auth.getUser()` valida a identidade no servidor.
- Nenhuma chave `service_role` é usada pela aplicação. Administradores também usam JWT pessoal.
- As transições críticas são funções SQL com `SECURITY DEFINER`, `search_path=''`, autorização explícita e privilégios de execução restritos. Usuários não escrevem diretamente status, membros de conversa ou auditoria.
- Contagens e histórico são persistidos no PostgreSQL. Eventos Realtime respeitam RLS; polling reconcilia mensagens quando a conexão cai.
- Arquivos usam Storage: documentos privados; avatares públicos e limitados a JPEG/PNG/WebP. Não aceitar SVG/HTML como upload.

## Pastas

```
src/app/                 páginas, layouts, manifest e API
src/app/auth/            entrada, cadastro, recuperação, callback e confirmação
src/app/dashboard/       painéis autenticados
src/app/lawyers/         diretório e perfis públicos aprovados
src/app/api/             handlers de mutação e downloads
src/components/          componentes e formulários interativos
src/lib/                 validação, tipos, sessão e utilidades
src/lib/supabase/        clientes SSR e browser
supabase/migrations/     modelo, funções, índices e políticas
supabase/tests/          checklist de integração externa
tests/                   validação e testes PostgreSQL/RLS
public/                  identidade visual e ícone PWA
docs/                    arquitetura, operação e validação
```

## Modelo de dados

| Entidade | Finalidade / acesso |
|---|---|
| auth.users | Credenciais administradas pelo Supabase |
| profiles | Dados privados e tipo de conta imutável; usuário e admin |
| lawyer_profiles | Dados públicos apenas após aprovação; dono e admin veem pendentes |
| private.admin_roles | Privilégio administrativo; provisionamento pelo operador |
| contact_requests | Solicitação entre cliente/empresa e advogado; somente partes |
| conversations | Criada atomicamente no aceite; partes fixas |
| messages | Histórico imutável para usuários; somente partes autorizadas |
| conversation_reads | Última leitura por usuário e conversa |
| documents | Metadados de arquivos privados; dono e destinatários autorizados |
| document_shares | Autorizações explícitas, revogáveis pelo dono |
| reports | Denúncias do próprio usuário e administradores |
| privacy_requests | Pedidos dos titulares e administradores |
| admin_audit | Decisões administrativas imutáveis para as contas da aplicação |
| storage.objects | RLS por bucket, caminho e autorização documental |

## Estados e invariantes

1. Cadastro cria perfil pelo trigger `auth.users`, sem confiar em papel administrativo de metadata.
2. Advogado inicia `pending`; admin consulta fonte oficial e registra referência para `approved` ou `rejected`.
3. Alterar nome profissional, biografia, OAB, cidade, estado, áreas, experiência ou foto retorna o perfil a `pending`. Alternar disponibilidade não altera a verificação.
4. Apenas cliente/empresa ativo solicita contato com profissional aprovado e disponível. Uma solicitação por par; 10 novas solicitações por hora.
5. Só o destinatário aprovado aceita/recusa. Aceite cria exatamente uma conversa em transação.
6. Partes podem encerrar pedido pendente ou aceito. Histórico permanece; novas mensagens são bloqueadas.
7. Mensagens têm até 4.000 caracteres e limite de 60/min por remetente; advisory lock impede corridas no limite.
8. Admins não acessam chats/documentos só por serem administradores.
9. Compartilhar exige contato com conversa ativa. Revogar autorização impede novos downloads; URLs anteriores expiram em 60 s. Encerrar conversa não revoga compartilhamentos anteriores: o dono deve revogá-los explicitamente.
10. Suspender conta remove perfil da busca e bloqueia ações, chats e downloads. Administradores não podem suspender a si mesmos nem outro administrador pela interface.

## Pesquisa e paginação

Busca de tokens por nome/cidade/estado via índice GIN em `tsvector`, normalização de acentos portugueses, filtros de cidade exata, UF e área via array GIN. Resultados em ordem alfabética, desempate UUID. 20 por página. Não há publicidade paga, estrelas ou ranking técnico. A busca textual usa termos completos (não autocomplete/fuzzy); cidade exata ignora caixa e acentos.

Mensagens são paginadas por `(created_at,id)` com 50 por lote. Admin usa páginas de 25; decisões recentes mostram os últimos 25 registros. Contatos e listas pessoais ainda não têm paginação: devem ser paginados antes de grande volume. Contagem de não lidas na lista faz consulta por conversa; migrar para agregação por lote em escala.

## Segurança e operação

- Grants por coluna impedem trocar role, status de aprovação ou suspensão.
- RLS em todas as tabelas; funções de leitura públicas retornam apenas dados autorizados.
- Zod + constraints SQL limitam tamanhos e enums.
- React escapa conteúdo textual; não usamos HTML de usuários.
- CSP básica, proteção de frame, MIME sniffing e políticas de permissões. CSP usa `unsafe-inline` para compatibilidade com Next; uma política estrita com nonces é melhoria de endurecimento.
- CSRF de handlers de escrita: origem deve coincidir com `NEXT_PUBLIC_SITE_URL`. Configure a variável por ambiente, inclusive previews da Vercel.
- Segredos nunca entram no repositório. `.env.local` ignorado.
- Logs administrativos não copiam mensagens/documentos e não são alteráveis pela UI. Eles não são invioláveis para o operador do banco.
- Transportes HTTPS em produção e segurança/backup dos provedores complementam os controles. Não há criptografia ponta a ponta.

## Preparação PWA e expansão

Manifest, ícone SVG, viewport e layout responsivo. Não existe service worker, cache offline ou push: evitar cache de conteúdo jurídico privado. Validar instalação em cada navegador, gerar ícones raster 192/512 e desenvolver política de cache para publicação PWA completa.

O PostgreSQL permite evoluir para organizações/membros com RBAC por organização, agenda, integrações e filas. Neste MVP cada empresa tem um único representante. Não há modelo de magistrado. Agenda e integrações judiciais pertencem à próxima etapa.
