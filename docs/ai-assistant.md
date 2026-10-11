# Assistente Talklawyer com Google Gemini

Integração pelo SDK oficial `@google/genai`, exclusivamente no servidor Node.js. Ollama deixou de ser utilizado. O layout do chat, Supabase, cartões de profissionais, páginas de processos e perfis continuam existentes. Landing page, imagens, CSS e animações não foram alterados por esta migração. Apenas textos do chat foram atualizados para informar o provedor, a privacidade e os limites reais.

## Configuração e ativação

Na pasta `C:\Users\pico\Downloads\Talklawyer_MVP\talklawyer`, configure `.env.local` ou o gerenciador de segredos do servidor:

```
GEMINI_API_KEY=sua_chave_privada
GEMINI_MODEL=gemini-3.1-flash-lite
```

Nunca use prefixo `NEXT_PUBLIC_`. Nunca cole a chave em conversas, commits, HTML ou código do navegador. Reinicie o servidor depois de configurar. Não é necessário alterar as chaves Supabase existentes; nenhuma `service_role` é utilizada. As variáveis antigas `OLLAMA_*` podem ser removidas manualmente: não são mais lidas.

Execute no SQL Editor do seu projeto Supabase, uma vez e na ordem das migrations:

- `supabase/migrations/202610110002_case_records.sql`, se os registros ainda não estiverem ativados.
- `supabase/migrations/202610110003_ai_limits.sql`, para proteção compartilhada de uso.

A proteção é obrigatória: se a migration de limites não existir, a rota retorna 503 e não chama o Gemini. Não há fallback que ignore limites. Registros privados permanecem restritos ao titular da conta.

Para verificar a conta, execute `node scripts/verify-gemini.mjs`. O script consulta o modelo com sua chave e verifica suporte a `generateContent`. Não imprime a chave nem respostas brutas de erro. Para verificar também a geração, execute `node scripts/verify-gemini.mjs --generate`: envia apenas uma frase sintética, sem dados pessoais. Isso consome uma requisição da conta.

No funcionamento normal, `models.get` é executado antes da geração, com cache de cinco minutos por configuração. Não há substituição silenciosa por outro modelo. Disponibilidade na documentação não prova acesso, cota ou habilitação nesta conta.

## Privacidade no nível gratuito

Os termos do Google proíbem enviar informações pessoais, sigilosas ou sensíveis aos serviços não pagos. Uma remoção por expressões regulares não seria suficiente para garantir isso.

Por isso, o servidor transforma localmente a última pergunta em uma categoria fixa: busca, comparação, orientação geral, carreira, currículo, entrevista, organização ou processos. Apenas a categoria e o tipo de atendimento (cliente, advogado ou empresa) entram nas instruções enviadas ao Gemini. O restante do pedido ao modelo é texto constante do sistema.

Não são enviados: perguntas originais, histórico, nomes, identificadores de conta, filtros de localização, CPF, email, documentos, currículo, registros de processos, números, fontes de processos, perfis de advogados ou conversas de contato. Não há upload, ferramentas, pesquisa externa, cache de conteúdo ou logging de prompts/chaves. O SDK necessariamente transmite a chave como autenticação ao próprio Google, nunca ao navegador.

Esta proteção limita a personalização: a resposta do Gemini é sobre o tema geral, não uma análise livre do caso concreto nem uma conversa com memória semântica. O histórico continua visível na aba, mas não é reenviado ao provedor. Perguntas fora das categorias recebem orientação genérica; casos concretos devem ser tratados com o advogado.

## Perfis, profissionais e processos

- Cliente: orientação geral para especialidade, critérios de contratação e perguntas ao profissional.
- Advogado: organização, comunicação, currículo, entrevistas e carreira. Banco de Oportunidades da OAB/SC permanece como link oficial, sem inventar vagas ou afirmar pesquisa ao vivo.
- Empresa: critérios de seleção, escopo, disponibilidade e entrevista. A comparação concreta é feita pelos cartões reais e filtros da plataforma, não por perfis inventados pelo Gemini.

A busca continua usando `search_lawyers` no Supabase. Até seis cartões reais são retornados; dados desses cartões não saem para o Gemini. Não existe ranking pago ou recomendação de pessoa inventada.

Quando a pergunta é sobre andamentos, a resposta é inteiramente local, sem chamada ao Gemini. O servidor lê até quatro registros privados da conta, identifica somente rótulos iniciais conhecidos (como juntada, conclusos e intimação) e oferece explicações gerais, com data e indicação de origem informada pelo usuário. Texto desconhecido não é interpretado como fato. Não são calculados prazos, conclusões de vitória ou consultas automáticas a tribunais. A explicação local é claramente identificada no chat.

## Autenticação e proteção contra abuso

`/api/assistant` exige sessão válida e habilitada pelo Supabase e origem igual a `NEXT_PUBLIC_SITE_URL`; preserve a URL exata usada no navegador. Antes de ler o corpo ou acessar dados, a rota solicita uma reserva atômica no banco, vinculada a `auth.uid()`.

Limites conservadores, independentes das cotas atuais do Google:

- Por conta: 6 requisições/minuto e 60 em uma janela móvel de 24 horas.
- Globais: 30/minuto e 500 em 24 horas.
- Concorrência: 1 resposta por conta, 2 no servidor.
- Reservas expiram em 90 segundos em caso de queda. Tentativas com erro também consomem quota.
- Corpo limitado a 128 KiB, inclusive sem Content-Length; mensagem até 6.000 caracteres e até 20 itens de histórico validados.
- Timeout compartilhado de 45 segundos para consulta do modelo e geração; resposta limitada a 600 tokens. Cancelamento do navegador é repassado ao SDK.

Limites e reservas ficam em uma tabela privada e são coordenados por trava transacional. Usuários não podem alterar contadores diretamente nem liberar reservas de terceiros. Só identificador de conta e metadados de tempo são armazenados, nunca conteúdo. Registros de quota com mais de 24 horas são removidos na próxima tentativa autorizada.

429 local ou do Google retorna mensagem segura e cabeçalho `Retry-After`. Não há retry automático do SDK nem reenvio automático no navegador. Erros de credencial/modelo retornam 503; timeout, 504; bloqueio de segurança, 422. Detalhes brutos do provedor não são retornados ou registrados. A proteção não substitui controle de cadastro, firewall/WAF e revisão de cotas na implantação pública.

## Verificação

Execute `npm run typecheck`, `npm test` e `npm run build`. Vitest usa threads e carregamento nativo de configuração para evitar a restrição de subprocessos do Windows. Os testes isolam o SDK e cobrem privacidade, papéis, autenticação, origem, erros, cancelamento, payload e quotas/RLS em PostgreSQL de teste. Eles não provam funcionamento com uma conta real Google ou Supabase de produção.

Na entrega não havia `GEMINI_API_KEY` configurada; a disponibilidade de `gemini-3.1-flash-lite` nesta conta e a geração real permanecem pendentes. Também é necessário aplicar a migration nova no Supabase, fazer login com cada perfil e verificar as respostas/limites com credenciais reais. Confira cotas e condições do seu projeto Google: não existe promessa de uso ilimitado ou gratuidade permanente.

Referências oficiais: [SDK JavaScript](https://googleapis.github.io/js-genai/release_docs/index.html), [modelo](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite), [termos e dados do nível gratuito](https://ai.google.dev/gemini-api/terms).
