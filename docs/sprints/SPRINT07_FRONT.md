# Sprint 07 — Front-end: dashboard, relatórios, pesquisas, filtros, exportação e logs

Tudo funciona com o backend atual (usa as rotas que já existem) e no modo demonstração.
Prints em [`sprint07/`](sprint07/).

## 1. Dashboard (`/admin`)

Calculado com os dados reais de `/admin/solicitacoes`, `/admin/animais`, `/admin/ongs`, `/admin/usuarios` e `/admin/estatisticas`.

- **Filtros:** período (30 dias, 90 dias, 6 meses, 12 meses, tudo ou datas personalizadas), ONG e categoria (cão/gato). Os filtros ficam guardados ao voltar para a tela.
- **Situação agora:** animais disponíveis, solicitações abertas, adotantes e ONGs, adotados.
- **No período:** solicitações recebidas, adoções concluídas e tempo médio até a adoção, taxa de aprovação, compatibilidade média.
- **Gráficos:** solicitações × adoções por mês; funil de adoção (recebidas → analisadas → aprovadas → concluídas); situação das solicitações; taxa de aprovação por faixa de compatibilidade (mostra se a IA ajuda).
- **Tabelas:** desempenho por ONG e pedidos esperando há mais tempo.
- Todo gráfico tem tooltip e **“Ver como tabela”** (acessibilidade).
- O painel da ONG (`/ong`) ganhou a seção **Desempenho da ONG** com filtro de período e categoria.

## 2. Relatórios (`/admin/relatorios` e `/ong/relatorios`)

| Relatório | Conteúdo | Filtros |
|---|---|---|
| Solicitações de adoção | nº, data, animal, categoria, adotante, ONG, score, situação, dias em aberto | período, ONG, categoria, situação, adotante |
| Adoções concluídas | data, animal, adotante, ONG, score, dias até a adoção | período, ONG, categoria |
| Desempenho por ONG | animais, pedidos, aprovados, recusados, adoções, taxa de aprovação, tempo médio | período, categoria |
| Animais à espera | dias na plataforma, faixa de espera, pedidos recebidos | ONG, categoria, situação |
| Compatibilidade × resultado | pedidos, score médio, aprovados, recusados e taxa por faixa | período, ONG, categoria |
| Cadastros na plataforma | novas contas de adotantes e ONGs por mês | período |

A ONG vê apenas os próprios dados (solicitações recebidas, adoções e pós-adoção, animais à espera).
Cada relatório tem um resumo no topo, colunas ordenáveis (clique no título) e paginação.

## 3. Pesquisas

- **Pesquisa geral** (`/admin/pesquisa`): um termo procurado em animais, pessoas, ONGs e solicitações (aceita o número da solicitação).
- **Pesquisa em cada lista:** relatórios, histórico de adoções, histórico de operações, animais (admin e ONG), solicitações da ONG e usuários.
- Não diferencia maiúsculas nem acentos (“pacoca” encontra “Paçoca”); várias palavras são combinadas.
- Atalho **`/`** leva direto ao campo de pesquisa.

## 4. Filtros

Componente único (`components/Filtros.jsx`) com **período**, **categoria** (espécie), **situação**, **ONG** e **usuário**,
usado no dashboard, relatórios, histórico de adoções, histórico de operações e lista de animais. “Limpar filtros” aparece quando há filtro ativo.

## 5. Exportação

- **CSV** (abre no Excel, LibreOffice e Google Planilhas): `;` como separador, acentos corretos (UTF-8 com BOM), datas no formato brasileiro, cabeçalho com o relatório, os filtros e a data de geração. Exporta **todas** as linhas filtradas, não só a página.
- **PDF:** botão “PDF” abre a impressão com uma folha de estilo própria (sem menu, sem botões, tabela completa) → “Salvar como PDF”.
- **Por que não XLSX:** o CSV já abre no Excel e evita colocar uma biblioteca pesada no front.

## 6. Logs / histórico de operações (`/admin/operacoes`)

Quem fez, o quê e quando: etapas das solicitações (com a observação), cadastros de contas, ONGs e animais e,
no modo demonstração, logins, edições, mudanças de situação, exclusões, aprovação de ONGs e ativação de contas.
Filtros por período, tipo e pessoa; pesquisa; CSV/PDF; gráfico de operações por tipo.
O banco já grava tudo na tabela `log_acao` (triggers). Se o backend publicar `GET /admin/logs`, a tela usa essa rota automaticamente.

## 7. Integração com os módulos anteriores

| Módulo | Como aparece na Sprint 07 |
|---|---|
| Cadastro de animais (Sprint 03/04) | relatório de animais à espera, pesquisa, lista do admin com paginação |
| Solicitações e máquina de estados (Sprint 04/05) | dashboard, funil, relatórios e histórico usam o `historico` de cada solicitação |
| Compatibilidade / IA (Sprint 06) | score médio e relatório “Compatibilidade × resultado” |
| Pós-adoção | relatório de adoções da ONG mostra acompanhamentos e alerta adoções sem acompanhamento |
| Administração | pesquisa geral leva para usuários, ONGs e histórico |

## Arquivos

Novos: `api/relatorios.js`, `utils/relatorios.js`, `utils/exportar.js`, `hooks/useTabela.js`, `components/Filtros.jsx`,
`components/Graficos.jsx`, `components/TabelaRelatorio.jsx`, `pages/admin/AdminRelatorios.jsx`, `AdminOperacoes.jsx`,
`AdminPesquisa.jsx`, `pages/ong/OngRelatorios.jsx`.
Alterados: `AdminDashboard`, `AdminHistorico`, `AdminAnimais`, `OngPainel`, `OngSolicitacoes`, `OngAnimais`, `App.jsx`, `Layout.jsx`, `mapaRotas.js`, `global.css`, mock.

O modo demonstração passou a ter seis meses de histórico (chave `adotapet.mockdb.v2`), igual ao script `database/09`.

## Dificuldades e próximos passos

- O backend não tem rota para ler a tabela de logs → a tela monta o histórico com as rotas existentes e já está pronta para `/admin/logs`.
- `/admin/solicitacoes` não traz a espécie do animal → o front cruza com `/admin/animais`.
- A base de teste tem 10 mil animais → a lista do admin ganhou paginação.
- Próximos passos: rota `/admin/logs` no back, testes de usabilidade com usuários e ajustes finais para a apresentação.
