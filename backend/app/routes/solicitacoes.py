from fastapi import APIRouter, Depends, HTTPException

from pydantic import BaseModel

from sqlalchemy import bindparam, text

from app.database import engine

from app.security import obter_usuario_id_token

router = APIRouter(

    prefix="/api/solicitacoes",

    tags=["Solicitações"]

)

# ============================================================

# MODELOS

# ============================================================

class SolicitarAdocaoRequest(BaseModel):

    animalId: int

    mensagem: str = ""

class AprovarSolicitacaoRequest(BaseModel):

    obs: str = ""

class ConcluirAdocaoRequest(BaseModel):

    obs: str = ""

class RecusarSolicitacaoRequest(BaseModel):
    motivo: str

# ============================================================

# FUNÇÕES AUXILIARES

# ============================================================

def verificar_ong(conexao, usuario_id: int):

    """

    Verifica se o usuário logado pertence a uma ONG.

    """

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


def criar_notificacao(conexao, usuario_id: int, texto_notificacao: str, link: str | None = None):

    conexao.execute(
        text("""
            INSERT INTO notificacao (
                usuario_id,
                texto,
                link,
                lida
            )
            VALUES (
                :usuario_id,
                :texto,
                :link,
                0
            )
        """),
        {
            "usuario_id": usuario_id,
            "texto": texto_notificacao,
            "link": link
        }
    )


# ============================================================

# POST /api/solicitacoes

# Criar uma nova solicitação de adoção

# ============================================================

# ============================================================
# HISTÓRICO DA SOLICITAÇÃO (linha do tempo — RF14 / RF16)
# Cada mudança de status fica registrada em historico_solicitacao.
# ============================================================

def registrar_historico(conexao, solicitacao_id: int, status: str, observacao: str = "", alterado_por: int | None = None):
    conexao.execute(
        text("""
            INSERT INTO historico_solicitacao (solicitacao_id, status, observacao, alterado_por)
            VALUES (:solicitacao_id, :status, :observacao, :alterado_por)
        """),
        {
            "solicitacao_id": solicitacao_id,
            "status": status,
            "observacao": (observacao or "").strip() or None,
            "alterado_por": alterado_por
        }
    )


def buscar_historicos(conexao, ids: list[int]) -> dict[int, list[dict]]:
    """Devolve {solicitacao_id: [{status, data, obs}, ...]} em ordem cronológica."""
    if not ids:
        return {}

    linhas = conexao.execute(
        text("""
            SELECT solicitacao_id, status, observacao, criado_em
            FROM historico_solicitacao
            WHERE solicitacao_id IN :ids
            ORDER BY criado_em ASC, id ASC
        """).bindparams(bindparam("ids", expanding=True)),
        {"ids": list(ids)}
    ).mappings().all()

    historicos: dict[int, list[dict]] = {}
    for h in linhas:
        historicos.setdefault(h["solicitacao_id"], []).append({
            "status": h["status"],
            "data": h["criado_em"].isoformat() if h["criado_em"] else None,
            "obs": h["observacao"] or ""
        })
    return historicos


@router.post("")

