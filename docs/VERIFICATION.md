# Verificação executada nesta entrega

## Resultados

| Verificação | Resultado |
|---|---|
| Testes Vitest | 12 testes passaram em 2 arquivos |
| SQL em PostgreSQL/PGlite | Migration executada integralmente; constraints, RLS, grants e funções exercitados |
| TypeScript | Sem erros após correções |
| Build Next.js de produção | Compilação e geração de rotas passaram |
| Auditoria npm de dependências de produção | 0 vulnerabilidades reportadas na execução |
| Execução HTTP de produção | Aplicação iniciada localmente; 9 verificações passaram |

Smoke HTTP: `/`, `/auth?mode=signup`, `/lawyers`, `/terms`, `/privacy` e manifest retornaram 200. Dashboard sem sessão redirecionou com 307. API sem sessão/origem válida retornou 401; origem externa retornou 403. Headers de proteção conferidos. Execute `npm run build` seguido de `npm run verify:http` **em configuração sem Supabase** para repetir este smoke. O script inicia e encerra o servidor automaticamente na porta 3010.

## Cobertura SQL

- Papel administrativo não pode ser concedido por metadata/API.
- Papel da conta imutável; perfis pessoais privados.
- Advogado não se autoaprova; perfil pendente não recebe contato.
- Aprovação gera auditoria; pesquisa ignora acentos e respeita filtros.
- Contato único por par; terceiros não veem pedidos; cliente não aceita próprio pedido.
- Aceite cria conversa e fixa participantes.
- Terceiros e administradores não leem conversas por privilégio global.
- Histórico persistente, última leitura e contagens de notificações.
- Bucket privado, caminho do dono e compartilhamento somente com contato autorizado.
- Revogação remove visibilidade; destinatário não exclui arquivo do dono.
- Alteração profissional retorna aprovação a pendente.
- Encerramento preserva histórico e bloqueia envio.
- Denúncias e direitos dos titulares privados; resoluções administrativas auditadas.
- Suspensão bloqueia acesso a dados e ações.
- Mensagens vazias rejeitadas e limite de 60/min no banco.
- Entradas inválidas e redirecionamentos externos rejeitados.

Uma falha encontrada na primeira execução foi corrigida: SELECT da inserção documental com RETURNING não reconhecia a linha recém-inserida por meio de uma função STABLE. A política agora reconhece diretamente o proprietário antes de consultar autorizações de compartilhamento. Os testes passaram depois da correção.

## Limites da verificação

Não foi disponibilizado projeto ou credencial Supabase/Vercel. Não foram exercitados os serviços de entrega de e-mail, refresh remoto real, canais WebSocket, emissão/expiração real de links do Storage ou deploy. Os esquemas Auth/Storage e a publicação no PGlite representam a infraestrutura esperada; o mecanismo PostgreSQL/RLS é real. Não houve teste visual em navegador ou teste em dispositivo móvel neste ambiente.

A entrega é uma implementação compilável e verificável do MVP, com homologação externa pendente. Nenhuma credencial fictícia ou sucesso simulado foi incluído. O roteiro restante está em `supabase/tests/INTEGRATION.md`.
