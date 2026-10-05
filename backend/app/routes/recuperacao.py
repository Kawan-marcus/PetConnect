import hashlib
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text

from app.database import engine
from app.security import gerar_hash_senha


router = APIRouter(
    prefix="/api/auth",
    tags=["Autenticação"]
)


class RecuperarSenhaRequest(BaseModel):
    email: str


class RedefinirSenhaRequest(BaseModel):
    token: str
    novaSenha: str


MENSAGEM_PADRAO = "Se o e-mail estiver cadastrado, enviaremos um link para redefinir a senha."


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


# =========================================================
# POST /api/auth/recuperar-senha   { email }
# Gera um token válido por 1 hora e guarda só o hash dele no banco.
# A resposta é sempre a mesma, para não revelar quais e-mails existem.
# (Em ambiente local não há envio de e-mail: o link aparece no terminal do back.)
# =========================================================

@router.post("/recuperar-senha")
def recuperar_senha(dados: RecuperarSenhaRequest):
    email = dados.email.strip().lower()

    if "@" not in email or "." not in email:
        raise HTTPException(status_code=400, detail="E-mail inválido.")

    with engine.begin() as conexao:
        usuario = conexao.execute(
            text("SELECT id FROM usuario WHERE LOWER(email) = :email AND ativo = 1"),
            {"email": email}
        ).mappings().first()

        if usuario:
            token = secrets.token_urlsafe(32)

            conexao.execute(
                text("""
                    INSERT INTO token_recuperacao_senha (usuario_id, token_hash, expira_em)
                    VALUES (:usuario_id, :token_hash, :expira_em)
                """),
                {
                    "usuario_id": usuario["id"],
                    "token_hash": hash_token(token),
                    "expira_em": datetime.now() + timedelta(hours=1)
                }
            )

            print(f"[recuperar-senha] Link para {email}: http://localhost:5173/redefinir-senha?token={token}")

    return {"mensagem": MENSAGEM_PADRAO}


# =========================================================
# POST /api/auth/redefinir-senha   { token, novaSenha }
# =========================================================

@router.post("/redefinir-senha")
def redefinir_senha(dados: RedefinirSenhaRequest):
    if len(dados.novaSenha) < 6:
        raise HTTPException(status_code=400, detail="A nova senha deve possuir pelo menos 6 caracteres.")

    with engine.begin() as conexao:
        registro = conexao.execute(
            text("""
                SELECT id, usuario_id
                FROM token_recuperacao_senha
                WHERE token_hash = :token_hash
                  AND usado_em IS NULL
                  AND expira_em > NOW()
            """),
            {"token_hash": hash_token(dados.token)}
        ).mappings().first()

        if not registro:
            raise HTTPException(status_code=400, detail="Link inválido ou expirado. Solicite um novo.")

        conexao.execute(
            text("UPDATE usuario SET senha_hash = :senha_hash WHERE id = :usuario_id"),
            {"senha_hash": gerar_hash_senha(dados.novaSenha), "usuario_id": registro["usuario_id"]}
        )

        conexao.execute(
            text("UPDATE token_recuperacao_senha SET usado_em = NOW() WHERE id = :id"),
            {"id": registro["id"]}
        )

    return {"mensagem": "Senha redefinida com sucesso. Faça login com a nova senha."}
