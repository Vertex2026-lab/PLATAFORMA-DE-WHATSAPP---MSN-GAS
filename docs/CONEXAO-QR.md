# WhatsApp por QR code — DISK MSN GAS

## O que muda

O usuário escolheu uma integração não oficial via aparelhos conectados. A aplicação oferece duas sessões independentes usando whatsapp-web.js. A interface continua na Vercel, os dados e o login no Supabase e o código no GitHub. Um serviço adicional, sempre ativo, mantém Chromium e as duas sessões do WhatsApp. A Vercel não hospeda esse processo persistente.

Pedidos, etiquetas, endereço, notas, busca, filtros, conclusão/reabertura, respostas rápidas, horários e as três regras automáticas são preservados. Em modo QR não se aplica o bloqueio de janela de 24 horas da Cloud API. A API oficial continua disponível como modo padrão enquanto o novo serviço não estiver configurado.

A conexão não depende de transferir o ativo empresarial antigo na Meta: o titular escaneia o QR no seu aplicativo, como aparelho conectado. Isso não garante que o WhatsApp aceitará ou manterá a sessão. Não excluir a conta do aplicativo nem alterar vínculos empresariais para realizar o pareamento QR.

## Hospedagem sugerida: Railway

O serviço precisa de execução contínua, armazenamento persistente e memória para dois navegadores. Não usar plano que suspenda o processo por inatividade. Recomenda-se iniciar com capacidade de pelo menos 2 GB de RAM e monitorar consumo real. A contratação e qualquer custo são decididos pelo usuário no painel do provedor.

1. Entre em https://railway.com/ usando o GitHub que tem acesso ao repositório.
2. Crie um projeto e selecione **Deploy from GitHub repo**.
3. Selecione `Vertex2026-lab/PLATAFORMA-DE-WHATSAPP---MSN-GAS`, branch `main`.
4. Nas configurações do serviço, defina **Root Directory** como `/gateway`. O Dockerfile está nessa pasta; o contexto de build deve ser a pasta `gateway`, não a raiz do projeto.
5. Crie e monte um **volume persistente em `/data`**. Mantenha **uma única réplica**. O volume contém o banco SQLite, a fila de eventos, o registro de envios e as sessões LocalAuth. Não escalar duas réplicas compartilhando a mesma sessão.
6. Nas variáveis seguras do serviço, configure:

| Variável | Valor |
| --- | --- |
| `APP_BASE_URL` | `https://disk-msn-gas.vercel.app` |
| `WA_GATEWAY_TOKEN` | Segredo aleatório de pelo menos 32 caracteres, gerado e guardado pelo usuário. Não enviar no chat. |
| `DATA_DIR` | `/data` |
| `PORT` | `3002`, se o provedor não injetar outra porta automaticamente |

7. Publique o serviço. Gere um domínio público HTTPS apontando para a porta do serviço. A rota `/health` deve responder `{"ok":true}`; isso prova apenas que o processo HTTP iniciou.
8. Na Vercel, configure as variáveis de **Production**:

| Variável | Valor |
| --- | --- |
| `WA_PROVIDER` | `qr` |
| `WA_GATEWAY_URL` | URL HTTPS pública do serviço Railway, sem caminho |
| `WA_GATEWAY_TOKEN` | O mesmo segredo configurado na Railway |

9. Não altere as variáveis Supabase nem os dados existentes. Faça redeploy do código atualizado na Vercel para aplicar essas variáveis.
10. Abra o domínio principal da DISK MSN GAS e entre no login normal.

Não copiar tokens para documentação, GitHub, screenshots ou chat. O token do gateway não é entregue ao navegador. A Vercel faz as chamadas autenticadas ao serviço.

## Conectar os dois celulares

1. Na plataforma, abra **Contas WhatsApp → Conectar via QR** na primeira conta.
2. Aguarde o QR aparecer; o primeiro início do navegador pode demorar.
3. No celular do primeiro número: **WhatsApp Business → Aparelhos conectados → Conectar aparelho**. Escaneie o QR da plataforma.
4. Aguarde **WhatsApp conectado** e confira o número mostrado. Não trate o QR exibido como confirmação de pareamento.
5. Repita na segunda conta com o **outro celular/número**. O gateway rejeita conectar o mesmo número nas duas contas.
6. Feche a janela de QR. Cadastre ou receba um cliente e faça o teste real abaixo.

