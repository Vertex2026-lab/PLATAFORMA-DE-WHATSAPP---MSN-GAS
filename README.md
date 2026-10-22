# DISK MSN GAS

Central web em laranja e preto para atender clientes de duas contas WhatsApp Business. Interface com atendimento, clientes, pedidos, etiquetas, automações, contas e configurações.

## Dois modos

- **Demonstração:** sem variáveis do servidor, mantém os dados fictícios no navegador e não envia WhatsApp.
- **Operacional:** banco Supabase configurado e usuários autorizados habilitam login, dados compartilhados e API. Tokens e números oficiais habilitam a integração WhatsApp. A base real começa vazia.

**A integração real depende de configurar e validar os serviços externos. O código implementado não significa que os dois números já estejam conectados.**

Veja [o passo a passo de ativação](docs/ATIVAR-MVP.md).

## Desenvolvimento

Node.js 24, sem dependências externas de execução.

```sh
npm ci --ignore-scripts
npm run dev
```

O servidor local usa a porta 3001. Para o modo operacional, copie `.env.example` para `.env` e preencha os valores somente na sua máquina. Não versione credenciais. Cada tarefa cloud já é isolada; use o checkout existente sem criar worktrees.

```sh
npm test
npm run build
```

O build copia somente HTML, CSS e JavaScript da interface para `public/`. A Vercel publica essa pasta e as funções de `api/`. A rota `/api/config` informa o modo, sem expor credenciais. Toda alteração de dados e toda consulta de conversas reais exige sessão autenticada e e-mail autorizado.

## Validação no navegador

Instale Playwright e seu navegador no ambiente de testes, fora das dependências de produção. Execute:

```sh
node tests/browser.mjs
```

É possível indicar `PLAYWRIGHT_MODULE` (localização do módulo instalado) e `CHROMIUM_PATH` (executável existente). O teste inicia provedores simulados locais; não usa credenciais ou números reais.

## Estado e limites

Banco e API oficial ainda precisam ser configurados e testados com as contas reais. Texto, pedidos e regras são implementados; anexos, modelos aprovados, recuperação do histórico e níveis de permissão por atendente não estão incluídos. O banco inicial usa um documento versionado: paginação e testes de carga são necessários antes de adoção em alto volume. Consulte o guia de ativação para as regras de automação, recuperação de falhas e limites da fila.
