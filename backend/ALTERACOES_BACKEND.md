# Ajustes aplicados ao backend — PetConnect

## Segurança e autenticação
- A dependência JWT agora consulta o usuário no MySQL em toda requisição autenticada.
- Tokens de contas inexistentes ou desativadas são recusados imediatamente.
- O `sub` do JWT é validado como inteiro; tokens malformados retornam 401.
- Em `APP_ENV=production`, a aplicação exige `JWT_SECRET` configurado. A chave fallback existe somente no ambiente local de desenvolvimento.
- Os auxiliares de acesso de ONG verificam conta ativa, vínculo e aprovação da ONG.

## Regras de negócio
- A criação de solicitação exige animal não excluído, disponível e vinculado a ONG aprovada.
- A criação bloqueia animal com solicitações concorrentes ao adquirir lock (`FOR UPDATE`) na linha do animal.
- A aprovação bloqueia a leitura/alteração concorrente do animal e da solicitação.
- A edição, remoção e gerenciamento de status de animais também exigem ONG aprovada.
- A rota de alteração manual de status não permite marcar animal como `em_processo` ou `adotado`; esses estados são controlados pelo fluxo de solicitação/aprovação/conclusão.
- Não é permitido disponibilizar animal enquanto houver solicitação ativa.
- O administrador não pode desativar o último administrador ativo.

## Paginação
Foi adicionada paginação por `limit` e `offset`, com padrão 20 e máximo 100, mantendo o formato de resposta em lista para reduzir impacto no frontend:
- `GET /api/animais`
- `GET /api/ong/animais`
- `GET /api/ong/solicitacoes`
- `GET /api/admin/usuarios`
- `GET /api/admin/ongs`
- `GET /api/admin/animais`
- `GET /api/admin/solicitacoes`
- `GET /api/solicitacoes/minhas`
- `GET /api/ong/adocoes`
- `GET /api/notificacoes`
- `GET /api/favoritos`

Exemplo: `GET /api/animais?limit=20&offset=0`.

## Validação realizada
- Compilação sintática de todos os módulos Python (`compileall`) executada sem erros.
- Não foi possível executar testes de integração nem validar consultas no MySQL neste ambiente: as dependências do backend não estão instaladas e não há conexão com o banco de dados do usuário.
- Recomenda-se testar os fluxos de login, desativação de usuário, aprovação simultânea de duas solicitações do mesmo animal e paginação no ambiente local.
