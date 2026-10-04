from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text

from app.database import engine
from app.security import obter_usuario_id_token


router = APIRouter(
    prefix="/api",
    tags=["Acompanhamento pós-adoção"]
)


# ============================================================
# MODELOS
# ============================================================

class AcompanhamentoRequest(BaseModel):
    tipo: str
    data: datetime
    observacao: str


# ============================================================
# FUNÇÕES AUXILIARES
# ============================================================

def verificar_ong(conexao, usuario_id: int):
    usuario = conexao.execute(
        text("""
            SELECT
                u.id,
                u.perfil,
                u.ong_id,
                o.nome AS ong_nome,
                o.status AS ong_status
            FROM usuario u

            LEFT JOIN ong o
                ON o.id = u.ong_id

            WHERE u.id = :usuario_id

            LIMIT 1
        """),
        {
            "usuario_id": usuario_id
        }
    ).mappings().first()

    if not usuario:
        raise HTTPException(
            status_code=404,
            detail="Usuário não encontrado."
        )

    if usuario["perfil"] != "ong":
        raise HTTPException(
            status_code=403,
            detail="Acesso permitido apenas para ONGs."
        )

    if not usuario["ong_id"]:
        raise HTTPException(
            status_code=403,
            detail="Usuário não está vinculado a uma ONG."
        )

    return usuario


# ============================================================
# GET /api/ong/adocoes
# Lista as adoções concluídas da ONG logada
# ============================================================

@router.get("/ong/adocoes")
def listar_adocoes_da_ong(
    usuario_id: int = Depends(obter_usuario_id_token)
):
    with engine.connect() as conexao:

        usuario = verificar_ong(
            conexao,
            usuario_id
        )

        solicitacoes = conexao.execute(
            text("""
                SELECT
                    s.id,
                    s.animal_id,
                    s.usuario_id,
                    s.status,
                    s.score,
                    s.mensagem,
                    s.motivo_recusa,
                    s.criado_em,
                    s.atualizado_em,

                    a.nome AS animal_nome,
                    a.especie AS animal_especie,
                    a.raca AS animal_raca,
                    a.sexo AS animal_sexo,
                    a.idade_meses AS animal_idade_meses,
                    a.porte AS animal_porte,

                    u.nome AS usuario_nome,
                    u.email AS usuario_email,
                    u.telefone AS usuario_telefone,
                    u.cidade AS usuario_cidade

                FROM solicitacao s

                INNER JOIN animal a
                    ON a.id = s.animal_id

                INNER JOIN usuario u
                    ON u.id = s.usuario_id

                WHERE a.ong_id = :ong_id
                  AND s.status = 'concluida'
                  AND a.excluido_em IS NULL

                ORDER BY s.atualizado_em DESC
            """),
            {
                "ong_id": usuario["ong_id"]
            }
        ).mappings().all()

        resposta = []

        for solicitacao in solicitacoes:

            # ------------------------------------------------
            # Fotos do animal
            # ------------------------------------------------

            fotos = conexao.execute(
                text("""
                    SELECT url
                    FROM foto_animal
                    WHERE animal_id = :animal_id
                    ORDER BY ordem ASC, id ASC
                """),
                {
                    "animal_id": solicitacao["animal_id"]
                }
            ).scalars().all()

            # ------------------------------------------------
            # Acompanhamentos dessa adoção
            # ------------------------------------------------

            acompanhamentos_db = conexao.execute(
                text("""
                    SELECT
                        id,
                        solicitacao_id,
                        tipo,
                        data,
                        observacao,
                        registrado_por,
                        criado_em
                    FROM acompanhamento

                    WHERE solicitacao_id = :solicitacao_id

                    ORDER BY data DESC, id DESC
                """),
                {
                    "solicitacao_id": solicitacao["id"]
                }
            ).mappings().all()

            acompanhamentos = []

            for acompanhamento in acompanhamentos_db:
                acompanhamentos.append({
                    "id": acompanhamento["id"],
                    "solicitacaoId": acompanhamento["solicitacao_id"],
                    "tipo": acompanhamento["tipo"],

                    "data": (
                        acompanhamento["data"].isoformat()
                        if acompanhamento["data"]
                        else None
                    ),

                    "observacao": acompanhamento["observacao"],

                    "registradoPor": acompanhamento["registrado_por"],

                    "criadoEm": (
                        acompanhamento["criado_em"].isoformat()
                        if acompanhamento["criado_em"]
                        else None
                    )
                })

            # ------------------------------------------------
            # Monta resposta esperada pelo React
            # ------------------------------------------------

            resposta.append({
                "id": solicitacao["id"],

                "animalId": solicitacao["animal_id"],

                "usuarioId": solicitacao["usuario_id"],

                "status": solicitacao["status"],

                "score": solicitacao["score"] or 0,

                "mensagem": solicitacao["mensagem"],

                "motivoRecusa": solicitacao["motivo_recusa"],

                "criadoEm": (
                    solicitacao["criado_em"].isoformat()
                    if solicitacao["criado_em"]
                    else None
                ),

                "atualizadoEm": (
                    solicitacao["atualizado_em"].isoformat()
                    if solicitacao["atualizado_em"]
                    else None
                ),

                "animal": {
                    "id": solicitacao["animal_id"],
                    "nome": solicitacao["animal_nome"],
                    "especie": solicitacao["animal_especie"],
                    "raca": solicitacao["animal_raca"],
                    "sexo": solicitacao["animal_sexo"],
                    "idadeMeses": solicitacao["animal_idade_meses"],
                    "porte": solicitacao["animal_porte"],
                    "fotos": list(fotos)
                },

                "usuario": {
                    "id": solicitacao["usuario_id"],
                    "nome": solicitacao["usuario_nome"],
                    "email": solicitacao["usuario_email"],
                    "telefone": solicitacao["usuario_telefone"],
                    "cidade": solicitacao["usuario_cidade"]
                },

                # O frontend usa:
                # s.historico.at(-1).data
                "historico": [
                    {
                        "status": "concluida",

                        "data": (
                            solicitacao["atualizado_em"].isoformat()
                            if solicitacao["atualizado_em"]
                            else solicitacao["criado_em"].isoformat()
                        ),

                        "obs": "Adoção concluída."
                    }
                ],

                # O frontend usa:
                # s.acompanhamentos[0]
                "acompanhamentos": acompanhamentos
            })

    return resposta


