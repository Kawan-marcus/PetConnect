"""Animais: cadastro, consulta, atualização, exclusão e validações."""
import pytest

ANIMAL = {"nome": "Teste", "especie": "cao", "raca": "SRD", "idadeMeses": 18, "sexo": "M", "porte": "medio",
          "energia": "media", "convivenciaCriancas": True, "convivenciaAnimais": True, "castrado": True,
          "vacinado": True, "descricao": "Cão dócil e brincalhão, ótimo com crianças.", "fotos": ["/animais/1-1.svg"]}


def animal(**troca):
    d = dict(ANIMAL)
    d.update(troca)
    return d


@pytest.fixture(scope="module")
def novo_animal(api, ong, sufixo):
    r = api.post("/api/ong/animais", headers=ong, json=animal(nome="Rex" + sufixo[-4:]))
    assert r.status_code in (200, 201), r.text
    return r.json()


def test_cadastrar_animal(api, ong, novo_animal, caso):
    """CT-21 ONG aprovada cadastra um animal
    Esperado: 201/200, status "disponivel" e o animal aparece no catálogo
    """
    catalogo = [a["id"] for a in api.get("/api/animais").json()]
    caso(f"id {novo_animal['id']}, status {novo_animal['status']}, no catálogo: {novo_animal['id'] in catalogo}")
    assert novo_animal["status"] == "disponivel" and novo_animal["id"] in catalogo


def test_detalhe_animal(api, novo_animal, caso):
    """CT-22 Consultar o detalhe de um animal
    Esperado: 200 com dados do animal, fotos e ONG
    """
    r = api.get(f"/api/animais/{novo_animal['id']}")
    a = r.json()
    caso(f"{r.status_code}, {a.get('nome')}, ONG {a.get('ong', {}).get('nome')}, {len(a.get('fotos', []))} foto(s)")
    assert r.status_code == 200 and a["ong"]["nome"] and a["fotos"]


def test_detalhe_animal_inexistente(api, caso):
    """CT-23 Consultar animal que não existe
    Esperado: 404 "Animal não encontrado."
    """
    r = api.get("/api/animais/99999999")
    caso(f"{r.status_code} {r.json().get('detail')}")
    assert r.status_code == 404


def test_editar_animal(api, ong, novo_animal, caso):
    """CT-24 ONG edita os dados do próprio animal
    Esperado: 200 e a descrição nova gravada
    """
    r = api.put(f"/api/animais/{novo_animal['id']}", headers=ong, json=animal(nome=novo_animal["nome"], descricao="Descrição atualizada pelo teste automatizado."))
    salvo = api.get(f"/api/animais/{novo_animal['id']}").json()
    caso(f"{r.status_code}, descrição: {salvo.get('descricao')}")
    assert r.status_code == 200 and salvo["descricao"].startswith("Descrição atualizada")


def test_editar_animal_de_outra_ong(api, outra_ong, novo_animal, caso):
    """CT-25 ONG tenta editar animal de outra ONG
    Esperado: 403 ou 404
    """
    r = api.put(f"/api/animais/{novo_animal['id']}", headers=outra_ong, json=animal())
    caso(f"{r.status_code} {r.json().get('detail')}")
    assert r.status_code in (403, 404)


@pytest.mark.parametrize("troca,motivo", [
    ({"nome": ""}, "nome vazio"),
    ({"especie": "papagaio"}, "espécie inválida"),
    ({"porte": "gigante"}, "porte inválido"),
    ({"idadeMeses": -3}, "idade negativa"),
    ({"idadeMeses": 600}, "idade absurda (50 anos)"),
    ({"sexo": "X"}, "sexo inválido"),
    ({"fotos": []}, "sem foto"),
    ({"descricao": "oi"}, "descrição curta"),
])
def test_cadastrar_animal_invalido(api, ong, caso, troca, motivo):
    """CT-26 Cadastrar animal com dado inválido (nome vazio, espécie/porte/sexo fora da lista, idade negativa ou absurda, sem foto, descrição curta)
    Esperado: 400 ou 422 com mensagem
    """
    r = api.post("/api/ong/animais", headers=ong, json=animal(**troca))
    detalhe = r.json().get("detail")
    caso(f"{motivo}: {r.status_code} {detalhe if isinstance(detalhe, str) else 'validação do campo'}")
    assert r.status_code in (400, 422)


