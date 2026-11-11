# Sprint 07 — Banco de dados: relatórios, pesquisa, filtros e logs

Scripts: `database/08_sprint07_relatorios.sql` e `database/09_dados_demonstracao.sql`
(rodar depois do 05; não apagam dados e podem ser executados de novo).

## 1. Índices para os filtros

| Índice | Para quê |
|---|---|
| `solicitacao(criado_em)` | filtro por período |
| `historico_solicitacao(status, criado_em)` | data de conclusão da adoção |
| `animal(criado_em)`, `animal(nome)` | período de cadastro e pesquisa por nome |
| `usuario(perfil, criado_em)`, `usuario(nome)` | cadastros por mês e pesquisa |
| `ong(nome)` | pesquisa |

## 2. Views de relatório (uma linha por registro, prontas para `WHERE`)

| View | Conteúdo |
|---|---|
| `vw_rel_solicitacoes` | pedido + animal + ONG + adotante, data, mês, score, faixa, data de conclusão, dias até a adoção, dias em aberto |
| `vw_rel_adocoes` | adoções concluídas com acompanhamentos e último contato |
| `vw_rel_desempenho_ong` | animais, pedidos, aprovados, recusados, adoções, taxa de aprovação, tempo médio, score médio por ONG |
| `vw_rel_animais_espera` | animais sem lar, dias na plataforma, faixa de espera, pedidos e favoritos |
| `vw_rel_compatibilidade` | pedidos, score médio e taxa de aprovação por faixa de compatibilidade |
| `vw_rel_cadastros_mes` | novas contas por mês e perfil |
| `vw_log_resumo_diario` | operações por dia e tipo (atividade do sistema) |

## 3. Procedures

- `CALL sp_relatorio_periodo('2026-08-01', '2026-10-31', NULL);` → indicadores do período e detalhamento por ONG (`p_ong` filtra uma ONG). Valida o período.
- `CALL sp_pesquisar('thor');` → procura em animais, pessoas (sem senha), ONGs e solicitações; aceita o nº da solicitação; exige 2 caracteres.

## 4. Mais operações no log (`log_acao`)

Novos triggers: `formulario.preenchido`, `formulario.atualizado`, `acompanhamento.registrado` e `animal.editado`
(além de status e exclusão da Sprint 06). A geração de dados em lote (`@massa_dados = 1`) não polui o log.

## 5. Histórico de demonstração (`09`)

`CALL sp_gerar_historico_demo(6, 60, 40);` cria 6 meses de uso: 40 adotantes (`@demo.petconnect`, senha 123456),
60 animais nas ONGs aprovadas, pedidos com toda a linha do tempo (respeitando RN02, recusa com motivo, encerramento automático),
acompanhamentos e os logs **com a data em que cada operação aconteceu**. `CALL sp_limpar_historico_demo();` apaga tudo.

Resultado no teste: 104 pedidos (26 concluídos, 16 recusados, 20 encerrados…), ~500 logs; nenhuma data no futuro;
um único vencedor por animal; faixa alta com 100% de aprovação e faixa baixa com 0%.

## Dificuldades

- Subconsultas correlacionadas dentro de views agregadas falhavam em alguns motores → reescritas como `JOIN` em tabelas derivadas (também ficam mais rápidas).
- Sorteio com `RAND()` muda a cada execução → trocado por `CRC32` do id.