# ============================================================
# POST /api/solicitacoes/{id}/acompanhamentos
# Registra acompanhamento de uma adoção concluída
# ============================================================

@router.post("/solicitacoes/{solicitacao_id}/acompanhamentos")
def registrar_acompanhamento(
    solicitacao_id: int,
    dados: AcompanhamentoRequest,
    usuario_id: int = Depends(obter_usuario_id_token)
):
    with engine.begin() as conexao:

        usuario = verificar_ong(
            conexao,
            usuario_id
        )

        # ----------------------------------------------------
        # Busca solicitação + animal
        # ----------------------------------------------------

        solicitacao = conexao.execute(
            text("""
                SELECT
                    s.id,
                    s.status,
                    s.animal_id,
                    s.usuario_id,

                    a.ong_id,
                    a.nome AS animal_nome

                FROM solicitacao s

                INNER JOIN animal a
                    ON a.id = s.animal_id

                WHERE s.id = :solicitacao_id

                LIMIT 1
            """),
            {
                "solicitacao_id": solicitacao_id
            }
        ).mappings().first()

        if not solicitacao:
            raise HTTPException(
                status_code=404,
                detail="Solicitação não encontrada."
            )

        # ----------------------------------------------------
        # Segurança: solicitação precisa pertencer à ONG
        # ----------------------------------------------------

        if solicitacao["ong_id"] != usuario["ong_id"]:
            raise HTTPException(
                status_code=403,
                detail="Esta adoção não pertence à sua ONG."
            )

        # ----------------------------------------------------
        # Só adoções concluídas recebem acompanhamento
        # ----------------------------------------------------

        if solicitacao["status"] != "concluida":
            raise HTTPException(
                status_code=409,
                detail=(
                    "O acompanhamento só pode ser registrado "
                    "após a conclusão da adoção."
                )
            )

        # ----------------------------------------------------
        # Valida tipo
        # ----------------------------------------------------

        tipos_permitidos = (
            "visita",
            "contato",
            "foto"
        )

        if dados.tipo not in tipos_permitidos:
            raise HTTPException(
                status_code=400,
                detail="Tipo de acompanhamento inválido."
            )

        # ----------------------------------------------------
        # Valida observação
        # ----------------------------------------------------

        observacao = dados.observacao.strip()

        if len(observacao) < 5:
            raise HTTPException(
                status_code=400,
                detail="Descreva o acompanhamento."
            )

        # ----------------------------------------------------
        # Insere acompanhamento
        # ----------------------------------------------------

        resultado = conexao.execute(
            text("""
                INSERT INTO acompanhamento (
                    solicitacao_id,
                    tipo,
                    data,
                    observacao,
                    registrado_por
                )

                VALUES (
                    :solicitacao_id,
                    :tipo,
                    :data,
                    :observacao,
                    :registrado_por
                )
            """),
            {
                "solicitacao_id": solicitacao_id,
                "tipo": dados.tipo,
                "data": dados.data,
                "observacao": observacao,
                "registrado_por": usuario_id
            }
        )

        acompanhamento_id = resultado.lastrowid

        # ----------------------------------------------------
        # Busca o registro criado
        # ----------------------------------------------------

        acompanhamento = conexao.execute(
            text("""
                SELECT
                    id,
                    solicitacao_id,
                    tipo,
                    data,
                    observacao,
                    registrado_por,
                    criado_em

                FROM acompanhamento

                WHERE id = :id

                LIMIT 1
            """),
            {
                "id": acompanhamento_id
            }
        ).mappings().first()

    return {
        "id": acompanhamento["id"],

        "solicitacaoId": acompanhamento["solicitacao_id"],

        "tipo": acompanhamento["tipo"],

        "data": (
            acompanhamento["data"].isoformat()
            if acompanhamento["data"]
            else None
        ),

        "observacao": acompanhamento["observacao"],

        "registradoPor": acompanhamento["registrado_por"],

        "criadoEm": (
            acompanhamento["criado_em"].isoformat()
            if acompanhamento["criado_em"]
            else None
        )
    }