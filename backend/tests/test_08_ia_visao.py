"""IA: sugestão de espécie, raça e porte pela foto (RF23) e segurança do envio de fotos."""

import pathlib

import pytest

from app.ia import visao

FOTOS = pathlib.Path(__file__).with_name("fotos")
sem_modelo = pytest.mark.skipif(
    not visao.modelo_disponivel(), reason="modelo de visão não baixado (python -m app.ia.baixar_modelo)"
)


def _foto(nome, tipo="image/jpeg"):
    return {"imagem": (nome, (FOTOS / nome).read_bytes(), tipo)}


@sem_modelo
def test_classificar_cao(api, ong, caso):
    """CT-80 ONG envia a foto de um cão
    Esperado: 200, espécie cão, porte grande e a sugestão gravada no banco
    """
    r = api.post("/api/ia/classificar-imagem", headers=ong, files=_foto("cao.jpg"))
    d = r.json()
    caso(f"{r.status_code}, {d.get('especie')}, raça {d.get('raca', {}).get('valor')}, porte {d.get('porte', {}).get('valor')}, id {d.get('id')}")
    assert r.status_code == 200 and d["especie"]["valor"] == "cao" and d["porte"]["valor"] == "grande" and d["id"]


@sem_modelo
def test_classificar_gato(api, ong, caso):
    """CT-81 ONG envia a foto de um gato
    Esperado: 200, espécie gato e porte pequeno
    """
    r = api.post("/api/ia/classificar-imagem", headers=ong, files=_foto("gato.jpg"))
    d = r.json()
    caso(f"{r.status_code}, espécie {d.get('especie')}, raça {d.get('raca', {}).get('valor')}, {d.get('tempoMs')} ms")
    assert r.status_code == 200 and d["especie"]["valor"] == "gato" and d["porte"]["valor"] == "pequeno"


@sem_modelo
def test_foto_sem_animal(api, ong, caso):
    """CT-82 Foto que não mostra cão nem gato
    Esperado: 422 com a mensagem para preencher manualmente
    """
    r = api.post("/api/ia/classificar-imagem", headers=ong, files=_foto("sem-animal.png", "image/png"))
    caso(f"{r.status_code} {r.json().get('detail')}")
    assert r.status_code == 422 and "manualmente" in r.json()["detail"]


def test_arquivo_que_nao_e_imagem(api, ong, caso):
    """CT-83 Arquivo de texto enviado como foto para a IA
    Esperado: 400 (formato não permitido)
    """
    r = api.post("/api/ia/classificar-imagem", headers=ong, files={"imagem": ("nota.txt", b"texto", "text/plain")})
    caso(f"{r.status_code} {r.json().get('detail')}")
    assert r.status_code == 400


def test_adotante_nao_classifica(api, ana, caso):
    """CT-84 Adotante tenta usar a sugestão pela foto
    Esperado: 403 (só ONG)
    """
    r = api.post("/api/ia/classificar-imagem", headers=ana, files={"imagem": ("x.png", b"x", "image/png")})
    caso(f"{r.status_code} {r.json().get('detail')}")
    assert r.status_code == 403


@sem_modelo
def test_registrar_resposta_da_ong(api, ong, outra_ong, caso):
    """CT-85 ONG aplica a sugestão; outra ONG tenta alterar o mesmo registro
    Esperado: 200 para a dona da sugestão e 404 para a outra ONG
    """
    sid = api.post("/api/ia/classificar-imagem", headers=ong, files=_foto("cao.jpg")).json()["id"]
    dona = api.patch(f"/api/ia/classificacoes/{sid}", headers=ong, json={"aceita": True})
    outra = api.patch(f"/api/ia/classificacoes/{sid}", headers=outra_ong, json={"aceita": False})
    caso(f"dona {dona.status_code} {dona.json()}, outra ONG {outra.status_code}")
    assert dona.status_code == 200 and dona.json()["aceita"] is True and outra.status_code == 404


def test_upload_sem_login(api, caso):
    """CT-86 Envio de foto sem estar logado (falha encontrada na revisão da Sprint 11)
    Esperado: recusado (401 ou 403) e nenhum arquivo gravado
    """
    r = api.post("/api/uploads/fotos", files={"arquivo": ("x.png", b"x", "image/png")})
    caso(f"{r.status_code} {r.json().get('detail')}")
    assert r.status_code in (401, 403)


def test_upload_ong_pendente(api, ong_pendente, caso):
    """CT-87 ONG ainda não aprovada tenta enviar foto
    Esperado: 403
    """
    r = api.post("/api/uploads/fotos", headers=ong_pendente, files={"arquivo": ("x.png", b"x", "image/png")})
    caso(f"{r.status_code} {r.json().get('detail')}")
    assert r.status_code == 403


def test_upload_ong_aprovada(api, ong, caso):
    """CT-88 ONG aprovada envia foto
    Esperado: 200 e endereço /uploads/... do próprio servidor
    """
    r = api.post("/api/uploads/fotos", headers=ong, files={"arquivo": ("cao.jpg", (FOTOS / "cao.jpg").read_bytes(), "image/jpeg")})
    caso(f"{r.status_code} {r.json().get('url')}")
    assert r.status_code == 200 and "/uploads/" in r.json()["url"]
