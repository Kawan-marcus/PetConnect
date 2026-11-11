# Sprint 08 — Front-end: permissões, usabilidade e revisão das regras de negócio

Prints em [`sprint08/`](sprint08/).

## 1. Funcionalidades concluídas

Fluxos completos funcionando no front (backend real ou modo demonstração):

| Perfil | Fluxo |
|---|---|
| Visitante | navegar e filtrar animais → ver detalhes → criar conta |
| Adotante | formulário de avaliação → recomendações e comparação → pedir adoção → acompanhar a linha do tempo → cancelar |
| ONG | cadastrar animal (com sugestão da IA pela foto) → analisar pedido com compatibilidade → aprovar/recusar → concluir → registrar pós-adoção → relatórios |
| Administrador | aprovar ONGs → gerenciar contas e animais → dashboard → relatórios e exportação → pesquisa geral → histórico de operações → permissões |

**Alterações de escopo (justificadas):**
- Exportação em **CSV + PDF** em vez de XLSX: o CSV abre no Excel sem biblioteca extra.
- Histórico de operações montado no front enquanto o back não publica `GET /admin/logs` (os logs já são gravados no banco).
- Status “adotado” deixou de ser escolhido à mão (ver revisão das regras).

## 2. Controle de permissões

- **Mapa único** em `src/utils/permissoes.js`: cada ação tem os perfis permitidos e as condições (ex.: ONG aprovada, não desativar a si mesmo). As telas usam `pode(usuario, acao)` para mostrar, esconder ou desabilitar e **explicar o motivo**.
- **Rotas protegidas** por perfil (`RotaProtegida`): sem login → vai para o login e volta para a mesma página; perfil errado → tela “Acesso restrito”.
- **Tela de permissões** (`/admin/permissoes`): matriz função × perfil e página × perfil, gerada do mesmo mapa (nunca fica desatualizada), com exemplos de acesso restrito. Exporta em PDF.
- **Perfil** (`/perfil`): seção “O que você pode fazer” mostra as funções liberadas e as bloqueadas, com o motivo.
- **Sessão expirada (401):** aviso na tela e o login explica que a sessão expirou, devolvendo o usuário à mesma página.

Exemplos (prints):

| Situação | Resultado |
|---|---|
| ONG abre `/admin` | “Acesso restrito” |
| Visitante abre `/admin` | login, depois volta |
| ONG pendente abre `/ong/animais/novo` | “Cadastro de animais bloqueado” (RN04) |
| Admin na própria linha em Usuários | botão “Desativar” desabilitado, com o motivo |
| ONG tenta marcar “Adotado” | opção bloqueada: “pela conclusão” |

## 3. Melhorias de usabilidade

1. **Confirmação no padrão do sistema** (substitui o `window.confirm`), explicando a consequência e a regra: remover animal, desativar conta, cancelar pedido, voltar animal para disponível.
2. **Aviso de alterações não salvas** nos formulários de animal e de avaliação (ao cancelar e ao fechar a aba).
3. **Pesquisa em todas as listas**, sem diferenciar acento e maiúscula, com atalho `/`.
4. **Filtros lembrados** ao voltar para a tela e botão “Limpar filtros”.
5. **Tabelas ordenáveis** por coluna e **paginação** em listas grandes.
6. **Mensagens de lista vazia** dizem o que foi pesquisado e o que fazer.
7. **Menu** com Relatórios (admin e ONG), Adoções, Operações, Pesquisar e Permissões; trilha de navegação para as novas telas.
8. Linha do tempo de cada solicitação no histórico do admin (clique no nº).

## 4. Revisão das regras de negócio

| Regra | Problema encontrado | Ajuste |
|---|---|---|
| RN06 — situação do animal | A ONG podia marcar “Adotado” à mão sem adoção concluída, ou voltar um adotado para “Disponível” | “Adotado” só pela conclusão da adoção; adotado não muda mais; voltar de “em processo” pede confirmação e é barrado se há adoção aprovada (front, mock e trigger no banco) |
| RN04 — ONG aprovada | O formulário de cadastro abria pelo endereço direto para ONG pendente | Tela de bloqueio explicando o motivo |
| Admin desativar a si mesmo | O botão aparecia (o back recusava depois) | Botão desabilitado com o motivo |
| RN08 — exclusão | Confirmação genérica do navegador | Confirmação explica a regra; o banco também barra |
| Sessão (401) | Usuário era deslogado sem aviso | Aviso e retorno à página |
| Pedidos antigos | O dashboard não mostrava pedidos esquecidos | Tabela “Pedidos esperando há mais tempo” |

## Dificuldades e próximos passos

- Garantir a mesma regra em três camadas (front, back, banco) exigiu revisar as rotas do back; a rota `PATCH /animais/:id/status` do back ainda aceita qualquer status — o front e o banco já barram, o back pode responder 409.
- Próximos passos: testes finais dos fluxos com o backend, documentação e preparação da apresentação.