Se não aparecer QR, verificar primeiro se o serviço Railway está ativo, o volume `/data` está montado, a URL está correta e o mesmo token foi usado nos dois provedores. A mensagem da plataforma distingue falta de configuração, sessão desconectada e erro de autenticação. Não expor logs que contenham dados de clientes.

## Validação real obrigatória

- De um terceiro telefone, enviar mensagem ao número 1 e conferir a origem correta na central.
- Responder pela central e conferir o recebimento no terceiro telefone.
- Repetir no número 2; o mesmo cliente deve ficar separado por conta.
- Conferir boas-vindas em primeiro contato dentro do expediente, ausência uma vez por dia fora do expediente e confirmação ao mover o pedido para Preparando.
- Responder pelo celular e conferir o registro na central. Mensagens do próprio gateway não devem ser duplicadas.
- Conferir os eventos de entrega/leitura quando disponíveis. Se o destinatário não compartilhar leitura, não presumir status Lida.
- Reiniciar o serviço Railway e confirmar que as sessões persistiram pelo volume e voltaram a receber mensagens; se o WhatsApp invalidar a sessão, escanear novamente.
- Desconectar uma conta pela plataforma e confirmar que a outra permanece conectada. O botão encerra somente a sessão vinculada desta plataforma; não exclui a conta do celular.

## Persistência e comportamento de falha

- SQLite registra chaves de idempotência de envio e eventos de webhook ainda não confirmados. Erros HTTP do callback são repetidos com atraso, e eventos são deduplicados pela plataforma.
- Um envio interrompido durante reinício é marcado como incerto e não é repetido automaticamente. Confira no celular antes de realizar um novo envio.
- Envios recusados aparecem na fila de falhas da plataforma e podem ser repetidos explicitamente. Cada repetição ganha uma chave própria no gateway.
- Pedidos e dados do CRM permanecem no Supabase mesmo se uma sessão cair. As automações dependem de o gateway e a sessão estarem ativos.
- Limitações mantidas: interface envia texto; anexos recebidos são identificados para consulta no celular. Não há importação do histórico anterior ao pareamento, gestão de grupos, disparos em massa nem validação de alto volume. O banco inicial da central continua sendo um documento JSONB versionado.
- whatsapp-web.js depende da interface web do WhatsApp; mudanças externas podem exigir atualização do SDK e/ou novo pareamento. O risco de restrição ou desconexão foi aceito pelo usuário; ausência de disparos em massa não elimina esse risco.

## Testes feitos nesta implementação

- Testes da aplicação: CRM preservado, autenticação, assinatura e expiração de eventos QR, deduplicação, envio QR sem janela Meta, status de leitura e mensagens enviadas pelo celular, com gateway/provedores simulados.
- Testes do gateway: duas sessões simuladas, geração de PNG QR, idempotência, desconexão isolada, persistência após reinício, HTTP protegido e fila de webhook assinada com repetição.
- Navegador: login → API → serviço HTTP → QR → conexão simulada de duas contas → mensagem recebida → resposta → desconexão isolada → celular, sem erro JavaScript.
- SDK e navegador reais: importação de whatsapp-web.js, inicialização do Chromium instalado e operação de uma página simples. Não houve pareamento real de número neste ambiente.
- Auditoria npm do gateway: Puppeteer atualizado por override explícito para `25.16.0`; nenhuma vulnerabilidade reportada na auditoria executada. A importação do SDK e o uso do navegador foram verificados com essa versão; a compatibilidade de sessão real será confirmada no pareamento.
- O build Docker local não pôde completar devido a falha de DNS para `deb.debian.org` dentro do container deste ambiente. O Dockerfile mantém verificação de pacotes e falha se a atualização dos índices não ocorrer. O build do provedor e os testes reais acima permanecem obrigatórios.

## Reversão

Se necessário, voltar `WA_PROVIDER` para `meta` na Vercel e republicar. A API oficial só poderá enviar se suas próprias credenciais estiverem configuradas. A mudança de modo não apaga clientes, pedidos ou mensagens. Envios já enfileirados mantêm o provedor original; não são redirecionados silenciosamente para outro canal.
