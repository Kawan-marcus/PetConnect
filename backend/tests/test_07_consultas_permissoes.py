"""Consultas (filtros, busca, paginação) e permissões por perfil."""
import pytest


def test_filtro_especie(api, caso):
    """CT-71 Catálogo filtrado por espécie
    Esperado: só gatos
    """
    lista = api.get("/api/animais?especie=gato").json()
    caso(f"{len(lista)} animais, espécies {set(a['especie'] for a in lista)}")
    assert lista and all(a["especie"] == "gato" for a in lista)


def test_filtro_porte_e_sexo(api, caso):
    """CT-72 Catálogo filtrado por porte e sexo
    Esperado: só animais daquele porte e sexo
    """
    lista = api.get("/api/animais?porte=pequeno&sexo=F").json()
    caso(f"{len(lista)} animais")
    assert all(a["porte"] == "pequeno" and a["sexo"] == "F" for a in lista)


def test_busca_sem_acento(api, caso):
    """CT-73 Busca por nome no catálogo
    Esperado: encontra o animal pelo nome
    """
    nome = api.get("/api/animais").json()[0]["nome"]
    lista = api.get(f"/api/animais?busca={nome[:3].lower()}").json()
    caso(f"busca '{nome[:3].lower()}': {len(lista)} resultado(s)")
    assert any(a["nome"] == nome for a in lista)


def test_paginacao(api, caso):
    """CT-74 Paginação: duas páginas seguidas não repetem animais
    Esperado: 5 + 5 animais diferentes
    """
    p1 = [a["id"] for a in api.get("/api/animais?limit=5&offset=0").json()]
    p2 = [a["id"] for a in api.get("/api/animais?limit=5&offset=5").json()]
    caso(f"página 1 {p1}, página 2 {p2}")
    assert len(p1) == 5 and len(p2) == 5 and not set(p1) & set(p2)


def test_paginacao_invalida(api, caso):
    """CT-75 Paginação com limite acima do máximo (5000)
    Esperado: 422
    """
    r = api.get("/api/animais?limit=5000")
    caso(r.status_code)
    assert r.status_code == 422


@pytest.mark.parametrize("rota,perfil", [
    ("/api/admin/usuarios", "ana"), ("/api/admin/estatisticas", "ong"), ("/api/admin/logs", "ana"),
    ("/api/ong/animais", "ana"), ("/api/ong/solicitacoes", "ana"), ("/api/formulario", "ong"),
])
def test_acesso_restrito(api, request, caso, rota, perfil):
    """CT-76 Perfil sem permissão acessa área de outro perfil (adotante na área do admin/ONG, ONG na área do admin/adotante)
    Esperado: 403
    """
    r = api.get(rota, headers=request.getfixturevalue(perfil))
    caso(f"{perfil} em {rota}: {r.status_code}")
    assert r.status_code == 403


@pytest.mark.parametrize("rota", ["/api/admin/usuarios", "/api/ong/animais", "/api/solicitacoes/minhas", "/api/favoritos"])
def test_sem_login(api, caso, rota):
    """CT-77 Área logada sem token
    Esperado: 401
    """
    r = api.get(rota)
    caso(f"{rota}: {r.status_code}")
    assert r.status_code == 401


def test_ong_pendente_consulta(api, ong_pendente, caso):
    """CT-78 ONG pendente consulta as próprias listas
    Esperado: 200 (consulta liberada; cadastro bloqueado no CT-31)
    """
    r = api.get("/api/ong/animais", headers=ong_pendente)
    caso(r.status_code)
    assert r.status_code == 200


def test_saude(api, caso):
    """CT-79 Rota de saúde da API com o banco
    Esperado: 200 "conectado"
    """
    r = api.get("/api/health/db")
    caso(r.json())
    assert r.status_code == 200 and r.json()["status"] == "conectado"
