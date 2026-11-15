"""Solicitações de adoção: fluxo completo e regras de negócio (RN01–RN08)."""
import pytest

from test_03_animais import animal


@pytest.fixture(scope="module")
def fluxo(api, ong, ana, admin, sufixo):
    """Animal novo da ONG Patinhas e dois adotantes interessados (Ana e Carlos)."""
    carlos = {"Authorization": "Bearer " + api.post("/api/auth/login", json={"email": "carlos@email.com", "senha": "123456"}).json()["token"]}
    a = api.post("/api/ong/animais", headers=ong, json=animal(nome="Fluxo" + sufixo[-4:])).json()
    return {"animal": a, "carlos": carlos}


def test_pedir_adocao(api, ana, fluxo, caso):
    """CT-41 Adotante com formulário pede adoção de um animal disponível
    Esperado: 201/200, status "pendente" e score de compatibilidade
    """
    r = api.post("/api/solicitacoes", headers=ana, json={"animalId": fluxo["animal"]["id"], "mensagem": "Tenho quintal grande."})
    s = r.json()
    fluxo["sol_ana"] = s.get("id")
    caso(f"{r.status_code}, status {s.get('status')}, score {s.get('score')}")
    assert r.status_code in (200, 201) and s["status"] == "pendente" and s["score"] is not None


def test_pedido_duplicado(api, ana, fluxo, caso):
    """CT-42 Mesmo adotante pede o mesmo animal de novo (RN05)
    Esperado: 409 "já existe solicitação ativa"
    """
    r = api.post("/api/solicitacoes", headers=ana, json={"animalId": fluxo["animal"]["id"]})
    caso(f"{r.status_code} {r.json().get('detail')}")
    assert r.status_code == 409


def test_segundo_interessado(api, fluxo, caso):
    """CT-43 Outro adotante pede o mesmo animal
    Esperado: 201/200 (vários interessados podem pedir)
    """
    r = api.post("/api/solicitacoes", headers=fluxo["carlos"], json={"animalId": fluxo["animal"]["id"]})
    fluxo["sol_carlos"] = r.json().get("id")
    caso(f"{r.status_code}, status {r.json().get('status')}")
    assert r.status_code in (200, 201)


def test_ong_ve_pedido(api, ong, fluxo, caso):
    """CT-44 A ONG vê os pedidos do próprio animal
    Esperado: os dois pedidos aparecem em /ong/solicitacoes
    """
    ids = [s["id"] for s in api.get("/api/ong/solicitacoes", headers=ong).json()]
    caso(f"Ana: {fluxo['sol_ana'] in ids}, Carlos: {fluxo['sol_carlos'] in ids}")
    assert fluxo["sol_ana"] in ids and fluxo["sol_carlos"] in ids


def test_outra_ong_nao_ve_pedido(api, outra_ong, fluxo, caso):
    """CT-45 Outra ONG tenta abrir o pedido pelo número
    Esperado: 403 ou 404
    """
    r = api.get(f"/api/solicitacoes/{fluxo['sol_ana']}", headers=outra_ong)
    caso(r.status_code)
    assert r.status_code in (403, 404)


def test_recusar_sem_motivo(api, ong, fluxo, caso):
    """CT-46 ONG recusa um pedido sem informar o motivo
    Esperado: 400 ou 422 pedindo o motivo
    """
    r = api.post(f"/api/solicitacoes/{fluxo['sol_carlos']}/recusar", headers=ong, json={"motivo": " "})
    caso(f"{r.status_code} {r.json().get('detail')}")
    assert r.status_code in (400, 422)


def test_concluir_sem_aprovar(api, ong, fluxo, caso):
    """CT-47 ONG tenta concluir uma adoção que ainda não foi aprovada (RN07)
    Esperado: 409
    """
    r = api.post(f"/api/solicitacoes/{fluxo['sol_ana']}/concluir", headers=ong, json={"obs": ""})
    caso(f"{r.status_code} {r.json().get('detail')}")
    assert r.status_code in (400, 409)


def test_analisar(api, ong, fluxo, caso):
    """CT-48 ONG coloca o pedido em análise
    Esperado: 200 e status "em_analise"
    """
    r = api.post(f"/api/solicitacoes/{fluxo['sol_ana']}/analisar", headers=ong)
    caso(f"{r.status_code}, status {r.json().get('status')}")
    assert r.status_code == 200 and r.json()["status"] == "em_analise"


def test_adotante_nao_aprova(api, ana, fluxo, caso):
    """CT-49 Adotante tenta aprovar o próprio pedido
    Esperado: 403
    """
    r = api.post(f"/api/solicitacoes/{fluxo['sol_ana']}/aprovar", headers=ana, json={"obs": ""})
    caso(r.status_code)
    assert r.status_code in (403, 404)


def test_aprovar(api, ong, fluxo, caso):
    """CT-50 ONG aprova o pedido (RN02)
    Esperado: 200, pedido "aprovada", animal "em_processo" e o outro pedido "encerrada"
    """
    r = api.post(f"/api/solicitacoes/{fluxo['sol_ana']}/aprovar", headers=ong, json={"obs": "Visita ok"})
    animal_status = api.get(f"/api/animais/{fluxo['animal']['id']}").json().get("status")
    outro = api.get(f"/api/solicitacoes/{fluxo['sol_carlos']}", headers=fluxo["carlos"]).json().get("status")
    caso(f"{r.status_code}, pedido {r.json().get('status')}, animal {animal_status}, outro pedido {outro}")
    assert r.json()["status"] == "aprovada" and animal_status == "em_processo" and outro == "encerrada"


