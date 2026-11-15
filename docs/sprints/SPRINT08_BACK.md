# Sprint 08 — Back-end: permissões, regras de negócio e integração

Branch base: `feature/backend-sprints-07-08` (Ecliton), com ajustes de integração com o front e o banco.
Detalhes técnicos em [`backend/ALTERACOES_BACKEND.md`](../../backend/ALTERACOES_BACKEND.md).

## Controle de permissões

| Camada | O que o back confere |
|---|---|
| Sessão | token assinado, `sub` válido e **conta ativa no banco a cada requisição** (conta desativada perde o acesso na hora) |
| Perfil | rotas de administrador só para admin; rotas de ONG só para ONG; pedido de adoção só para adotante |
| ONG | pendente/suspensa **consulta** as próprias listas, mas não cadastra, edita, remove, decide pedidos nem registra pós-adoção |
| Dono | ONG só mexe nos próprios animais e pedidos; adotante só vê e cancela os próprios pedidos |
| Admin | não desativa a si mesmo nem o último administrador ativo |

Respostas: **401** (sessão inválida/conta desativada), **403** (perfil sem acesso), **404** (registro de outro dono), **409** (regra de negócio).

## Regras de negócio revisadas

| Regra | Ajuste |
|---|---|
| RN01 | pedido só para animal **disponível**, não excluído, de ONG aprovada |
| RN02 | aprovação trava o animal e o pedido (`FOR UPDATE`): duas aprovações ao mesmo tempo não geram dois vencedores |
| RN06 | "em processo" e "adotado" só pelo fluxo (aprovar/concluir); não volta para disponível com pedido em andamento |
| Banco | erro de regra dos triggers (SQLSTATE 45000) → **409** com a mensagem |

## Consultas e logs (complemento da Sprint 07)

- `GET /api/admin/logs`: histórico de operações da tabela `log_acao`, com filtros.
- Paginação opcional (`limit`/`offset`) em todas as listas; sem `limit`, lista inteira.

## Testes

35 verificações automáticas contra o banco (scripts 01–10), todas aprovadas:
listas completas e paginadas, logs, ONG pendente (consulta sim, cadastro não),
fluxo completo pedir → analisar → aprovar → concluir → animal adotado, pedidos proibidos (409),
regra do banco virando 409, admin não se desativa, conta desativada não entra, token inválido (401).
