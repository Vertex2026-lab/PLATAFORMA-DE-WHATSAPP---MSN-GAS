# Dia D — sessão de 90 minutos

Planejado para 24/10/2026, no fuso America/Fortaleza. Se a sessão ocorrer em outro dia, manter os mesmos blocos relativos ao início.

## Comando de início

Quando o usuário disser **“O DIA D CHEGOU”**, começar imediatamente com:

> Abra [DISK MSN GAS](https://disk-msn-gas.vercel.app/). Entre com seu usuário e me diga “entrei”.

Não apresentar novamente o plano inteiro, pedir novas decisões de tecnologia ou repetir configurações já concluídas. Instruções ao usuário: uma ação por mensagem, link direto quando houver navegação, linguagem simples. Usar confirmação da ação ou captura antes de depender do resultado. Não declarar que consegue ver/controlar o navegador apenas por receber a URL ambiente.

O cronômetro começa quando o usuário iniciar a sessão. Acompanhar o tempo e informar mudanças de bloco. Fazer correções de código, testes, commit e push autonomamente; solicitar somente os cliques que exigirem a sessão privada do usuário. Nunca solicitar senhas, tokens, códigos SMS ou chaves no chat. Não criar novas funcionalidades fora do escopo para preencher o tempo.

## Ponto de partida já confirmado

- Site: https://disk-msn-gas.vercel.app/
- GitHub: https://github.com/Vertex2026-lab/PLATAFORMA-DE-WHATSAPP---MSN-GAS
- Última versão funcional confirmada por captura da Vercel: `3530fee`, Ready, Production. O commit deste roteiro poderá ser posterior: comparar com a versão vigente do GitHub, sem usar `3530fee` como constante para sempre.
- Login da aplicação e persistência de um cliente foram confirmados pelo usuário.
- SQL inicial executado com sucesso e usuário Supabase criado.
- Variáveis SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e AUTHORIZED_EMAILS configuradas pelo usuário na Vercel.
- Não reutilizar links antigos de deployments: um deles era Ready/Stale. Abrir o domínio principal ou a lista atual.
- A chave legada service_role foi exposta no chat. Sua substituição/revogação não foi confirmada.
- Meta: portfólio M S N Distribuidora criado; cadastro WhatsApp parou na verificação obrigatória do telefone. Os números ainda não foram habilitados na API. Confirmar se serão chips novos ou números em uso; isso altera a habilitação e a possibilidade de coexistência com o aplicativo.

## Roteiro cronometrado

### 00–10 minutos — acesso e chave do banco

1. Abrir o site principal e confirmar entrada.
2. Verificar se a chave exposta já foi substituída. Se não, guiar sua revogação/rotação no Supabase conforme a interface/documentação oficial disponível; não presumir que gerar outra chave revoga a antiga.
3. Atualizar o valor exclusivamente no painel seguro da Vercel, publicar novamente se necessário e confirmar acesso e persistência.
4. Se aparecer aviso sobre rotação do JWT secret e impacto nas sessões, identificar o efeito antes de confirmar. Não desativar RLS nem expor credenciais como atalho.

Critério de conclusão: acesso funciona e a chave exposta foi revogada/substituída de forma efetiva. Se isso não for resolvido, não tratar o sistema como liberado para dados reais.

### 10–25 minutos — cliente e pedido completos

Usar um registro identificado como TESTE DIA D, com dados de teste, sem enviar mensagens involuntárias.

1. Abrir o cliente de teste ou cadastrar um se necessário.
2. Preencher endereço e anotação; adicionar e remover uma etiqueta.
3. Atualizar a página e conferir persistência.
4. Criar pedido com produto, quantidade, valor e pagamento.
5. Verificar o pedido em Novo pedido.
6. Mover para Preparando, Em entrega e Entregue; conferir status após atualizar.
7. Concluir e reabrir atendimento. Conferir busca, filtros e separação por conta.

Critério: dados e etapas persistem no ambiente publicado. Corrigir qualquer falha encontrada antes de contabilizar o fluxo como aprovado.

### 25–35 minutos — respostas e automações

1. Verificar os dias e horários reais de atendimento no fuso de Fortaleza.
2. Ajustar os três textos: boas-vindas, fora do horário e pedido confirmado.
3. Salvar e conferir após atualizar.
4. Testar preenchimento de respostas rápidas sem tentar enviar para contas não conectadas.
5. Executar os testes automatizados do backend em paralelo, com provedores simulados, distinguindo-os de testes reais.

Critério: configurações persistem. Disparos e entrega reais só são aprovados no bloco dos números.

### 35–65 minutos — integração dos dois números

1. Abrir o ponto da Meta onde o cadastro foi interrompido.
2. Confirmar disponibilidade dos dois números para receber SMS/ligação. Códigos são inseridos pelo usuário apenas na Meta.
3. Se forem números já usados no aplicativo, verificar a modalidade de coexistência. Não excluir conta, transferir número ou interromper atendimento existente sem decisão explícita do usuário sobre o impacto.
4. Concluir o cadastro oficial, configurar o aplicativo Meta/Cloud API, permissões, tokens de servidor e associação das contas. Não confundir simplesmente vincular um aplicativo WhatsApp Business ao portfólio com habilitar a API.
5. Inserir Phone Number IDs, tokens e segredo do aplicativo somente nas configurações seguras da Vercel; publicar para aplicar.
6. Configurar e verificar o webhook e a assinatura do campo messages.
7. Verificar cada conta na interface.

Critério: cada conta é reconhecida pela Meta e o webhook verifica com sucesso. Aprovação externa, elegibilidade, verificação empresarial e ativação de chip podem bloquear esta etapa; não podem ser garantidas dentro dos 90 minutos. Registrar o bloqueio exato e continuar testes independentes, sem fingir conexão nem reduzir verificações.

### 65–85 minutos — atendimento real de ponta a ponta

Se os números estiverem habilitados:

1. De um terceiro telefone, enviar uma mensagem ao número 1.
2. Confirmar chegada na central com a conta de origem correta.
3. Responder pela central e confirmar recebimento no telefone.
4. Repetir no número 2. Confirmar separação do mesmo cliente por conta.
5. Validar boas-vindas com novo contato e ausência conforme expediente.
6. Criar pedido e mover para Preparando para conferir uma única confirmação automática.
7. Conferir etiquetas, endereço, pedido e status de envio/entrega.
8. Conferir janela de 24 horas e mensagens de erro/fila sem duplicar envios incertos.

Se houver bloqueio externo na Meta, usar este bloco para validação publicada de CRM e correções. Entrega real fica explicitamente pendente, sem substituir o teste por simulação e chamá-lo de real.

### 85–90 minutos — fechamento

1. Executar verificações necessárias após correções.
2. Salvar e enviar os commits pendentes ao GitHub.
3. Conferir Vercel Ready/Production e commit correto. Não fazer redeploy sem alteração que o justifique.
4. Confirmar funcionamento no domínio principal.
5. Entregar lista curta: aprovado na prática; pendente; bloqueio externo; próximo passo exato.

## Links de trabalho

- Plataforma: https://disk-msn-gas.vercel.app/
- Deployments: https://vercel.com/comercial-3195s-projects/disk-msn-gas/deployments
- Variáveis Vercel: https://vercel.com/comercial-3195s-projects/disk-msn-gas/settings/environment-variables
- Usuários Supabase: https://supabase.com/dashboard/project/fndefqohxliapqxwuxwo/auth/users
- Chaves Supabase: https://supabase.com/dashboard/project/fndefqohxliapqxwuxwo/settings/api-keys
- Meta, ponto interrompido: https://business.facebook.com/latest/settings/whatsapp_business_presence?business_id=1098327666305485

## Limites que não devem ser ocultados no fechamento

A implementação atual envia texto. Não inclui anexos na central, envio de modelos aprovados, importação de histórico ou perfis de acesso por atendente. A persistência usa documento JSONB versionado e ainda não foi validada para alto volume. Não afirmar que os 90 minutos resolvem automaticamente essas limitações ou aprovações externas. Não ampliar o escopo durante a sessão sem registrar o impacto no prazo. A conclusão é comprovada pelos testes, não pelo tempo decorrido.
