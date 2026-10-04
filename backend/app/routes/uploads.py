import os
import uuid

from fastapi import APIRouter, File, HTTPException, UploadFile


router = APIRouter(
    prefix="/api/uploads",
    tags=["Uploads"]
)


PASTA_UPLOADS = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "uploads"
)

os.makedirs(PASTA_UPLOADS, exist_ok=True)


@router.post("/fotos")
async def enviar_foto(
    arquivo: UploadFile = File(...)
):
    tipos_permitidos = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp"
    }

    if arquivo.content_type not in tipos_permitidos:
        raise HTTPException(
            status_code=400,
            detail="Formato de imagem não permitido."
        )

    extensao = tipos_permitidos[arquivo.content_type]

    nome_arquivo = f"{uuid.uuid4().hex}{extensao}"

    caminho = os.path.join(
        PASTA_UPLOADS,
        nome_arquivo
    )

    conteudo = await arquivo.read()

    # Máximo de 5 MB
    if len(conteudo) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="A imagem deve possuir no máximo 5 MB."
        )

    with open(caminho, "wb") as foto:
        foto.write(conteudo)

    return {
        "url": f"http://127.0.0.1:8000/uploads/{nome_arquivo}"
    }