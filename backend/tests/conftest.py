"""
Testes automatizados do PetConnect (Sprints 09 a 12).

Rodam a API de verdade (FastAPI TestClient) contra o banco configurado no
backend/.env. O banco precisa ter os scripts 01, 02, 03, 05, 08 e 10 aplicados
(o 09, histórico de demonstração, é opcional). Os testes criam contas e animais
com nomes únicos, então podem ser repetidos.

    cd backend
    pip install pytest httpx2
    python -m pytest tests -v

Ao final é gerado tests/RELATORIO.md com cada caso de teste:
ID, descrição, resultado esperado, resultado obtido e situação.
"""

import os
import sys
import time
import pathlib

import pytest

RAIZ = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ))

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402

SENHA = "123456"
SUFIXO = str(int(time.time() * 1000))[-8:]
_RESULTADOS = []
TITULOS = {
    "autenticacao": "Autenticação e perfil", "cadastros": "Cadastro de contas (validações)",
    "animais": "Animais: cadastro, consulta, edição e exclusão", "adotante": "Área do adotante (formulário, favoritos, IA, notificações)",
    "solicitacoes": "Solicitações de adoção (fluxo e regras de negócio)", "admin": "Administração (contas, ONGs, logs)",
    "consultas_permissoes": "Consultas, paginação e permissões",
    "ia_visao": "IA: sugestão pela foto (RF23) e envio de fotos",
}


@pytest.fixture(scope="session")
def api():
    return TestClient(app, raise_server_exceptions=False)


def _login(api, email, senha=SENHA):
    r = api.post("/api/auth/login", json={"email": email, "senha": senha})
    assert r.status_code == 200, f"login de {email} falhou: {r.status_code} {r.text}"
    return {"Authorization": "Bearer " + r.json()["token"]}


@pytest.fixture(scope="session")
def admin(api):
    return _login(api, "admin@adotapet.com")


@pytest.fixture(scope="session")
def ana(api):
    return _login(api, "ana@email.com")


@pytest.fixture(scope="session")
def ong(api):
    return _login(api, "ong@patinhas.org")


@pytest.fixture(scope="session")
def outra_ong(api):
    return _login(api, "ong@laranimal.org")


@pytest.fixture(scope="session")
def ong_pendente(api):
    return _login(api, "amigos4patas@email.com")


@pytest.fixture(scope="session")
def sufixo():
    return SUFIXO


@pytest.fixture
def caso(request):
    """Registra o resultado obtido para o relatório: caso('201 e o id do animal')."""
    def registrar(texto):
        request.node.user_properties.append(("obtido", str(texto)))
    return registrar


def pytest_runtest_makereport(item, call):
    if call.when != "call" and not (call.when == "setup" and call.excinfo):
        return
    doc = (item.function.__doc__ or item.name).strip().split("\n")
    titulo = doc[0]
    esperado = next((l.split(":", 1)[1].strip() for l in doc if l.strip().lower().startswith("esperado")), "")
    obtido = next((v for k, v in item.user_properties if k == "obtido"), "")
    if call.excinfo:
        situacao = "FALHOU"
        obtido = obtido or str(call.excinfo.value).split("\n")[0][:160]
    else:
        situacao = "PASSOU"
    ident, _, desc = titulo.partition(" ")
    _RESULTADOS.append((item.module.__name__.replace("test_", ""), ident, desc, esperado, obtido, situacao))


def pytest_sessionfinish(session, exitstatus):
    if not _RESULTADOS:
        return
    linhas = [
        "# Relatório dos testes automatizados do back-end",
        "",
        f"Gerado em {time.strftime('%d/%m/%Y %H:%M')} · "
        f"{sum(r[5] == 'PASSOU' for r in _RESULTADOS)} de {len(_RESULTADOS)} casos passaram.",
        "",
        "Comando: `python -m pytest tests -v` (dentro da pasta `backend`).",
        "",
    ]
    grupo_atual = None
    for grupo, ident, desc, esperado, obtido, situacao in _RESULTADOS:
        if grupo != grupo_atual:
            titulo_grupo = TITULOS.get(grupo.split("_", 1)[-1], grupo)
            linhas += ["", f"## {titulo_grupo}", "",
                       "| ID | Caso de teste | Resultado esperado | Resultado obtido | Situação |", "|---|---|---|---|---|"]
            grupo_atual = grupo
        limpa = lambda t: str(t).replace("|", "/").replace("\n", " ")
        linhas.append(f"| {ident} | {limpa(desc)} | {limpa(esperado)} | {limpa(obtido)} | {'✅' if situacao == 'PASSOU' else '❌'} {situacao} |")
    destino = os.environ.get("RELATORIO_TESTES", str(pathlib.Path(__file__).with_name("RELATORIO.md")))
    pathlib.Path(destino).write_text("\n".join(linhas) + "\n", encoding="utf-8")