def solicitar_adocao(

    dados: SolicitarAdocaoRequest,

    usuario_id: int = Depends(obter_usuario_id_token)

):

    with engine.begin() as conexao:

        # ----------------------------------------------------

        # Verifica o usuário

        # ----------------------------------------------------

        usuario = conexao.execute(

            text("""

                SELECT id, perfil

                FROM usuario

                WHERE id = :usuario_id

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

        if usuario["perfil"] != "adotante":

            raise HTTPException(

                status_code=403,

                detail="Apenas adotantes podem solicitar adoção."

            )

        # ----------------------------------------------------

        # Verifica o animal

        # ----------------------------------------------------

        animal = conexao.execute(

            text("""

                SELECT *

                FROM animal

                WHERE id = :animal_id

            """),

            {

                "animal_id": dados.animalId

            }

        ).mappings().first()

        if not animal:

            raise HTTPException(

                status_code=404,

                detail="Animal não encontrado."

            )

        # RN01:

        # animal adotado não pode receber nova solicitação

        if animal["status"] == "adotado":

            raise HTTPException(

                status_code=409,

                detail="Este animal já foi adotado."

            )

        # ----------------------------------------------------

        # Verifica o formulário do adotante

        # ----------------------------------------------------

        formulario = conexao.execute(

            text("""

                SELECT *

                FROM formulario_avaliacao

                WHERE usuario_id = :usuario_id

            """),

            {

                "usuario_id": usuario_id

            }

        ).mappings().first()

        # RN03:

        # somente adotante com formulário preenchido

        # pode solicitar adoção

        if not formulario:

            raise HTTPException(

                status_code=400,

                detail=(

                    "Preencha o formulário de avaliação "

                    "antes de solicitar a adoção."

                )

            )

        # ----------------------------------------------------

        # Verifica solicitação ativa

        # ----------------------------------------------------

        solicitacao_ativa = conexao.execute(

            text("""

                SELECT id

                FROM solicitacao

                WHERE usuario_id = :usuario_id

                  AND animal_id = :animal_id

                  AND status IN (

                      'pendente',

                      'em_analise',

                      'aprovada'

                  )

                LIMIT 1

            """),

            {

                "usuario_id": usuario_id,

                "animal_id": dados.animalId

            }

        ).mappings().first()

        # RN05:

        # um adotante não pode possuir duas solicitações

        # ativas para o mesmo animal

        if solicitacao_ativa:

            raise HTTPException(

                status_code=409,

                detail=(

                    "Você já tem uma solicitação ativa "

                    "para este animal."

                )

            )

        # ----------------------------------------------------

        # Calcula a compatibilidade

        # ----------------------------------------------------

        from app.routes.ia import calcular_compatibilidade

        compatibilidade = calcular_compatibilidade(

            formulario,

            animal

        )

        score = compatibilidade["score"]

        # ----------------------------------------------------

        # Grava a solicitação no MySQL

        # ----------------------------------------------------

        resultado = conexao.execute(

            text("""

                INSERT INTO solicitacao (

                    animal_id,

                    usuario_id,

                    status,

                    score,

                    mensagem

                )

                VALUES (

                    :animal_id,

                    :usuario_id,

                    'pendente',

                    :score,

                    :mensagem

                )

            """),

            {

                "animal_id": dados.animalId,

                "usuario_id": usuario_id,

                "score": score,

                "mensagem": dados.mensagem.strip()

            }

        )

        solicitacao_id = resultado.lastrowid

        registrar_historico(conexao, solicitacao_id, "pendente", "", usuario_id)

        # ----------------------------------------------------
        # Notifica os usuários da ONG sobre a nova solicitação
        # ----------------------------------------------------

        usuarios_ong = conexao.execute(
            text("""
                SELECT id
                FROM usuario
                WHERE perfil = 'ong'
                  AND ong_id = :ong_id
            """),
            {
                "ong_id": animal["ong_id"]
            }
        ).scalars().all()

        for usuario_ong_id in usuarios_ong:
            criar_notificacao(
                conexao,
                usuario_ong_id,
                f"Nova solicitação de adoção para {animal['nome']}.",
                f"/ong/solicitacoes/{solicitacao_id}"
            )

        # ----------------------------------------------------

        # Busca a solicitação recém-criada

        # ----------------------------------------------------

        solicitacao = conexao.execute(

            text("""

                SELECT *

                FROM solicitacao

                WHERE id = :id

            """),

            {

                "id": solicitacao_id

            }

        ).mappings().first()

    return {

        "id": solicitacao["id"],

        "animalId": solicitacao["animal_id"],

        "usuarioId": solicitacao["usuario_id"],

        "status": solicitacao["status"],

        "score": solicitacao["score"],

        "mensagem": solicitacao["mensagem"],

        "motivoRecusa": solicitacao["motivo_recusa"],

        "criadoEm": solicitacao["criado_em"].isoformat(),

        "atualizadoEm": solicitacao["atualizado_em"].isoformat()

    }

# ============================================================

# GET /api/solicitacoes/minhas

# Lista as solicitações do adotante logado

# ============================================================

@router.get("/minhas")

def minhas_solicitacoes(

    usuario_id: int = Depends(obter_usuario_id_token)

):

    with engine.connect() as conexao:

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

                    a.status AS animal_status,

                    o.id AS ong_id,

                    o.nome AS ong_nome,

                    o.cidade AS ong_cidade,

                    o.telefone AS ong_telefone

                FROM solicitacao s

                INNER JOIN animal a

                    ON a.id = s.animal_id

                INNER JOIN ong o

                    ON o.id = a.ong_id

                WHERE s.usuario_id = :usuario_id

                ORDER BY s.criado_em DESC

            """),

            {

                "usuario_id": usuario_id

            }

        ).mappings().all()

        historicos = buscar_historicos(conexao, [s["id"] for s in solicitacoes])


        resposta = []

        for s in solicitacoes:

            fotos = conexao.execute(

                text("""

                    SELECT url

                    FROM foto_animal

                    WHERE animal_id = :animal_id

                    ORDER BY ordem ASC

                """),

                {

                    "animal_id": s["animal_id"]

                }

            ).scalars().all()

            resposta.append({

                "id": s["id"],

                "animalId": s["animal_id"],

                "usuarioId": s["usuario_id"],

                "status": s["status"],

                "score": s["score"],

                "mensagem": s["mensagem"],

                "motivoRecusa": s["motivo_recusa"],

                "criadoEm": s["criado_em"].isoformat(),

                "atualizadoEm": s["atualizado_em"].isoformat(),

                "animal": {

                    "id": s["animal_id"],

                    "nome": s["animal_nome"],

                    "especie": s["animal_especie"],

                    "raca": s["animal_raca"],

                    "status": s["animal_status"],

                    "fotos": list(fotos)

                },

                "ong": {

                    "id": s["ong_id"],

                    "nome": s["ong_nome"],

                    "cidade": s["ong_cidade"],

                    "telefone": s["ong_telefone"]

                },

                "historico": historicos.get(s["id"]) or [{"status": s["status"], "data": s["criado_em"].isoformat(), "obs": ""}]

            })

    return resposta

