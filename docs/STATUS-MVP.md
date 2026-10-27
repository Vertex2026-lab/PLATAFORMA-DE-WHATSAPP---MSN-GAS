# Estado de execução — 27/10/2026

## Confirmado pelo usuário na versão publicada

- Login e leitura/gravação no Supabase com chave nova `sb_secret_…` configurada na Vercel.
- Cadastro de cliente de teste persistiu depois de atualizar a página.
- Endereço, criação de pedido, etapas Novo pedido → Preparando → Em entrega → Entregue e persistência do status.
- Etiqueta Cliente recorrente persistiu após atualização.
- Conclusão e reabertura do atendimento.
- Resposta rápida Pedir endereço preencheu o campo de composição.
- Três mensagens automáticas editadas e persistidas; três regras habilitadas.
- Expediente configurado e persistido: todos os dias, 06h30 às 19h30, Fortaleza.

## Decisão de integração

Os dois números já usam WhatsApp Business e recebem SMS/ligação. Ambos apresentaram vínculo com um portfólio empresarial antigo, que não apareceu entre os portfólios acessíveis na sessão do usuário. O usuário escolheu conexão não oficial por QR code e aceitou o risco de restrição/desconexão. Não insistir no fluxo de transferência de números pela Meta como pré-requisito desse novo caminho.

O código de QR foi implementado com serviço persistente em `gateway/`, duas sessões, volume LocalAuth/SQLite, token de servidor, callbacks assinados e interface autenticada. A configuração e o roteiro estão em `docs/CONEXAO-QR.md`.

## Testado localmente na mudança QR

- Aplicação: 18 testes automatizados passaram.
- Gateway: 3 testes de cenários passaram, incluindo sessões independentes, envios concorrentes serializados/idempotentes, recebimento, status, persistência e callback autenticado/repetido.
- Navegador: regressão dos fluxos anteriores e cenário QR completo com SDK/sessões simulados passaram.
- SDK real carregou com Puppeteer atualizado; Chromium local iniciou e respondeu a uma página simples.
- Gateway real iniciou localmente com configuração sintética, respondeu `/health` e rejeitou consulta de sessão sem token.
- Auditoria npm do gateway não reportou vulnerabilidades após atualizar Puppeteer por override.
- Build estático passou. Build Docker ficou bloqueado por DNS do container para o repositório Debian; não é um build de container aprovado.

## Pendências externas / próximo passo

1. Usuário informou não ter VPS/conta de hospedagem e quer o caminho mais simples: orientar entrada na Railway com GitHub, uma instrução por mensagem.
2. Criar serviço com root directory `/gateway`, volume `/data`, uma réplica e configuração segura. Custos e contratação ficam a cargo do usuário; não presumir plano gratuito sempre ativo.
3. Configurar gateway e Vercel conforme guia e confirmar build/publicação do serviço.
4. Escanear QR de cada número e validar envio/recebimento reais, automações e reinício com sessões persistidas.
5. A revogação completa da chave legada exposta continua pendente. O usuário pediu para interromper essa investigação e prosseguir; a nova chave funciona, mas isso não prova revogação da antiga. Não afirmar segurança concluída.
6. Anexos na central, importação de histórico e validação de alto volume continuam fora da implementação atual.

Não classificar a conexão real dos números como concluída apenas por o código ter sido enviado ao GitHub ou o botão de QR aparecer. Não solicitar chaves, QR de pareamento, senhas ou códigos de verificação no chat.
