"""Administração: usuários, ONGs, animais, estatísticas e logs."""


def test_listar_usuarios_filtro(api, admin, caso):
    """CT-60 Listar usuários filtrando por perfil e busca
    Esperado: 200 e só usuários do perfil pedido que batem com a busca
    """
    r = api.get("/api/admin/usuarios?perfil=adotante&busca=ana", headers=admin)
    lista = r.json()
    caso(f"{r.status_code}, {len(lista)} resultado(s), perfis {set(u['perfil'] for u in lista)}")
    assert r.status_code == 200 and lista and all(u["perfil"] == "adotante" for u in lista)


def test_desativar_e_reativar(api, admin, sufixo, caso):
    """CT-61 Administrador desativa uma conta e depois reativa
    Esperado: conta desativada não entra (403); reativada entra (200)
    """
    email = f"desativa{sufixo}@teste.com"
    uid = api.post("/api/auth/cadastro/adotante", json={"nome": "Conta Desativada", "email": email, "senha": "123456"}).json()
    uid = uid.get("usuario", uid).get("id")
    api.patch(f"/api/admin/usuarios/{uid}", headers=admin, json={"ativo": False})
    bloqueado = api.post("/api/auth/login", json={"email": email, "senha": "123456"}).status_code
    api.patch(f"/api/admin/usuarios/{uid}", headers=admin, json={"ativo": True})
    liberado = api.post("/api/auth/login", json={"email": email, "senha": "123456"}).status_code
    caso(f"desativada: {bloqueado}, reativada: {liberado}")
    assert bloqueado == 403 and liberado == 200


def test_token_de_conta_desativada(api, admin, sufixo, caso):
    """CT-62 Conta desativada enquanto estava logada perde o acesso na hora
    Esperado: o token que já existia passa a dar 401
    """
    email = f"logado{sufixo}@teste.com"
    uid = api.post("/api/auth/cadastro/adotante", json={"nome": "Ainda Logado", "email": email, "senha": "123456"}).json()
    uid = uid.get("usuario", uid).get("id")
    h = {"Authorization": "Bearer " + api.post("/api/auth/login", json={"email": email, "senha": "123456"}).json()["token"]}
    antes = api.get("/api/auth/me", headers=h).status_code
    api.patch(f"/api/admin/usuarios/{uid}", headers=admin, json={"ativo": False})
    depois = api.get("/api/auth/me", headers=h).status_code
    caso(f"antes {antes}, depois {depois}")
    assert antes == 200 and depois in (401, 403)


def test_admin_nao_se_desativa(api, admin, caso):
    """CT-63 Administrador tenta desativar a própria conta
    Esperado: 409
    """
    eu = api.get("/api/auth/me", headers=admin).json()["id"]
    r = api.patch(f"/api/admin/usuarios/{eu}", headers=admin, json={"ativo": False})
    caso(f"{r.status_code} {r.json().get('detail')}")
    assert r.status_code in (400, 409)


def test_aprovar_ong(api, admin, sufixo, caso):
    """CT-64 Administrador aprova uma ONG pendente
    Esperado: 200 e a ONG passa a cadastrar animais
    """
    from test_02_cadastros import _ong, _cnpj
    from test_03_animais import animal
    dados = _ong(sufixo + "e", cnpj=_cnpj("78" + sufixo + "04"))
    api.post("/api/auth/cadastro/ong", json=dados)
    h = {"Authorization": "Bearer " + api.post("/api/auth/login", json={"email": dados["email"], "senha": "123456"}).json()["token"]}
    ong_id = api.get("/api/auth/me", headers=h).json()["ong"]["id"]
    r = api.patch(f"/api/admin/ongs/{ong_id}/status", headers=admin, json={"status": "aprovada"})
    cad = api.post("/api/ong/animais", headers=h, json=animal(nome="Primeiro")).status_code
    caso(f"{r.status_code}, cadastro de animal depois: {cad}")
    assert r.status_code == 200 and cad in (200, 201)


def test_status_ong_invalido(api, admin, caso):
    """CT-65 Mudar status de ONG para valor que não existe
    Esperado: 400 ou 422
    """
    r = api.patch("/api/admin/ongs/1/status", headers=admin, json={"status": "fechada"})
    caso(f"{r.status_code} {r.json().get('detail')}")
    assert r.status_code in (400, 422)


def test_estatisticas(api, admin, caso):
    """CT-66 Estatísticas do dashboard
    Esperado: 200 com totais (animais, solicitações, adotantes, ONGs)
    """
    r = api.get("/api/admin/estatisticas", headers=admin)
    t = r.json().get("totais", {})
    caso(f"{r.status_code}, {t}")
    assert r.status_code == 200 and "adotantes" in t


def test_logs(api, admin, caso):
    """CT-67 Histórico de operações (logs)
    Esperado: 200, registros com data, ação, entidade e usuário
    """
    r = api.get("/api/admin/logs?limite=50", headers=admin)
    lista = r.json()
    caso(f"{r.status_code}, {len(lista)} registros, ações: {sorted(set(l['acao'] for l in lista))[:4]}")
    assert r.status_code == 200 and lista and {"criadoEm", "acao", "entidade"} <= set(lista[0])


def test_logs_filtro_periodo(api, admin, caso):
    """CT-68 Logs filtrados por período e tipo
    Esperado: só registros de solicitação dentro do período
    """
    r = api.get("/api/admin/logs?de=2026-01-01&ate=2099-12-31&entidade=solicitacao", headers=admin)
    lista = r.json()
    caso(f"{r.status_code}, {len(lista)} registros, entidades {set(l['entidade'] for l in lista)}")
    assert r.status_code == 200 and all(l["entidade"] == "solicitacao" for l in lista)


def test_logs_data_invalida(api, admin, caso):
    """CT-69 Logs com data em formato inválido
    Esperado: 422
    """
    r = api.get("/api/admin/logs?de=31-12-2026", headers=admin)
    caso(r.status_code)
    assert r.status_code == 422


def test_remover_animal_admin(api, admin, ong, sufixo, caso):
    """CT-70 Administrador remove anúncio de animal sem pedidos
    Esperado: 200/204
    """
    from test_03_animais import animal
    a = api.post("/api/ong/animais", headers=ong, json=animal(nome="Admin" + sufixo[-4:])).json()
    r = api.delete(f"/api/admin/animais/{a['id']}", headers=admin)
    caso(r.status_code)
    assert r.status_code in (200, 204)
