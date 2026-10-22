# Ativar o MVP da DISK MSN GAS

A interface aprovada é mantida. O modo operacional usa a Vercel para o site e a API, Supabase para banco e login e a API oficial da Meta para WhatsApp.

**Não cole senhas, tokens ou chaves no chat, no GitHub ou em arquivos públicos.** Configure valores somente no painel seguro da Vercel. `.env.example` contém apenas nomes vazios para referência.

## 1. Banco e login

1. Abra https://supabase.com/dashboard e crie um projeto. Guarde a senha do banco com você.
2. No projeto, abra **SQL Editor → New query**. Copie o conteúdo de `db/001_initial.sql` deste repositório e execute com **Run**.
3. Em **Authentication → Users → Add user**, crie seu usuário com e-mail e senha. Marque a confirmação automática do e-mail, se oferecida. Não use uma senha já utilizada em outro serviço.
4. Em **Project Settings / API**, localize a URL do projeto e a chave legada `service_role` (JWT). Esta chave é exclusiva do servidor; nunca use a chave `anon` no lugar dela.
5. Na Vercel, abra o projeto **disk-msn-gas → Settings → Environment Variables** e adicione:

| Nome | Valor inserido por você no painel seguro |
| --- | --- |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave legada `service_role` do projeto |
| `AUTHORIZED_EMAILS` | E-mail do usuário criado; para uma equipe, separar os e-mails por vírgula |

6. Aplique à produção. Em **Deployments**, publique novamente o último código com **Redeploy**.
7. Abra o site e entre com o usuário criado. A base real começa **vazia**: os clientes fictícios do navegador não são importados.
8. Cadastre um cliente com número no formato `5585999999999`, crie um pedido e confirme em outra aba que os dados persistem. Cada atendente deve ter seu próprio usuário Supabase e constar em `AUTHORIZED_EMAILS`.

Se o login funcionar, mas aparecer erro de banco, confira se executou o SQL e usou a chave correta. Não considere o banco validado antes deste teste real.

## 2. Os dois WhatsApps

Hoje os números usam o aplicativo WhatsApp Business. Antes de migrar qualquer número, verifique a elegibilidade para **coexistência** pelo fluxo oficial da Meta ou de um provedor oficial. Não há promessa de importar o histórico ou de manter o aplicativo se a modalidade não for elegível. Esta implementação conecta diretamente à Cloud API depois dessa habilitação; não inclui o processo de aprovação/onboarding da Meta.

No painel seguro da Vercel, adicione os valores fornecidos pela conta empresarial:

| Nome | Para que serve |
| --- | --- |
| `WA_APP_SECRET` | Segredo do aplicativo Meta que assina os webhooks |
| `WA_VERIFY_TOKEN` | Token de verificação de webhook escolhido por você, forte e aleatório |
| `WA_PHONE_ID_1` | Phone Number ID do primeiro número (não é o telefone com DDD) |
| `WA_ACCESS_TOKEN_1` | Token de servidor autorizado ao primeiro número |
| `WA_PHONE_ID_2` | Phone Number ID do segundo número |
| `WA_ACCESS_TOKEN_2` | Token de servidor autorizado ao segundo número |
| `WA_API_VERSION` | Opcional. Versão Graph suportada; padrão `v23.0` |

1. Publique novamente na Vercel para aplicar as variáveis.
2. No aplicativo Meta, configure o webhook como `https://disk-msn-gas.vercel.app/api/webhook`, usando o mesmo `WA_VERIFY_TOKEN` no campo de verificação.
3. Assine o campo **messages** e vincule o aplicativo às contas WhatsApp Business necessárias. Use tokens de servidor com as permissões oficiais exigidas para os dois números. Guarde e renove os tokens conforme a política da Meta.
4. Na plataforma, abra **Contas WhatsApp → Verificar conexão** em cada número. Essa verificação consulta o número na Meta; **não comprova recebimento do webhook**.
5. De um terceiro telefone, envie uma mensagem ao primeiro número. Confira a chegada na plataforma, responda e confirme o recebimento no telefone. Repita para o segundo número.
6. Confirme que respostas saem pelo número correto e que o mesmo cliente é separado por conta.

O último passo é obrigatório para considerar a integração pronta.

## 3. Regras disponíveis

- **Boas-vindas:** primeiro contato recebido, dentro do expediente. Não responde novamente a cada mensagem.
- **Fora do horário:** tem prioridade sobre boas-vindas e responde uma vez por cliente/conta por dia, fora dos dias e horários configurados.
- **Pedido confirmado:** dispara uma vez quando o pedido muda para **Preparando**, se a regra estiver habilitada. Voltar e avançar de etapa não dispara novamente.
- **Janela de atendimento:** envios de texto e automações exigem uma mensagem do cliente nas últimas 24 horas. O sistema bloqueia envios fora da janela. Envio de modelos aprovados não está implementado nesta versão.
- **Status:** na fila, enviando, enviada, entregue, lida, falha ou incerta. “Enviada” significa aceite da API; entrega e leitura dependem dos webhooks da Meta.
- **Falhas:** o sino mostra pendências. É possível repetir um envio recusado. Um envio incerto não é repetido automaticamente; confirme no WhatsApp antes de realizar outro envio.
- **Fila:** processada após cada webhook, envio e alteração de CRM; atendentes conectados também fazem uma verificação a cada 8 segundos. Não há serviço independente de fila nem agendador contratado. Uma interrupção da Vercel pode exigir novo evento ou abertura da plataforma para retomar pendências.
- **Arquivos:** nesta versão, a central envia texto. Áudios, imagens e documentos recebidos aparecem identificados para consulta no aplicativo; reprodução/download e envio de anexos não estão implementados.

## 4. Limites desta primeira implementação

- Uma empresa, dois números e uma base compartilhada. Todos os usuários autorizados têm acesso administrativo; não há níveis de permissão por atendente.
- CRM persistido em um documento JSONB versionado no Postgres, com gravação condicional para evitar sobrescrever atualizações simultâneas. Campos diferentes podem ser reaplicados; conflito no mesmo campo exige revisão do atendente.
- Requisições limitadas a 3 MB. O histórico completo é carregado pela central. **Antes de adotar para um fluxo grande e prolongado**, separar mensagens e entidades em tabelas paginadas e fazer testes de carga. Esta versão não foi validada para alto volume.
- Configure retenção e backups no serviço de banco antes de usar dados de clientes. Não há backup automático independente implementado pelo aplicativo.
- Apenas o conteúdo da pasta `public/` é publicado como arquivos estáticos. Chaves, código do servidor e SQL não são entregues ao navegador. O banco usa RLS e não permite acesso direto de usuários públicos.
- A publicação do código não cria o banco, os usuários ou a conta empresarial da Meta. Esses acessos são pré-requisitos externos.

## 5. Validação realizada

- `npm test`: regras de negócio e API, com serviços Supabase/Meta simulados, incluindo autenticação, CSRF, concorrência, assinatura de webhook, duplicidades, janela de 24h, automações e resultado de envio incerto.
- Navegador Chromium: login, persistência via API, edição contínua, pedidos, automações, horários, contas, concorrência e sete telas em celular, também com provedores simulados.
- Fluxos anteriores de demonstração preservados e testados.
- A migração no Supabase, a entrega real de mensagens e a operação em novo deployment precisam ser verificadas após configurar as contas reais.
