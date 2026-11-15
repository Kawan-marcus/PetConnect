"""Área do adotante: formulário de avaliação, favoritos, IA e notificações."""

FORM = {"tipoMoradia": "casa", "temQuintal": True, "telaProtecao": True, "pessoasCasa": 3, "temCriancas": True,
        "outrosAnimais": False, "horasSozinho": 4, "experiencia": "alguma", "nivelAtividade": "medio",
        "motivacao": "Quero um companheiro para a família."}


def _novo_adotante(api, sufixo, nome):
    email = f"{nome}{sufixo}@teste.com"
    api.post("/api/auth/cadastro/adotante", json={"nome": nome.capitalize() + " Teste", "email": email, "senha": "123456"})
    return {"Authorization": "Bearer " + api.post("/api/auth/login", json={"email": email, "senha": "123456"}).json()["token"]}


def test_formulario_salvar_e_ler(api, sufixo, caso):
    """CT-34 Adotante preenche e consulta o formulário de avaliação
    Esperado: 200 e os dados salvos voltam iguais
    """
    h = _novo_adotante(api, sufixo, "form")
    r = api.put("/api/formulario", headers=h, json=FORM)
    lido = api.get("/api/formulario", headers=h).json()
    caso(f"{r.status_code}, moradia {lido.get('tipoMoradia')}, pessoas {lido.get('pessoasCasa')}")
    assert r.status_code == 200 and lido["tipoMoradia"] == "casa" and lido["pessoasCasa"] == 3


def test_formulario_invalido(api, ana, caso):
    """CT-35 Formulário com moradia fora da lista e horas sozinho negativas
    Esperado: 400 ou 422
    """
    r = api.put("/api/formulario", headers=ana, json=dict(FORM, tipoMoradia="barraca", horasSozinho=-2))
    caso(r.status_code)
    assert r.status_code in (400, 422)


def test_pedido_sem_formulario(api, sufixo, caso):
    """CT-36 Adotante sem formulário tenta pedir adoção (RN03)
    Esperado: 400/409/422 pedindo para preencher o formulário
    """
    h = _novo_adotante(api, sufixo, "semform")
    animal_id = api.get("/api/animais").json()[0]["id"]
    r = api.post("/api/solicitacoes", headers=h, json={"animalId": animal_id})
    caso(f"{r.status_code} {r.json().get('detail')}")
    assert r.status_code in (400, 409, 422) and "formul" in str(r.json().get("detail")).lower()


def test_favoritar_e_desfavoritar(api, sufixo, caso):
    """CT-37 Favoritar um animal e depois remover o favorito
    Esperado: aparece em /favoritos e some ao clicar de novo
    """
    h = _novo_adotante(api, sufixo, "fav")
    animal_id = api.get("/api/animais").json()[0]["id"]
    api.post(f"/api/favoritos/{animal_id}", headers=h)
    depois = api.get("/api/favoritos/ids", headers=h).json()
    api.post(f"/api/favoritos/{animal_id}", headers=h)
    final = api.get("/api/favoritos/ids", headers=h).json()
    caso(f"após favoritar: {animal_id in depois}; após remover: {animal_id in final}")
    assert animal_id in depois and animal_id not in final


def test_recomendacoes(api, ana, caso):
    """CT-38 Recomendações da IA para adotante com formulário
    Esperado: 200, lista ordenada por compatibilidade
    """
    r = api.get("/api/ia/recomendacoes", headers=ana)
    corpo = r.json()
    lista = corpo.get("itens", []) if isinstance(corpo, dict) else corpo
    scores = [x.get("score") for x in lista]
    caso(f"{r.status_code}, {len(lista)} animais, scores {scores[:5]}")
    assert r.status_code == 200 and len(lista) > 0 and scores == sorted(scores, reverse=True)


def test_compatibilidade(api, ana, caso):
    """CT-39 Compatibilidade entre o adotante e um animal
    Esperado: 200 com score de 0 a 100 e motivos
    """
    animal_id = api.get("/api/animais").json()[0]["id"]
    r = api.get(f"/api/ia/compatibilidade/{animal_id}", headers=ana)
    c = r.json()
    caso(f"{r.status_code}, score {c.get('score')}")
    assert r.status_code == 200 and 0 <= c["score"] <= 100


def test_notificacoes(api, ana, caso):
    """CT-40 Listar e marcar notificações como lidas
    Esperado: 200 nas duas chamadas e nenhuma não lida depois
    """
    r = api.get("/api/notificacoes", headers=ana)
    m = api.post("/api/notificacoes/marcar-lidas", headers=ana)
    depois = api.get("/api/notificacoes", headers=ana).json()
    lista = depois.get("itens", depois) if isinstance(depois, dict) else depois
    nao_lidas = [n for n in lista if not n.get("lida")]
    caso(f"{r.status_code}/{m.status_code}, não lidas depois: {len(nao_lidas)}")
    assert r.status_code == 200 and m.status_code == 200 and not nao_lidas