# ============================================================

# POST /api/solicitacoes/{id}/cancelar

# Cancela uma solicitação do adotante

# ============================================================

@router.post("/{solicitacao_id}/cancelar")

def cancelar_solicitacao(

    solicitacao_id: int,

    usuario_id: int = Depends(obter_usuario_id_token)

):

    with engine.begin() as conexao:

        solicitacao = conexao.execute(

            text("""

                SELECT id, usuario_id, status

                FROM solicitacao

                WHERE id = :solicitacao_id

                  AND usuario_id = :usuario_id

            """),

            {

                "solicitacao_id": solicitacao_id,

                "usuario_id": usuario_id

            }

        ).mappings().first()

        if not solicitacao:

            raise HTTPException(

                status_code=404,

                detail="Solicitação não encontrada."

            )

        if solicitacao["status"] not in (

            "pendente",

            "em_analise"

        ):

            raise HTTPException(

                status_code=409,

                detail=(

                    "Esta solicitação não pode mais "

                    "ser cancelada."

                )

            )

        registrar_historico(conexao, solicitacao_id, "cancelada", "Cancelada pelo adotante.", usuario_id)

        conexao.execute(

            text("""

                UPDATE solicitacao

                SET status = 'cancelada'

                WHERE id = :solicitacao_id

            """),

            {

                "solicitacao_id": solicitacao_id

            }

        )

        atualizada = conexao.execute(

            text("""

                SELECT *

                FROM solicitacao

                WHERE id = :solicitacao_id

            """),

            {

                "solicitacao_id": solicitacao_id

            }

        ).mappings().first()

    return {

        "id": atualizada["id"],

        "animalId": atualizada["animal_id"],

        "usuarioId": atualizada["usuario_id"],

        "status": atualizada["status"],

        "score": atualizada["score"],

        "mensagem": atualizada["mensagem"],

        "motivoRecusa": atualizada["motivo_recusa"],

        "criadoEm": atualizada["criado_em"].isoformat(),

        "atualizadoEm": atualizada["atualizado_em"].isoformat()

    }

