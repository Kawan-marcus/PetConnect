from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text

from app.database import engine
from app.security import obter_usuario_id_token


router = APIRouter(
    prefix="/api/notificacoes",
    tags=["Notificações"]
)


# =========================================================
# GET /api/notificacoes
# Lista as notificações do usuário logado
# =========================================================
@router.get("")
def listar_notificacoes(
    usuario_id: int = Depends(obter_usuario_id_token)
):
    with engine.connect() as conexao:
        notificacoes = conexao.execute(
            text("""
                SELECT
                    id,
                    usuario_id,
                    texto,
                    link,
                    lida,
                    criado_em
                FROM notificacao
                WHERE usuario_id = :usuario_id
                ORDER BY criado_em DESC
            """),
            {
                "usuario_id": usuario_id
            }
        ).mappings().all()

    return [
        {
            "id": notificacao["id"],
            "usuarioId": notificacao["usuario_id"],
            "texto": notificacao["texto"],
            "link": notificacao["link"],
            "lida": bool(notificacao["lida"]),
            "criadoEm": notificacao["criado_em"].isoformat()
        }
        for notificacao in notificacoes
    ]


# =========================================================
# POST /api/notificacoes/marcar-lidas
# Marca todas as notificações do usuário como lidas
# =========================================================
@router.post("/marcar-lidas")
def marcar_notificacoes_lidas(
    usuario_id: int = Depends(obter_usuario_id_token)
):
    try:
        with engine.begin() as conexao:
            resultado = conexao.execute(
                text("""
                    UPDATE notificacao
                    SET lida = 1
                    WHERE usuario_id = :usuario_id
                      AND lida = 0
                """),
                {
                    "usuario_id": usuario_id
                }
            )

        return {
            "mensagem": "Notificações marcadas como lidas.",
            "atualizadas": resultado.rowcount
        }

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Não foi possível atualizar as notificações."
        )