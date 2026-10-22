# DISK MSN GAS

Interface web de uma central de atendimento para duas contas WhatsApp Business, com identidade em laranja e preto. Esta versão é uma demonstração interativa, sem integração com números reais.

## Executar

Na pasta do repositório:

```sh
python3 -m http.server 3000 --bind 0.0.0.0
```

Abra a interface na porta 3000. Não há dependências de instalação, serviços externos ou etapa de compilação. HTML, CSS, JavaScript e ícones SVG locais.

## Telas e recursos

- **Atendimento:** conversas unificadas, filtros por conta, status e não lidas, busca, respostas rápidas, composição de mensagens locais, conclusão e reabertura.
- **Detalhes do cliente:** etiquetas, endereço, anotações, criação de pedidos e simulação de mensagem recebida. No celular, use o botão de detalhes no cabeçalho da conversa.
- **Clientes:** busca, cadastro fictício e acesso às conversas.
- **Pedidos:** registro de produto, quantidade, valor, endereço e pagamento; acompanhamento em quatro etapas.
- **Etiquetas:** criação, exclusão e busca das conversas associadas.
- **Automações:** edição de textos e ativação demonstrativa. Boas-vindas é aplicada ao simular uma entrada; as demais regras apenas registram configuração.
- **Contas WhatsApp:** duas contas ilustrativas, renomeação e informações sobre conexão oficial.
- **Configurações:** registro de dados da operação e exportação JSON dos dados locais.

Os dados são salvos no localStorage do navegador. Não há login, sincronização entre dispositivos ou armazenamento de produção. Credenciais não são solicitadas nesta versão.

## Validação

- `node --check app.js` e resposta HTTP 200.
- Fluxo validado com Playwright e Chromium do sistema: navegação nas sete telas, filtros, busca, envio local, etiquetas, endereço, notas, criação e mudança de etapa do pedido, edição de automação, boas-vindas simulada, conclusão, persistência, cadastro, escape de HTML e ausência de rolagem horizontal no celular.
- Nenhum erro JavaScript detectado nesses fluxos.

## Próxima etapa: integração real

Exige servidor com autenticação de atendentes, banco de dados, gestão segura de credenciais, webhooks HTTPS verificados e processamento de eventos com controle de duplicidade. Como os dois números usam o aplicativo WhatsApp Business, verificar elegibilidade para coexistência com a API oficial da Meta ou com um provedor oficial. Não presumir importação do histórico ou continuidade do aplicativo antes dessa verificação. Envios e automações devem respeitar a janela de atendimento e os modelos aprovados quando exigidos.

Esta interface ainda não foi publicada em um serviço de hospedagem.

## Publicar na Vercel

O arquivo `vercel.json` configura a hospedagem estática, sem instalação nem compilação.

1. Envie o commit da interface para o GitHub.
2. No painel da Vercel, selecione **Add New → Project** e importe `Vertex2026-lab/PLATAFORMA-DE-WHATSAPP---MSN-GAS`.
3. Selecione a branch que contém os arquivos da interface. O commit inicial de desenvolvimento foi criado na branch `work`; não selecione `main` enquanto ela contiver apenas o README.
4. Mantenha a pasta raiz do repositório, framework **Other** e as configurações do `vercel.json`.
5. Clique em **Deploy** e abra o endereço HTTPS fornecido pela Vercel.

Depois da conexão com o GitHub, novos commits na branch configurada geram novas versões. Publicar esta interface não conecta as contas WhatsApp; os dados continuam locais ao navegador.
