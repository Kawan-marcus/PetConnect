# Relatório dos testes pela interface (navegação, validação e fluxo)

Gerado em 15/11/2026, 13:40:23 · 25 de 25 casos passaram.

Sistema real: front + back + banco. Cada caso tem um print com o mesmo nome do ID.

## Navegação

| ID | Caso de teste | Resultado esperado | Resultado obtido | Situação |
|---|---|---|---|---|
| NV-01 | Visitante percorre o menu público (Início, Animais, Como funciona, Entrar, Cadastrar) | Todas as páginas abrem com título, sem erro | Início: Encontre o companheiro que combina com a sua vida. · Animais: Animais para adoção · Como funciona: Como funciona · Entrar: Entrar · Cadastrar: Criar conta | ✅ PASSOU |
| NV-02 | Visitante abre uma área logada pelo endereço (/minhas-solicitacoes) | Vai para o login e, depois de entrar, volta para a página pedida | login: true, depois: /minhas-solicitacoes | ✅ PASSOU |
| NV-03 | Visitante clica em "Entrar para adotar" no detalhe de um animal | Login e volta para o mesmo animal | animal /animais/227 → depois do login /animais/227 | ✅ PASSOU |
| NV-04 | Adotante entra e percorre o próprio menu | Cai em /minha-area e todas as páginas do menu abrem | início /minha-area · Minha área: Olá, Ana! · Recomendados: Recomendados para você · Favoritos: Meus favoritos · Solicitações: Minhas solicitações · Formulário: Formulário de avaliação · Comparar: Comparar compatibilidade · Perfil: Meu perfil | ✅ PASSOU |
| NV-05 | Adotante tenta abrir a área do administrador (/admin) | Tela "Acesso restrito" com botão para a própria área | "Esta área é exclusiva para administradores", botão → #/minha-area | ✅ PASSOU |
| NV-06 | ONG entra e percorre o próprio menu | Cai em /ong e todas as páginas abrem | início /ong · Painel: Patinhas Felizes · Animais: Meus animais · Novo animal: Cadastrar animal · Solicitações: Solicitações de adoção · Pós-adoção: Acompanhamento pós-adoção · Relatórios: Relatórios da ONG · Perfil: Meu perfil | ✅ PASSOU |
| NV-07 | ONG tenta abrir área do adotante (/favoritos) | Tela "Acesso restrito" | Esta área é exclusiva para adotantes | ✅ PASSOU |
| NV-08 | Administrador entra e percorre o menu (dashboard, ONGs, usuários, animais, relatórios, adoções, operações, pesquisa, permissões) | Cai em /admin e todas as páginas abrem | início /admin · Dashboard: Dashboard · ONGs: ONGs · Usuários: Usuários · Animais: Animais · Relatórios: Relatórios · Adoções: Histórico de adoções · Operações: Histórico de operações · Pesquisar: Pesquisar · Permissões: Permissões por perfil | ✅ PASSOU |
| NV-09 | ONG pendente entra no painel | Painel abre com aviso de aprovação pendente, sem erro | aviso de aprovação exibido | ✅ PASSOU |
| NV-10 | Endereço que não existe (/pagina-que-nao-existe) | Página "não encontrada" com link para o início | Página não encontrada | ✅ PASSOU |
| NV-11 | Trilha de navegação no cadastro de animal da ONG | Mostra o caminho até a página e os links funcionam | trilha "Painel da ONG Meus animais Cadastrar animal", clique → /ong/animais | ✅ PASSOU |
| NV-12 | Sair da conta e tentar voltar para a área logada | Depois de sair, a área logada pede login de novo | depois de sair: /; ao abrir /minha-area: /login | ✅ PASSOU |
| NV-13 | Token vencido ou inválido guardado no navegador | O sistema não quebra e pede login | /login | ✅ PASSOU |

## Validação

| ID | Caso de teste | Resultado esperado | Resultado obtido | Situação |
|---|---|---|---|---|
| VL-01 | Login com campos vazios | Mensagens embaixo dos campos, sem chamar o servidor | Informe o e-mail. / Informe a senha. | ✅ PASSOU |
| VL-02 | Login com senha errada | Mensagem "E-mail ou senha inválidos." | E-mail ou senha inválidos. | ✅ PASSOU |
| VL-03 | Cadastro de adotante com e-mail inválido, senha curta e confirmação diferente | Uma mensagem para cada campo errado | E-mail inválido. / Informe um telefone. / Informe a cidade. / A senha precisa ter pelo menos 6 caracteres. / As senhas não conferem. / É preciso aceitar os termos. | ✅ PASSOU |
| VL-04 | Cadastro de ONG com CNPJ inválido (11.111.111/1111-11) | Mensagem "CNPJ inválido" | CNPJ inválido. Confira os 14 números (00.000.000/0000-00). | ✅ PASSOU |
| VL-05 | Cadastro de animal enviado vazio | Mensagens nos campos obrigatórios | 13 mensagens: Adicione pelo menos uma foto. / Informe o nome. / Informe a raça (ou SRD). / Selecione a espécie.… | ✅ PASSOU |
| VL-06 | Cadastro de animal com 30 anos de idade | Mensagem "no máximo 25 anos" | Idade inválida: no máximo 25 anos. | ✅ PASSOU |
| VL-07 | Formulário de avaliação enviado sem respostas | Mensagens pedindo as respostas | 10 mensagens: Selecione o tipo de moradia. / Responda esta pergunta. / Responda esta pergunta. | ✅ PASSOU |
| VL-08 | Pesquisa geral do admin com 1 letra | Pede pelo menos 2 letras | Digite pelo menos 2 letras (ou o número de uma solicitação). Não precisa de acento nem de maiúscula. | ✅ PASSOU |

## Fluxo

| ID | Caso de teste | Resultado esperado | Resultado obtido | Situação |
|---|---|---|---|---|
| FX-01 | ONG cadastra um animal pela tela | Animal salvo e listado em "Meus animais" | E2E665272 aparece em Meus animais | ✅ PASSOU |
| FX-02 | Adotante encontra o animal no catálogo e solicita a adoção | Pedido enviado e visível em "Minhas solicitações" como Pendente | pedido listado | ✅ PASSOU |
| FX-03 | ONG analisa, aprova e conclui a adoção pela tela | Pedido "Concluída" e animal "Adotado" | passos: analisar → aprovar → concluir; pedido concluído: true; animal adotado: true | ✅ PASSOU |
| FX-04 | Administrador acha a adoção na pesquisa e no histórico de operações | A adoção aparece na pesquisa e as etapas no histórico | na pesquisa: true; registros no histórico: 6 | ✅ PASSOU |