def test_novo_pedido_animal_em_processo(api, sufixo, fluxo, caso):
    """CT-51 Novo adotante tenta pedir animal que já está em processo de adoção (RN01)
    Esperado: 409
    """
    email = f"tarde{sufixo}@teste.com"
    api.post("/api/auth/cadastro/adotante", json={"nome": "Chegou Tarde", "email": email, "senha": "123456"})
    h = {"Authorization": "Bearer " + api.post("/api/auth/login", json={"email": email, "senha": "123456"}).json()["token"]}
    from test_04_adotante import FORM
    api.put("/api/formulario", headers=h, json=FORM)
    r = api.post("/api/solicitacoes", headers=h, json={"animalId": fluxo["animal"]["id"]})
    caso(f"{r.status_code} {r.json().get('detail')}")
    assert r.status_code == 409


def test_cancelar_aprovada(api, ana, fluxo, caso):
    """CT-52 Adotante tenta cancelar um pedido já aprovado
    Esperado: 409 (só cancela pendente ou em análise)
    """
    r = api.post(f"/api/solicitacoes/{fluxo['sol_ana']}/cancelar", headers=ana)
    caso(f"{r.status_code} {r.json().get('detail')}")
    assert r.status_code in (400, 409)


def test_concluir(api, ong, fluxo, caso):
    """CT-53 ONG conclui a adoção
    Esperado: 200, pedido "concluida" e animal "adotado"
    """
    r = api.post(f"/api/solicitacoes/{fluxo['sol_ana']}/concluir", headers=ong, json={"obs": "Termo assinado"})
    animal_status = api.get(f"/api/animais/{fluxo['animal']['id']}").json().get("status")
    caso(f"{r.status_code}, pedido {r.json().get('status')}, animal {animal_status}")
    assert r.json()["status"] == "concluida" and animal_status == "adotado"


def test_historico_do_pedido(api, ana, fluxo, caso):
    """CT-54 Linha do tempo do pedido registra cada etapa
    Esperado: pendente → em_analise → aprovada → concluida
    """
    s = api.get(f"/api/solicitacoes/{fluxo['sol_ana']}", headers=ana).json()
    etapas = [h["status"] for h in s.get("historico", [])]
    caso(" → ".join(etapas))
    assert etapas == ["pendente", "em_analise", "aprovada", "concluida"]


def test_acompanhamento(api, ong, fluxo, caso):
    """CT-55 ONG registra acompanhamento pós-adoção
    Esperado: 201/200 e o registro aparece em /ong/adocoes
    """
    r = api.post(f"/api/solicitacoes/{fluxo['sol_ana']}/acompanhamentos", headers=ong,
                 json={"tipo": "visita", "data": "2026-11-10", "observacao": "Animal adaptado."})
    adocao = next((a for a in api.get("/api/ong/adocoes", headers=ong).json() if a["id"] == fluxo["sol_ana"]), {})
    caso(f"{r.status_code}, acompanhamentos: {len(adocao.get('acompanhamentos', []))}")
    assert r.status_code in (200, 201) and adocao.get("acompanhamentos")


def test_acompanhamento_data_futura(api, ong, fluxo, caso):
    """CT-56 Acompanhamento com data no futuro
    Esperado: 400 ou 422
    """
    r = api.post(f"/api/solicitacoes/{fluxo['sol_ana']}/acompanhamentos", headers=ong,
                 json={"tipo": "visita", "data": "2099-01-01", "observacao": "Data errada"})
    caso(f"{r.status_code} {r.json().get('detail')}")
    assert r.status_code in (400, 422)


def test_pedir_animal_adotado(api, fluxo, caso):
    """CT-57 Pedir adoção de animal já adotado (RN01)
    Esperado: 409
    """
    r = api.post("/api/solicitacoes", headers=fluxo["carlos"], json={"animalId": fluxo["animal"]["id"]})
    caso(f"{r.status_code} {r.json().get('detail')}")
    assert r.status_code == 409


def test_cancelar_pendente(api, ana, ong, sufixo, caso):
    """CT-58 Adotante cancela um pedido pendente
    Esperado: 200 e status "cancelada"
    """
    a = api.post("/api/ong/animais", headers=ong, json=animal(nome="Cancela" + sufixo[-4:])).json()
    s = api.post("/api/solicitacoes", headers=ana, json={"animalId": a["id"]}).json()
    r = api.post(f"/api/solicitacoes/{s['id']}/cancelar", headers=ana)
    caso(f"{r.status_code}, status {r.json().get('status')}")
    assert r.status_code == 200 and r.json()["status"] == "cancelada"


def test_recusar_com_motivo(api, ana, ong, sufixo, caso):
    """CT-59 ONG recusa um pedido informando o motivo
    Esperado: 200, status "recusada" e o motivo visível para o adotante
    """
    a = api.post("/api/ong/animais", headers=ong, json=animal(nome="Recusa" + sufixo[-4:])).json()
    s = api.post("/api/solicitacoes", headers=ana, json={"animalId": a["id"]}).json()
    r = api.post(f"/api/solicitacoes/{s['id']}/recusar", headers=ong, json={"motivo": "Moradia sem tela de proteção."})
    visto = api.get(f"/api/solicitacoes/{s['id']}", headers=ana).json()
    caso(f"{r.status_code}, status {visto.get('status')}, motivo: {visto.get('motivoRecusa')}")
    assert visto["status"] == "recusada" and visto["motivoRecusa"]