def test_status_manual_adotado(api, ong, novo_animal, caso):
    """CT-27 ONG tenta marcar o animal como "adotado" à mão (RN06)
    Esperado: 409, "adotado" só pela conclusão da adoção
    """
    r = api.patch(f"/api/animais/{novo_animal['id']}/status", headers=ong, json={"status": "adotado"})
    caso(f"{r.status_code} {r.json().get('detail')}")
    assert r.status_code == 409


def test_status_invalido(api, ong, novo_animal, caso):
    """CT-28 Alterar status do animal para um valor que não existe
    Esperado: 400 ou 422
    """
    r = api.patch(f"/api/animais/{novo_animal['id']}/status", headers=ong, json={"status": "voando"})
    caso(f"{r.status_code} {r.json().get('detail')}")
    assert r.status_code in (400, 409, 422)


def test_excluir_animal(api, ong, sufixo, caso):
    """CT-29 ONG remove um animal sem pedidos
    Esperado: 200/204 e o animal some do catálogo (exclusão lógica)
    """
    a = api.post("/api/ong/animais", headers=ong, json=animal(nome="Apagar" + sufixo[-4:])).json()
    r = api.delete(f"/api/animais/{a['id']}", headers=ong)
    no_catalogo = a["id"] in [x["id"] for x in api.get("/api/animais").json()]
    detalhe = api.get(f"/api/animais/{a['id']}").status_code
    caso(f"{r.status_code}, ainda no catálogo: {no_catalogo}, detalhe: {detalhe}")
    assert r.status_code in (200, 204) and not no_catalogo and detalhe == 404


def test_excluir_animal_com_pedido(api, ong, ana, sufixo, caso):
    """CT-30 ONG tenta remover animal com solicitação em aberto (RN08)
    Esperado: 409 com mensagem
    """
    a = api.post("/api/ong/animais", headers=ong, json=animal(nome="Pedido" + sufixo[-4:])).json()
    api.post("/api/solicitacoes", headers=ana, json={"animalId": a["id"], "mensagem": "Quero adotar"})
    r = api.delete(f"/api/animais/{a['id']}", headers=ong)
    caso(f"{r.status_code} {r.json().get('detail')}")
    assert r.status_code == 409


def test_ong_pendente_nao_cadastra(api, ong_pendente, caso):
    """CT-31 ONG pendente tenta cadastrar animal (RN04)
    Esperado: 403
    """
    r = api.post("/api/ong/animais", headers=ong_pendente, json=animal())
    caso(f"{r.status_code} {r.json().get('detail')}")
    assert r.status_code == 403


def test_adotante_nao_cadastra_animal(api, ana, caso):
    """CT-32 Adotante tenta cadastrar animal
    Esperado: 403
    """
    r = api.post("/api/ong/animais", headers=ana, json=animal())
    caso(r.status_code)
    assert r.status_code == 403


def test_animal_de_ong_pendente_fora_do_catalogo(api, admin, caso):
    """CT-33 Animal de ONG não aprovada não aparece no catálogo público
    Esperado: nenhum animal do catálogo pertence a ONG pendente/suspensa
    """
    ongs = {o["id"]: o["status"] for o in api.get("/api/admin/ongs", headers=admin).json()}
    catalogo = api.get("/api/animais").json()
    fora = [a["nome"] for a in catalogo if ongs.get(a.get("ongId") or a.get("ong", {}).get("id")) != "aprovada"]
    caso(f"{len(catalogo)} no catálogo, de ONG não aprovada: {len(fora)}")
    assert not fora
