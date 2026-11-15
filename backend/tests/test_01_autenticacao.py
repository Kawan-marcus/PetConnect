"""Autenticação: login, sessão, perfil e recuperação de senha."""


def test_login_admin(api, caso):
    """CT-01 Login com e-mail e senha corretos (administrador)
    Esperado: 200, token e perfil "admin"
    """
    r = api.post("/api/auth/login", json={"email": "admin@adotapet.com", "senha": "123456"})
    corpo = r.json()
    caso(f"{r.status_code}, perfil {corpo.get('usuario', {}).get('perfil')}, token {'sim' if corpo.get('token') else 'não'}")
    assert r.status_code == 200 and corpo["token"] and corpo["usuario"]["perfil"] == "admin"


def test_login_email_maiusculo(api, caso):
    """CT-02 Login com e-mail em maiúsculas e espaços
    Esperado: 200 (o e-mail não diferencia maiúsculas)
    """
    r = api.post("/api/auth/login", json={"email": "  ANA@Email.com ", "senha": "123456"})
    caso(r.status_code)
    assert r.status_code == 200


def test_login_senha_errada(api, caso):
    """CT-03 Login com senha errada
    Esperado: 401 "E-mail ou senha inválidos."
    """
    r = api.post("/api/auth/login", json={"email": "ana@email.com", "senha": "errada"})
    caso(f"{r.status_code} {r.json().get('detail')}")
    assert r.status_code == 401 and "inválidos" in r.json()["detail"]


def test_login_email_inexistente(api, caso):
    """CT-04 Login com e-mail que não existe
    Esperado: 401 com a mesma mensagem (não revela se o e-mail existe)
    """
    r = api.post("/api/auth/login", json={"email": "ninguem@nada.com", "senha": "123456"})
    caso(f"{r.status_code} {r.json().get('detail')}")
    assert r.status_code == 401 and "inválidos" in r.json()["detail"]


def test_login_campos_vazios(api, caso):
    """CT-05 Login sem e-mail e sem senha
    Esperado: 400 ou 422 com mensagem
    """
    r = api.post("/api/auth/login", json={"email": "", "senha": ""})
    caso(r.status_code)
    assert r.status_code in (400, 401, 422)


def test_me_com_token(api, ana, caso):
    """CT-06 Consultar o próprio perfil com token válido
    Esperado: 200 com nome, e-mail e perfil, sem a senha
    """
    r = api.get("/api/auth/me", headers=ana)
    corpo = r.json()
    caso(f"{r.status_code}, perfil {corpo.get('perfil')}, campos de senha: {[k for k in corpo if 'senha' in k.lower()]}")
    assert r.status_code == 200 and corpo["perfil"] == "adotante" and not any("senha" in k.lower() for k in corpo)


def test_me_sem_token(api, caso):
    """CT-07 Acessar rota protegida sem token
    Esperado: 401
    """
    r = api.get("/api/auth/me")
    caso(r.status_code)
    assert r.status_code == 401


def test_me_token_invalido(api, caso):
    """CT-08 Acessar rota protegida com token falso
    Esperado: 401
    """
    r = api.get("/api/auth/me", headers={"Authorization": "Bearer abc.def.ghi"})
    caso(r.status_code)
    assert r.status_code == 401


def test_atualizar_perfil(api, sufixo, caso):
    """CT-09 Atualizar nome, cidade e telefone do próprio perfil
    Esperado: 200 e os dados novos em /me
    """
    email = f"perfil{sufixo}@teste.com"
    api.post("/api/auth/cadastro/adotante", json={"nome": "Teste Perfil", "email": email, "senha": "123456"})
    h = {"Authorization": "Bearer " + api.post("/api/auth/login", json={"email": email, "senha": "123456"}).json()["token"]}
    r = api.put("/api/auth/me", headers=h, json={"nome": "Teste Perfil Novo", "cidade": "Goiânia - GO", "telefone": "(62) 99999-0000"})
    me = api.get("/api/auth/me", headers=h).json()
    caso(f"{r.status_code}, nome agora: {me.get('nome')}, cidade: {me.get('cidade')}")
    assert r.status_code == 200 and me["nome"] == "Teste Perfil Novo" and me["cidade"] == "Goiânia - GO"


def test_atualizar_perfil_nome_curto(api, ana, caso):
    """CT-10 Atualizar perfil com nome de 2 letras
    Esperado: 400 "Nome deve possuir pelo menos 3 caracteres."
    """
    r = api.put("/api/auth/me", headers=ana, json={"nome": "Jo"})
    caso(f"{r.status_code} {r.json().get('detail')}")
    assert r.status_code == 400


def test_trocar_senha_e_entrar(api, sufixo, caso):
    """CT-11 Trocar a senha no perfil e entrar com a nova
    Esperado: senha antiga recusada (401) e nova aceita (200)
    """
    email = f"senha{sufixo}@teste.com"
    api.post("/api/auth/cadastro/adotante", json={"nome": "Teste Senha", "email": email, "senha": "123456"})
    h = {"Authorization": "Bearer " + api.post("/api/auth/login", json={"email": email, "senha": "123456"}).json()["token"]}
    api.put("/api/auth/me", headers=h, json={"nome": "Teste Senha", "senha": "novaSenha9"})
    antiga = api.post("/api/auth/login", json={"email": email, "senha": "123456"}).status_code
    nova = api.post("/api/auth/login", json={"email": email, "senha": "novaSenha9"}).status_code
    caso(f"antiga {antiga}, nova {nova}")
    assert antiga == 401 and nova == 200


def test_recuperar_senha_email_inexistente(api, caso):
    """CT-12 Pedir recuperação de senha para e-mail que não existe
    Esperado: 200 com mensagem genérica (não revela se o e-mail existe)
    """
    r = api.post("/api/auth/recuperar-senha", json={"email": "naoexiste@nada.com"})
    caso(f"{r.status_code} {str(r.json())[:90]}")
    assert r.status_code == 200


def test_redefinir_senha_token_invalido(api, caso):
    """CT-13 Redefinir senha com código inválido
    Esperado: 400 com mensagem
    """
    r = api.post("/api/auth/redefinir-senha", json={"token": "codigo-falso", "novaSenha": "123456"})
    caso(f"{r.status_code} {r.json().get('detail')}")
    assert r.status_code in (400, 404)