# ============================================================
# POST /api/solicitacoes/{id}/analisar
# ONG coloca uma solicitação como "em análise"
# ============================================================

@router.post("/{solicitacao_id}/analisar")
def analisar_solicitacao(
    solicitacao_id: int,
    usuario_id: int = Depends(obter_usuario_id_token)
):
    with engine.begin() as conexao:
        usuario = verificar_ong(conexao, usuario_id)

        solicitacao = conexao.execute(
            text("""
                SELECT
                    s.id, s.animal_id, s.usuario_id, s.status, s.score,
                    s.mensagem, s.motivo_recusa, s.criado_em, s.atualizado_em,
                    a.ong_id, a.nome AS animal_nome
                FROM solicitacao s
                INNER JOIN animal a ON a.id = s.animal_id
                WHERE s.id = :solicitacao_id
                  AND a.excluido_em IS NULL
                LIMIT 1
            """),
            {"solicitacao_id": solicitacao_id}
        ).mappings().first()

        if not solicitacao:
            raise HTTPException(status_code=404, detail="Solicitação não encontrada.")

        if solicitacao["ong_id"] != usuario["ong_id"]:
            raise HTTPException(status_code=403, detail="Esta solicitação não pertence à sua ONG.")

        if solicitacao["status"] != "pendente":
            raise HTTPException(
                status_code=409,
                detail="Somente uma solicitação pendente pode ser colocada em análise."
            )

        registrar_historico(conexao, solicitacao_id, "em_analise", "", usuario_id)

        conexao.execute(
            text("""
                UPDATE solicitacao
                SET status = 'em_analise'
                WHERE id = :solicitacao_id
            """),
            {"solicitacao_id": solicitacao_id}
        )

        criar_notificacao(
            conexao,
            solicitacao["usuario_id"],
            f"Sua solicitação para adotar {solicitacao['animal_nome']} está em análise.",
            "/minhas-solicitacoes"
        )

        atualizada = conexao.execute(
            text("SELECT * FROM solicitacao WHERE id = :solicitacao_id"),
            {"solicitacao_id": solicitacao_id}
        ).mappings().first()

    return {
        "id": atualizada["id"],
        "animalId": atualizada["animal_id"],
        "usuarioId": atualizada["usuario_id"],
        "status": atualizada["status"],
        "score": atualizada["score"],
        "mensagem": atualizada["mensagem"],
        "motivoRecusa": atualizada["motivo_recusa"],
        "criadoEm": atualizada["criado_em"].isoformat() if atualizada["criado_em"] else None,
        "atualizadoEm": atualizada["atualizado_em"].isoformat() if atualizada["atualizado_em"] else None,
        "mensagemSistema": f"A solicitação para {solicitacao['animal_nome']} foi colocada em análise."
    }


# ============================================================
# POST /api/solicitacoes/{id}/recusar
# ONG recusa uma solicitação
# ============================================================

