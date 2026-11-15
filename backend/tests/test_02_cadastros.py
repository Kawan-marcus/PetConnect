"""Cadastro de adotante e de ONG, com validações de entrada."""
import pytest


def test_cadastro_adotante(api, sufixo, caso):
    """CT-14 Cadastrar adotante com dados válidos
    Esperado: 201/200, perfil "adotante" e login liberado
    """
    email = f"novo{sufixo}@teste.com"
    r = api.post("/api/auth/cadastro/adotante", json={"nome": "Novo Adotante", "email": email, "senha": "123456", "cidade": "Goiânia - GO"})
    login = api.post("/api/auth/login", json={"email": email, "senha": "123456"}).status_code
    caso(f"{r.status_code}, login {login}")
    assert r.status_code in (200, 201) and login == 200


def test_cadastro_email_duplicado(api, caso):
    """CT-15 Cadastrar com e-mail que já existe
    Esperado: 409 "Já existe um usuário cadastrado com este e-mail."
    """
    r = api.post("/api/auth/cadastro/adotante", json={"nome": "Ana Repetida", "email": "ana@email.com", "senha": "123456"})
    caso(f"{r.status_code} {r.json().get('detail')}")
    assert r.status_code == 409


@pytest.mark.parametrize("dados,motivo", [
    ({"nome": "Al", "email": "x1@teste.com", "senha": "123456"}, "nome curto"),
    ({"nome": "Alguem Teste", "email": "email-sem-arroba", "senha": "123456"}, "e-mail inválido"),
    ({"nome": "Alguem Teste", "email": "x2@teste.com", "senha": "123"}, "senha curta"),
    ({"nome": "Alguem Teste", "senha": "123456"}, "sem e-mail"),
])
def test_cadastro_adotante_invalido(api, caso, dados, motivo):
    """CT-16 Cadastro de adotante com dado inválido (nome curto, e-mail inválido, senha curta, campo faltando)
    Esperado: 400 ou 422 com mensagem explicando o erro
    """
    r = api.post("/api/auth/cadastro/adotante", json=dados)
    detalhe = r.json().get("detail")
    caso(f"{motivo}: {r.status_code} {detalhe if isinstance(detalhe, str) else 'validação do campo'}")
    assert r.status_code in (400, 422)


def _ong(sufixo, **troca):
    dados = {"nomeOng": "ONG Teste " + sufixo, "nomeResponsavel": "Responsável Teste", "cnpj": "",
             "descricao": "ONG de teste", "email": f"ong{sufixo}@teste.com", "telefone": "(62) 3333-4444",
             "cidade": "Goiânia - GO", "senha": "123456"}
    dados.update(troca)
    return dados


def _cnpj(base):
    """Gera um CNPJ com dígitos verificadores válidos a partir de 12 dígitos."""
    def dv(n):
        pesos = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] if len(n) == 12 else [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        s = sum(int(a) * b for a, b in zip(n, pesos)) % 11
        return "0" if s < 2 else str(11 - s)
    n = base[:12]
    n += dv(n)
    n += dv(n)
    return f"{n[:2]}.{n[2:5]}.{n[5:8]}/{n[8:12]}-{n[12:]}"


def test_cadastro_ong(api, sufixo, caso):
    """CT-17 Cadastrar ONG com dados válidos
    Esperado: 201/200 e a ONG fica "pendente" até o administrador aprovar (RN04)
    """
    r = api.post("/api/auth/cadastro/ong", json=_ong(sufixo, cnpj=_cnpj("12" + sufixo + "01")))
    h = {"Authorization": "Bearer " + api.post("/api/auth/login", json={"email": f"ong{sufixo}@teste.com", "senha": "123456"}).json()["token"]}
    me = api.get("/api/auth/me", headers=h).json()
    status = (me.get("ong") or {}).get("status")
    caso(f"{r.status_code}, status da ONG: {status}")
    assert r.status_code in (200, 201) and status == "pendente"


def test_cadastro_ong_cnpj_duplicado(api, sufixo, caso):
    """CT-18 Cadastrar ONG com CNPJ já usado
    Esperado: 409 "Já existe uma ONG cadastrada com este CNPJ."
    """
    cnpj = _cnpj("34" + sufixo + "02")
    api.post("/api/auth/cadastro/ong", json=_ong(sufixo + "a", cnpj=cnpj))
    r = api.post("/api/auth/cadastro/ong", json=_ong(sufixo + "b", cnpj=cnpj))
    caso(f"{r.status_code} {r.json().get('detail')}")
    assert r.status_code == 409


def test_cadastro_ong_cnpj_invalido(api, sufixo, caso):
    """CT-19 Cadastrar ONG com CNPJ em formato inválido ("123")
    Esperado: 400 "CNPJ inválido."
    """
    r = api.post("/api/auth/cadastro/ong", json=_ong(sufixo + "c", cnpj="123"))
    caso(f"{r.status_code} {r.json().get('detail')}")
    assert r.status_code == 400


def test_cadastro_ong_sem_telefone(api, sufixo, caso):
    """CT-20 Cadastrar ONG sem telefone
    Esperado: 400 "Informe o telefone da ONG."
    """
    r = api.post("/api/auth/cadastro/ong", json=_ong(sufixo + "d", cnpj=_cnpj("56" + sufixo + "03"), telefone=""))
    caso(f"{r.status_code} {r.json().get('detail')}")
    assert r.status_code == 400
