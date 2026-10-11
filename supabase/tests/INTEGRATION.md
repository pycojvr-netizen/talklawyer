# Homologação com Supabase real

Não executada nesta entrega: depende das variáveis e do projeto do operador. Use ambiente separado de produção e contas próprias.

- [ ] Aplicar migration sem erro; todas as tabelas com RLS ativa; buckets documentos privado/avatars público.
- [ ] Criar/confirmar contas cliente, advogado e empresa. Verificar role imutável; metadata `admin` não aceita.
- [ ] Testar e-mail de confirmação no navegador original e em outro aparelho via token_hash.
- [ ] Recuperar senha, validar link, expiração e tentativa de reutilização. Nova senha funciona, antiga falha.
- [ ] Testar refresh de sessão após expirar access token; páginas privadas não são cacheadas entre contas.
- [ ] Advogado pendente não aparece na busca. Cliente não consegue aprovar perfil por REST/RPC.
- [ ] Aprovar somente após verificar fonte oficial; auditoria registra responsável/nota/data.
- [ ] Verificar filtros combinados, acentos, cidade e páginas com dados reais. Ordem alfabética sem patrocínio.
- [ ] Cliente envia contato; duplicata falha; terceiro não lê o pedido; cliente não pode aceitar.
- [ ] Advogado aceita; duas abas recebem mensagens em tempo real. Recarregar mantém histórico.
- [ ] Derrubar WebSocket e reconectar: polling/retomada sincronizam histórico.
- [ ] Mensagem não lida incrementa badge. Abrir conversa atualiza última leitura e zera badge após sincronização.
- [ ] Encerrar conversa: histórico visível, envio negado pelo banco inclusive REST direto.
- [ ] Subir PDF/PNG/JPEG válido; MIME e tamanho não permitidos são rejeitados pelo Storage.
- [ ] URL direta do documento privado falha. Link assinado expira após 60 segundos.
- [ ] Compartilhar com contato ativo, baixar como destinatário; terceiro e admin não acessam.
- [ ] Revogar compartilhamento; novos links falham. URLs anteriores podem durar até sua expiração.
- [ ] Alterar dado profissional retira publicação/selo até nova verificação.
- [ ] Registrar denúncia e solicitação de titular; outros usuários não veem; admin analisa e audita conclusão.
- [ ] Suspender conta: perfil sai da pesquisa; chats/envios/downloads negados.
- [ ] Chamada API de mutação com Origin externo falha com 403; sem sessão com Origin correto falha com 401.
- [ ] Testar mobile, teclado, tema claro/escuro, contraste e leitores de tela.
- [ ] Revisar termos/privacidade com identidade e canais reais do operador; definir retenção/expurgo, região e tratamento de dados sensíveis.
- [ ] Configurar SMTP, limites, monitoramento de incidentes e backup; testar restauração fora de produção.
- [ ] Verificar HTTPS, variáveis, redirects e fluxos depois do deploy na Vercel.