@router.post("/{solicitacao_id}/recusar")
def recusar_solicitacao(
    solicitacao_id: int,
    dados: RecusarSolicitacaoRequest,
    usuario_id: int = Depends(obter_usuario_id_token)
):
    motivo = dados.motivo.strip()

    if len(motivo) < 3:
        raise HTTPException(status_code=400, detail="Informe o motivo da recusa.")

    with engine.begin() as conexao:
        usuario = verificar_ong(conexao, usuario_id)

        solicitacao = conexao.execute(
            text("""
                SELECT
                    s.id, s.animal_id, s.usuario_id, s.status, s.score,
                    s.mensagem, s.motivo_recusa, s.criado_em, s.atualizado_em,
                    a.ong_id, a.nome AS animal_nome
                FROM solicitacao s
                INNER JOIN animal a ON a.id = s.animal_id
                WHERE s.id = :solicitacao_id
                  AND a.excluido_em IS NULL
                LIMIT 1
            """),
            {"solicitacao_id": solicitacao_id}
        ).mappings().first()

        if not solicitacao:
            raise HTTPException(status_code=404, detail="Solicitação não encontrada.")

        if solicitacao["ong_id"] != usuario["ong_id"]:
            raise HTTPException(status_code=403, detail="Esta solicitação não pertence à sua ONG.")

        if solicitacao["status"] not in ("pendente", "em_analise"):
            raise HTTPException(
                status_code=409,
                detail="Somente solicitações pendentes ou em análise podem ser recusadas."
            )

        registrar_historico(conexao, solicitacao_id, "recusada", motivo, usuario_id)

        conexao.execute(
            text("""
                UPDATE solicitacao
                SET status = 'recusada', motivo_recusa = :motivo
                WHERE id = :solicitacao_id
            """),
            {"motivo": motivo, "solicitacao_id": solicitacao_id}
        )

        criar_notificacao(
            conexao,
            solicitacao["usuario_id"],
            f"Sua solicitação para adotar {solicitacao['animal_nome']} foi recusada.",
            "/minhas-solicitacoes"
        )

        atualizada = conexao.execute(
            text("SELECT * FROM solicitacao WHERE id = :solicitacao_id"),
            {"solicitacao_id": solicitacao_id}
        ).mappings().first()

    return {
        "id": atualizada["id"],
        "animalId": atualizada["animal_id"],
        "usuarioId": atualizada["usuario_id"],
        "status": atualizada["status"],
        "score": atualizada["score"],
        "mensagem": atualizada["mensagem"],
        "motivoRecusa": atualizada["motivo_recusa"],
        "criadoEm": atualizada["criado_em"].isoformat() if atualizada["criado_em"] else None,
        "atualizadoEm": atualizada["atualizado_em"].isoformat() if atualizada["atualizado_em"] else None,
        "mensagemSistema": f"A solicitação para {solicitacao['animal_nome']} foi recusada."
    }


# ============================================================

# POST /api/solicitacoes/{id}/aprovar

# ONG aprova uma solicitação

# RN02

# ============================================================

@router.post("/{solicitacao_id}/aprovar")

