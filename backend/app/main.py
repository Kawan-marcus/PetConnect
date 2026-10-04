from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.database import testar_conexao

from app.routes.auth import router as auth_router
from app.routes.animais import router as animais_router
from app.routes.formulario import router as formulario_router
from app.routes.favoritos import router as favoritos_router
from app.routes.ong import router as ong_router
from app.routes.uploads import router as uploads_router
from app.routes.ia import router as ia_router
from app.routes.solicitacoes import router as solicitacoes_router
from app.routes.acompanhamentos import router as acompanhamentos_router
from app.routes.notificacoes import router as notificacoes_router


app = FastAPI(
    title="PetConnect API",
    version="1.0.0"
)


# =========================================================
# PASTA DE UPLOADS
# =========================================================

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"

# Garante que a pasta exista
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# Permite acessar as imagens através de:
# http://127.0.0.1:8000/uploads/nome-da-imagem.jpg
app.mount(
    "/uploads",
    StaticFiles(directory=str(UPLOADS_DIR)),
    name="uploads"
)


# =========================================================
# ROTAS
# =========================================================

app.include_router(auth_router)
app.include_router(animais_router)
app.include_router(formulario_router)
app.include_router(favoritos_router)
app.include_router(ong_router)
app.include_router(uploads_router)
app.include_router(ia_router)
app.include_router(solicitacoes_router)
app.include_router(acompanhamentos_router)
app.include_router(notificacoes_router)


# =========================================================
# ROTA INICIAL
# =========================================================

@app.get("/api")
def inicio():
    return {
        "mensagem": "Backend do PetConnect funcionando!"
    }


# =========================================================
# TESTE DE CONEXÃO COM O BANCO
# =========================================================

@app.get("/api/health/db")
def verificar_banco():
    banco = testar_conexao()

    return {
        "status": "conectado",
        "banco": banco
    }