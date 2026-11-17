"""
Envio de fotos de animais.

Revisão da Sprint 11: a rota passou a exigir login de ONG aprovada (antes qualquer
pessoa, mesmo sem login, conseguia gravar arquivos no servidor) e o endereço da
foto passou a usar o endereço real do servidor em vez de 127.0.0.1 fixo.
"""

import os
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile

from app.database import engine
from app.routes.ong import verificar_ong
from app.security import obter_usuario_id_token

router = APIRouter(
    prefix="/api/uploads",
    tags=["Uploads"]
)

PASTA_UPLOADS = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "uploads"
)
os.makedirs(PASTA_UPLOADS, exist_ok=True)

TIPOS_PERMITIDOS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
TAMANHO_MAXIMO = 5 * 1024 * 1024  # 5 MB


async def ler_imagem(arquivo: UploadFile) -> bytes:
    """Confere tipo e tamanho da imagem e devolve o conteúdo."""
    if arquivo.content_type not in TIPOS_PERMITIDOS:
        raise HTTPException(status_code=400, detail="Formato de imagem não permitido.")
    conteudo = await arquivo.read()
    if len(conteudo) > TAMANHO_MAXIMO:
        raise HTTPException(status_code=400, detail="A imagem deve possuir no máximo 5 MB.")
    return conteudo


def salvar_imagem(conteudo: bytes, tipo: str, request: Request) -> str:
    """Grava a imagem em backend/uploads e devolve o endereço público dela."""
    nome_arquivo = f"{uuid.uuid4().hex}{TIPOS_PERMITIDOS[tipo]}"
    with open(os.path.join(PASTA_UPLOADS, nome_arquivo), "wb") as foto:
        foto.write(conteudo)
    return f"{str(request.base_url).rstrip('/')}/uploads/{nome_arquivo}"


@router.post("/fotos")
async def enviar_foto(
    request: Request,
    arquivo: UploadFile = File(...),
    usuario_id: int = Depends(obter_usuario_id_token),
):
    with engine.connect() as conexao:
        verificar_ong(conexao, usuario_id)

    conteudo = await ler_imagem(arquivo)
    return {"url": salvar_imagem(conteudo, arquivo.content_type, request)}
