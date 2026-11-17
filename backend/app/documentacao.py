"""
Textos da documentação da API (Sprints 10 a 12).

O Swagger (http://localhost:8000/docs) e o docs/API.md usam estes resumos em português.
Chave: (MÉTODO, rota).
"""

DESCRICAO_API = """
API REST do **PetConnect**, plataforma de adoção responsável de cães e gatos.

**Autenticação:** faça `POST /api/auth/login` e envie o token no cabeçalho
`Authorization: Bearer <token>`. Clique em *Authorize* para testar as rotas protegidas.

**Erros:** sempre `{"detail": "mensagem"}` — 400 dado inválido, 401 sem login,
403 sem permissão, 404 não encontrado, 409 regra de negócio, 422 formato inválido.
"""

RESUMOS = {
    ("POST", "/api/auth/login"): "Entrar (devolve o token JWT)",
    ("GET", "/api/auth/me"): "Dados do usuário logado",
    ("PUT", "/api/auth/me"): "Atualizar nome, telefone, cidade ou senha",
    ("POST", "/api/auth/cadastro/adotante"): "Criar conta de adotante",
    ("POST", "/api/auth/cadastro/ong"): "Criar conta de ONG (fica pendente de aprovação)",
    ("POST", "/api/auth/recuperar-senha"): "Pedir código para redefinir a senha",
    ("POST", "/api/auth/redefinir-senha"): "Redefinir a senha com o código",
    ("GET", "/api/animais"): "Catálogo de animais disponíveis, com filtros e busca",
    ("GET", "/api/animais/{animal_id}"): "Detalhe de um animal",
    ("PUT", "/api/animais/{animal_id}"): "Editar animal (ONG dona)",
    ("DELETE", "/api/animais/{animal_id}"): "Remover anúncio (sem pedidos em aberto)",
    ("PATCH", "/api/animais/{animal_id}/status"): "Voltar o animal para disponível",
    ("GET", "/api/formulario"): "Ler o formulário de avaliação do adotante",
    ("PUT", "/api/formulario"): "Salvar o formulário de avaliação",
    ("GET", "/api/favoritos"): "Animais favoritos",
    ("GET", "/api/favoritos/ids"): "Só os ids dos favoritos (para os corações)",
    ("POST", "/api/favoritos/{animal_id}"): "Favoritar ou desfavoritar",
    ("GET", "/api/ong/animais"): "Animais da ONG logada",
    ("POST", "/api/ong/animais"): "Cadastrar animal (ONG aprovada)",
    ("GET", "/api/ong/solicitacoes"): "Pedidos recebidos pela ONG",
    ("GET", "/api/ong/adocoes"): "Adoções concluídas e acompanhamentos",
    ("POST", "/api/uploads/fotos"): "Enviar foto de animal",
    ("GET", "/api/ia/compatibilidade/{animal_id}"): "Compatibilidade adotante × animal",
    ("GET", "/api/ia/recomendacoes"): "Animais recomendados para o adotante",
    ("GET", "/api/ia/modelo"): "Informações do modelo de IA em uso",
    ("POST", "/api/ia/classificar-imagem"): "Sugerir espécie, raça e porte pela foto (ONG)",
    ("PATCH", "/api/ia/classificacoes/{classificacao_id}"): "Registrar se a ONG aplicou a sugestão da foto",
    ("POST", "/api/solicitacoes"): "Pedir adoção",
    ("GET", "/api/solicitacoes/minhas"): "Pedidos do adotante logado",
    ("GET", "/api/solicitacoes/{solicitacao_id}"): "Detalhe e linha do tempo de um pedido",
    ("POST", "/api/solicitacoes/{solicitacao_id}/cancelar"): "Cancelar pedido (adotante)",
    ("POST", "/api/solicitacoes/{solicitacao_id}/analisar"): "Colocar pedido em análise (ONG)",
    ("POST", "/api/solicitacoes/{solicitacao_id}/aprovar"): "Aprovar pedido; encerra os outros do mesmo animal",
    ("POST", "/api/solicitacoes/{solicitacao_id}/recusar"): "Recusar pedido com motivo",
    ("POST", "/api/solicitacoes/{solicitacao_id}/concluir"): "Concluir adoção; animal fica adotado",
    ("POST", "/api/solicitacoes/{solicitacao_id}/acompanhamentos"): "Registrar acompanhamento pós-adoção",
    ("GET", "/api/notificacoes"): "Notificações do usuário",
    ("POST", "/api/notificacoes/marcar-lidas"): "Marcar todas as notificações como lidas",
    ("GET", "/api/admin/usuarios"): "Listar usuários (filtro por perfil e busca)",
    ("PATCH", "/api/admin/usuarios/{alvo_id}"): "Ativar ou desativar conta",
    ("GET", "/api/admin/ongs"): "Listar ONGs",
    ("PATCH", "/api/admin/ongs/{ong_id}/status"): "Aprovar, suspender ou voltar ONG para análise",
    ("GET", "/api/admin/animais"): "Todos os animais da plataforma",
    ("DELETE", "/api/admin/animais/{animal_id}"): "Remover anúncio de qualquer ONG",
    ("GET", "/api/admin/solicitacoes"): "Todos os pedidos, com histórico",
    ("GET", "/api/admin/estatisticas"): "Números do dashboard",
    ("GET", "/api/admin/desempenho"): "Medições sequencial × OpenCL",
    ("GET", "/api/admin/logs"): "Histórico de operações (logs)",
    ("GET", "/api"): "Informações da API",
    ("GET", "/api/health/db"): "Teste de conexão com o banco",
}


def aplicar(app):
    """Troca os resumos automáticos pelos textos acima e adiciona o botão Authorize (Bearer)."""
    from fastapi.openapi.utils import get_openapi

    def gerar():
        if app.openapi_schema:
            return app.openapi_schema
        esquema = get_openapi(title=app.title, version=app.version, description=DESCRICAO_API, routes=app.routes)
        for rota, metodos in esquema["paths"].items():
            for metodo, op in metodos.items():
                resumo = RESUMOS.get((metodo.upper(), rota))
                if resumo:
                    op["summary"] = resumo
        esquema.setdefault("components", {}).setdefault("securitySchemes", {})["Bearer"] = {
            "type": "http", "scheme": "bearer", "bearerFormat": "JWT"}
        esquema["security"] = [{"Bearer": []}]
        app.openapi_schema = esquema
        return esquema

    app.openapi = gerar
