# Sprint 08 — Banco de dados: permissões e revisão das regras de negócio

Scripts: `database/10_sprint08_permissoes_regras.sql` e `database/11_consultas_sprint07_08.sql`.

## 1. Permissões no banco (menor privilégio)

| Usuário do MySQL | Pode | Não pode |
|---|---|---|
| `root` | criar banco, tabelas, triggers (só para rodar os scripts) | — |
| `petconnect_app` (backend) | `SELECT, INSERT, UPDATE, DELETE` | criar/alterar tabelas, triggers e usuários |
| `petconnect_relatorio` (novo) | `SELECT` só nas views de relatório | ver tabelas brutas (senhas, tokens), alterar qualquer dado |

Teste: conectado como `petconnect_relatorio`, `SELECT * FROM vw_rel_adocoes` funciona; `SELECT * FROM usuario` → **erro 1142**.

A view `vw_matriz_permissoes` documenta no banco a mesma matriz de perfis do front e do backend.

## 2. Log imutável

Triggers `BEFORE UPDATE` e `BEFORE DELETE` em `log_acao`: o histórico de operações não pode ser alterado nem apagado
(auditoria). Só a limpeza dos dados de demonstração (`@massa_dados = 1`) é liberada.

## 3. Regras de negócio no banco (defesa em profundidade)

| Trigger | Regra |
|---|---|
| `trg_rn_solicitacao_nova` | RN01: animal adotado, excluído ou de ONG não aprovada não recebe pedido · RN03: só adotante ativo com formulário · RN07: pedido nasce pendente |
| `trg_rn_solicitacao_fluxo` | RN07: máquina de estados (pendente → em análise/aprovada/recusada/cancelada/encerrada; em análise → aprovada/recusada/cancelada/encerrada; aprovada → concluída; finais não mudam) |
| `trg_rn_animal_novo` | RN04: só ONG aprovada cadastra; animal nasce disponível |
| `trg_rn_animal_alteracao` | RN06: “adotado” só com adoção concluída; adotado não volta; não volta para disponível com adoção aprovada · RN08: não exclui com pedido em aberto |

Erro: `SQLSTATE 45000` com mensagem em português (o backend pode responder 409 com ela).

## 4. Evidência (`11`)

`sp_testar_regras()` tenta cada operação proibida dentro de uma transação, guarda a mensagem e desfaz tudo:

| Regra | Tentativa | Resultado |
|---|---|---|
| RN01 | pedir adoção de animal adotado | BARRADO: Este animal não está disponível para adoção (RN01). |
| RN03 | ONG pedindo adoção | BARRADO: Só adotantes com conta ativa podem pedir adoção (RN03). |
| RN04 | cadastrar animal em ONG pendente | BARRADO: Só ONGs aprovadas… (RN04). |
| RN06 | marcar “adotado” sem adoção concluída | BARRADO (RN06) |
| RN07 | reabrir solicitação recusada | BARRADO: Mudança de status não permitida: recusada → pendente (RN07). |
| RN08 | excluir animal com pedido em aberto | BARRADO (RN08) |
| LOG | apagar registro do histórico | BARRADO: O histórico de operações não pode ser apagado. |

O fluxo completo do backend (pedir → analisar → aprovar + encerrar os outros → concluir → adotado) foi executado com os triggers ativos e passou.

## Ajuste de escopo

Papéis (`CREATE ROLE`) foram trocados por `GRANT` direto ao usuário, porque o MariaDB do XAMPP usa outra sintaxe para papéis.