def aprovar_solicitacao(

    solicitacao_id: int,

    dados: AprovarSolicitacaoRequest,

    usuario_id: int = Depends(obter_usuario_id_token)

):

    with engine.begin() as conexao:

        # ----------------------------------------------------

        # Verifica a ONG logada

        # ----------------------------------------------------

        usuario = verificar_ong(

            conexao,

            usuario_id

        )

        # ----------------------------------------------------

        # Busca a solicitação e o animal

        # ----------------------------------------------------

        solicitacao = conexao.execute(

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

                    a.ong_id,

                    a.status AS animal_status,

                    a.nome AS animal_nome

                FROM solicitacao s

                INNER JOIN animal a

                    ON a.id = s.animal_id

                WHERE s.id = :solicitacao_id

                  AND a.excluido_em IS NULL

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

        # Verifica se a solicitação pertence à ONG

        # ----------------------------------------------------

        if solicitacao["ong_id"] != usuario["ong_id"]:

            raise HTTPException(

                status_code=403,

                detail="Esta solicitação não pertence à sua ONG."

            )

        # ----------------------------------------------------

        # Verifica o status da solicitação

        # ----------------------------------------------------

        if solicitacao["status"] not in (

            "pendente",

            "em_analise"

        ):

            raise HTTPException(

                status_code=409,

                detail=(

                    "Somente solicitações pendentes ou "

                    "em análise podem ser aprovadas."

                )

            )

        # ----------------------------------------------------

        # RN01

        # Animal adotado não pode receber aprovação

        # ----------------------------------------------------

        if solicitacao["animal_status"] == "adotado":

            raise HTTPException(

                status_code=409,

                detail="Este animal já foi adotado."

            )

        # ----------------------------------------------------

        # RN02

        # Aprova a solicitação escolhida

        # ----------------------------------------------------

        registrar_historico(conexao, solicitacao_id, "aprovada", dados.obs, usuario_id)

        conexao.execute(

            text("""

                UPDATE solicitacao

                SET status = 'aprovada'

                WHERE id = :solicitacao_id

            """),

            {

                "solicitacao_id": solicitacao_id

            }

        )

        criar_notificacao(
            conexao,
            solicitacao["usuario_id"],
            f"Sua solicitação para adotar {solicitacao['animal_nome']} foi aprovada.",
            "/minhas-solicitacoes"
        )

        # ----------------------------------------------------

        # RN02

        # Coloca o animal em processo de adoção

        # ----------------------------------------------------

        conexao.execute(

            text("""

                UPDATE animal

                SET status = 'em_processo'

                WHERE id = :animal_id

            """),

            {

                "animal_id": solicitacao["animal_id"]

            }

        )

        # ----------------------------------------------------

        # RN02

        # Encerra as outras solicitações do mesmo animal

        # ----------------------------------------------------

        outras_solicitacoes = conexao.execute(
            text("""
                SELECT usuario_id
                FROM solicitacao
                WHERE animal_id = :animal_id
                  AND id <> :solicitacao_id
                  AND status IN ('pendente', 'em_analise')
            """),
            {
                "animal_id": solicitacao["animal_id"],
                "solicitacao_id": solicitacao_id
            }
        ).mappings().all()

        # RN02: registra o encerramento automático das outras solicitações deste animal
        conexao.execute(
            text("""
                INSERT INTO historico_solicitacao (solicitacao_id, status, observacao)
                SELECT id, 'encerrada', 'Outra solicitação foi aprovada para este animal.'
                FROM solicitacao
                WHERE animal_id = :animal_id
                  AND id <> :solicitacao_id
                  AND status IN ('pendente', 'em_analise')
            """),
            {
                "animal_id": solicitacao["animal_id"],
                "solicitacao_id": solicitacao_id
            }
        )

        conexao.execute(

            text("""

                UPDATE solicitacao

                SET status = 'encerrada'

                WHERE animal_id = :animal_id

                  AND id <> :solicitacao_id

                  AND status IN (

                      'pendente',

                      'em_analise'

                  )

            """),

            {

                "animal_id": solicitacao["animal_id"],

                "solicitacao_id": solicitacao_id

            }

        )

        for outra in outras_solicitacoes:
            criar_notificacao(
                conexao,
                outra["usuario_id"],
                (
                    f"Outra solicitação para {solicitacao['animal_nome']} foi aprovada. "
                    "Sua solicitação foi encerrada."
                ),
                "/minhas-solicitacoes"
            )

        # ----------------------------------------------------

        # Busca solicitação atualizada

        # ----------------------------------------------------

        atualizada = conexao.execute(

            text("""

                SELECT *

                FROM solicitacao

                WHERE id = :solicitacao_id

            """),

            {

                "solicitacao_id": solicitacao_id

            }

        ).mappings().first()

    return {

        "id": atualizada["id"],

        "animalId": atualizada["animal_id"],

        "usuarioId": atualizada["usuario_id"],

        "status": atualizada["status"],

        "score": atualizada["score"],

        "mensagem": atualizada["mensagem"],

        "motivoRecusa": atualizada["motivo_recusa"],

        "criadoEm": (

            atualizada["criado_em"].isoformat()

            if atualizada["criado_em"]

            else None

        ),

        "atualizadoEm": (

            atualizada["atualizado_em"].isoformat()

            if atualizada["atualizado_em"]

            else None

        ),

        "mensagemSistema": (

            f"Solicitação aprovada. "

            f"{solicitacao['animal_nome']} está em processo de adoção."

        )

    }

# ============================================================

# POST /api/solicitacoes/{id}/concluir

# ONG conclui uma adoção aprovada

# ============================================================

@router.post("/{solicitacao_id}/concluir")

def concluir_adocao(

    solicitacao_id: int,

    dados: ConcluirAdocaoRequest,

    usuario_id: int = Depends(obter_usuario_id_token)

):

    with engine.begin() as conexao:

        # ----------------------------------------------------

        # Verifica a ONG logada

        # ----------------------------------------------------

        usuario = verificar_ong(

            conexao,

            usuario_id

        )

        # ----------------------------------------------------

        # Busca a solicitação e o animal

        # ----------------------------------------------------

        solicitacao = conexao.execute(

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

                    a.ong_id,

                    a.status AS animal_status,

                    a.nome AS animal_nome

                FROM solicitacao s

                INNER JOIN animal a

                    ON a.id = s.animal_id

                WHERE s.id = :solicitacao_id

                  AND a.excluido_em IS NULL

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

        # Confirma que a solicitação pertence à ONG logada

        # ----------------------------------------------------

        if solicitacao["ong_id"] != usuario["ong_id"]:

            raise HTTPException(

                status_code=403,

                detail="Esta solicitação não pertence à sua ONG."

            )

        # ----------------------------------------------------

        # Só uma solicitação aprovada pode ser concluída

        # ----------------------------------------------------

        if solicitacao["status"] != "aprovada":

            raise HTTPException(

                status_code=409,

                detail=(

                    "Somente uma solicitação aprovada "

                    "pode ser concluída."

                )

            )

        # ----------------------------------------------------

        # Verifica o status atual do animal

        # ----------------------------------------------------

        if solicitacao["animal_status"] == "adotado":

            raise HTTPException(

                status_code=409,

                detail="Este animal já está marcado como adotado."

            )

        # ----------------------------------------------------

        # Marca a solicitação como concluída

        # ----------------------------------------------------

        registrar_historico(conexao, solicitacao_id, "concluida", dados.obs or "Adoção concluída.", usuario_id)

        conexao.execute(

            text("""

                UPDATE solicitacao

                SET status = 'concluida'

                WHERE id = :solicitacao_id

            """),

            {

                "solicitacao_id": solicitacao_id

            }

        )

        # ----------------------------------------------------

        # Marca o animal como adotado

        # ----------------------------------------------------

        conexao.execute(

            text("""

                UPDATE animal

                SET status = 'adotado'

                WHERE id = :animal_id

            """),

            {

                "animal_id": solicitacao["animal_id"]

            }

        )

        criar_notificacao(
            conexao,
            solicitacao["usuario_id"],
            f"A adoção de {solicitacao['animal_nome']} foi concluída com sucesso.",
            "/minhas-solicitacoes"
        )

        # ----------------------------------------------------

        # Busca a solicitação atualizada

        # ----------------------------------------------------

        atualizada = conexao.execute(

            text("""

                SELECT *

                FROM solicitacao

                WHERE id = :solicitacao_id

            """),

            {

                "solicitacao_id": solicitacao_id

            }

        ).mappings().first()

    return {

        "id": atualizada["id"],

        "animalId": atualizada["animal_id"],

        "usuarioId": atualizada["usuario_id"],

        "status": atualizada["status"],

        "score": atualizada["score"],

        "mensagem": atualizada["mensagem"],

        "motivoRecusa": atualizada["motivo_recusa"],

        "criadoEm": (

            atualizada["criado_em"].isoformat()

            if atualizada["criado_em"]

            else None

        ),

        "atualizadoEm": (

            atualizada["atualizado_em"].isoformat()

            if atualizada["atualizado_em"]

            else None

        ),

        "observacao": dados.obs.strip(),

        "mensagemSistema": (

            f"A adoção de {solicitacao['animal_nome']} "

            f"foi concluída com sucesso."

        )

    }

# ============================================================

# GET /api/solicitacoes/{id}

# Detalhes de uma solicitação

# IMPORTANTE: fica depois das rotas específicas

# ============================================================

@router.get("/{solicitacao_id}")

def obter_solicitacao(

    solicitacao_id: int,

    usuario_id: int = Depends(obter_usuario_id_token)

):

    with engine.connect() as conexao:

        # ----------------------------------------------------

        # Usuário logado

        # ----------------------------------------------------

        usuario_logado = conexao.execute(

            text("""

                SELECT

                    id,

                    perfil,

                    ong_id

                FROM usuario

                WHERE id = :usuario_id

                LIMIT 1

            """),

            {

                "usuario_id": usuario_id

            }

        ).mappings().first()

        if not usuario_logado:

            raise HTTPException(

                status_code=404,

                detail="Usuário não encontrado."

            )

        # ----------------------------------------------------

        # Solicitação

        # ----------------------------------------------------

        solicitacao = conexao.execute(

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

                    a.ong_id,

                    a.nome AS animal_nome,

                    a.especie AS animal_especie,

                    a.raca AS animal_raca,

                    a.sexo AS animal_sexo,

                    a.idade_meses AS animal_idade_meses,

                    a.porte AS animal_porte,

                    a.energia AS animal_energia,

                    a.status AS animal_status,

                    u.nome AS usuario_nome,

                    u.email AS usuario_email,

                    u.telefone AS usuario_telefone,

                    u.cidade AS usuario_cidade

                FROM solicitacao s

                INNER JOIN animal a

                    ON a.id = s.animal_id

                INNER JOIN usuario u

                    ON u.id = s.usuario_id

                WHERE s.id = :solicitacao_id

                  AND a.excluido_em IS NULL

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

        # Controle de acesso

        # ----------------------------------------------------

        if usuario_logado["perfil"] == "adotante":

            if solicitacao["usuario_id"] != usuario_id:

                raise HTTPException(

                    status_code=403,

                    detail="Você não possui acesso a esta solicitação."

                )

        elif usuario_logado["perfil"] == "ong":

            if usuario_logado["ong_id"] != solicitacao["ong_id"]:

                raise HTTPException(

                    status_code=403,

                    detail="Esta solicitação não pertence à sua ONG."

                )

        elif usuario_logado["perfil"] != "admin":

            raise HTTPException(

                status_code=403,

                detail="Você não possui acesso a esta solicitação."

            )

        # ----------------------------------------------------

        # Fotos

        # ----------------------------------------------------

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

        # ----------------------------------------------------

        # Formulário do adotante

        # ----------------------------------------------------

        formulario = conexao.execute(

            text("""

                SELECT *

                FROM formulario_avaliacao

                WHERE usuario_id = :usuario_id

                LIMIT 1

            """),

            {

                "usuario_id": solicitacao["usuario_id"]

            }

        ).mappings().first()

        historico_json = buscar_historicos(conexao, [solicitacao["id"]]).get(solicitacao["id"])

        formulario_json = None

        if formulario:

            formulario_json = {

                "tipoMoradia": formulario["tipo_moradia"],

                "temQuintal": bool(formulario["tem_quintal"]),

                "telaProtecao": bool(formulario["tela_protecao"]),

                "pessoasCasa": formulario["pessoas_casa"],

                "temCriancas": bool(formulario["tem_criancas"]),

                "outrosAnimais": bool(formulario["outros_animais"]),

                "horasSozinho": formulario["horas_sozinho"],

                "experiencia": formulario["experiencia"],

                "nivelAtividade": formulario["nivel_atividade"],

                "motivacao": formulario["motivacao"]

            }


        # RF21: compatibilidade com os fatores, para apoiar a análise da ONG
        compatibilidade_json = None

        if formulario:
            from app.routes.ia import calcular_compatibilidade

            animal_completo = conexao.execute(
                text("SELECT * FROM animal WHERE id = :animal_id"),
                {"animal_id": solicitacao["animal_id"]}
            ).mappings().first()

            if animal_completo:
                compatibilidade_json = calcular_compatibilidade(formulario, animal_completo)

    return {

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

            "energia": solicitacao["animal_energia"],

            "status": solicitacao["animal_status"],

            "fotos": list(fotos)

        },

        "usuario": {

            "id": solicitacao["usuario_id"],

            "nome": solicitacao["usuario_nome"],

            "email": solicitacao["usuario_email"],

            "telefone": solicitacao["usuario_telefone"],

            "cidade": solicitacao["usuario_cidade"]

        },

        "formulario": formulario_json,

        "compatibilidade": compatibilidade_json,

        "historico": historico_json or [{"status": solicitacao["status"], "data": solicitacao["criado_em"].isoformat() if solicitacao["criado_em"] else None, "obs": ""}]

    }