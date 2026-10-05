from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import text

from app.database import engine
from app.security import obter_usuario_id_token


router = APIRouter(
    prefix="/api/ong",
    tags=["ONG"]
)


# =========================================================
# MODELO PARA CADASTRO DE ANIMAL
# =========================================================

class AnimalRequest(BaseModel):
    nome: str
    especie: str
    raca: str
    idadeMeses: int
    sexo: str
    porte: str
    energia: str
    convivenciaCriancas: bool
    convivenciaAnimais: bool
    castrado: bool
    vacinado: bool
    descricao: str
    fotos: list[str]


# =========================================================
# VERIFICAR ONG LOGADA
# =========================================================

def verificar_ong(conexao, usuario_id: int):
    """
    Verifica se o usuário logado pertence a uma ONG.
    Retorna os dados da ONG.
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
        {"usuario_id": usuario_id}
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


# =========================================================
# LISTAR ANIMAIS DA ONG
# =========================================================

@router.get("/animais")
def listar_animais_da_ong(
    status: str | None = Query(default=None),
    usuario_id: int = Depends(obter_usuario_id_token)
):
    with engine.connect() as conexao:

        usuario = verificar_ong(
            conexao,
            usuario_id
        )

        parametros = {
            "ong_id": usuario["ong_id"]
        }

        filtro_status = ""

        if status:
            filtro_status = """
                AND a.status = :status
            """
            parametros["status"] = status

        animais = conexao.execute(
            text(f"""
                SELECT
                    a.id,
                    a.ong_id,
                    a.nome,
                    a.especie,
                    a.raca,
                    a.sexo,
                    a.idade_meses,
                    a.porte,
                    a.energia,
                    a.castrado,
                    a.vacinado,
                    a.descricao,
                    a.status,
                    a.convivencia_criancas,
                    a.convivencia_animais,
                    a.criado_em,
                    a.atualizado_em
                FROM animal a
                WHERE a.ong_id = :ong_id
                  AND a.excluido_em IS NULL
                  {filtro_status}
                ORDER BY a.criado_em DESC
            """),
            parametros
        ).mappings().all()

        resposta = []

        for animal in animais:

            fotos = conexao.execute(
                text("""
                    SELECT url
                    FROM foto_animal
                    WHERE animal_id = :animal_id
                    ORDER BY ordem ASC, id ASC
                """),
                {"animal_id": animal["id"]}
            ).scalars().all()

            resposta.append({
                "id": animal["id"],
                "ongId": animal["ong_id"],
                "nome": animal["nome"],
                "especie": animal["especie"],
                "raca": animal["raca"],
                "sexo": animal["sexo"],
                "idadeMeses": animal["idade_meses"],
                "porte": animal["porte"],
                "energia": animal["energia"],
                "castrado": bool(animal["castrado"]),
                "vacinado": bool(animal["vacinado"]),
                "descricao": animal["descricao"],
                "status": animal["status"],
                "convivenciaCriancas": bool(
                    animal["convivencia_criancas"]
                ),
                "convivenciaAnimais": bool(
                    animal["convivencia_animais"]
                ),
                "fotos": list(fotos),
                "criadoEm": (
                    animal["criado_em"].isoformat()
                    if animal["criado_em"]
                    else None
                ),
                "atualizadoEm": (
                    animal["atualizado_em"].isoformat()
                    if animal["atualizado_em"]
                    else None
                )
            })

    return resposta


# =========================================================
# CADASTRAR ANIMAL
# =========================================================

@router.post("/animais")
def cadastrar_animal(
    dados: AnimalRequest,
    usuario_id: int = Depends(obter_usuario_id_token)
):

    # -----------------------------------------------------
    # Validações
    # -----------------------------------------------------

    nome = dados.nome.strip()
    raca = dados.raca.strip()
    descricao = dados.descricao.strip()

    if not nome:
        raise HTTPException(
            status_code=400,
            detail="Informe o nome do animal."
        )

    if dados.especie not in ["cao", "gato"]:
        raise HTTPException(
            status_code=400,
            detail="Espécie inválida."
        )

    if not raca:
        raise HTTPException(
            status_code=400,
            detail="Informe a raça do animal."
        )

    if dados.idadeMeses <= 0:
        raise HTTPException(
            status_code=400,
            detail="A idade do animal deve ser maior que zero."
        )

    if dados.sexo not in ["M", "F"]:
        raise HTTPException(
            status_code=400,
            detail="Sexo inválido."
        )

    if dados.porte not in ["pequeno", "medio", "grande"]:
        raise HTTPException(
            status_code=400,
            detail="Porte inválido."
        )

    if dados.energia not in ["baixa", "media", "alta"]:
        raise HTTPException(
            status_code=400,
            detail="Nível de energia inválido."
        )

    if len(descricao) < 20:
        raise HTTPException(
            status_code=400,
            detail="A descrição deve possuir pelo menos 20 caracteres."
        )

    if not dados.fotos:
        raise HTTPException(
            status_code=400,
            detail="Adicione pelo menos uma foto do animal."
        )

    if len(dados.fotos) > 6:
        raise HTTPException(
            status_code=400,
            detail="É permitido cadastrar no máximo 6 fotos."
        )

    # -----------------------------------------------------
    # Banco de dados
    # -----------------------------------------------------

    with engine.begin() as conexao:

        usuario = verificar_ong(
            conexao,
            usuario_id
        )

        # Regra do projeto:
        # ONG precisa estar aprovada para publicar animais.
        if usuario["ong_status"] != "aprovada":
            raise HTTPException(
                status_code=403,
                detail="A ONG precisa estar aprovada pelo administrador para publicar animais."
            )

        # -------------------------------------------------
        # Cadastrar animal
        # -------------------------------------------------

        resultado = conexao.execute(
            text("""
                INSERT INTO animal (
                    ong_id,
                    nome,
                    especie,
                    raca,
                    idade_meses,
                    sexo,
                    porte,
                    energia,
                    convivencia_criancas,
                    convivencia_animais,
                    castrado,
                    vacinado,
                    descricao,
                    status
                )
                VALUES (
                    :ong_id,
                    :nome,
                    :especie,
                    :raca,
                    :idade_meses,
                    :sexo,
                    :porte,
                    :energia,
                    :convivencia_criancas,
                    :convivencia_animais,
                    :castrado,
                    :vacinado,
                    :descricao,
                    'disponivel'
                )
            """),
            {
                "ong_id": usuario["ong_id"],
                "nome": nome,
                "especie": dados.especie,
                "raca": raca,
                "idade_meses": dados.idadeMeses,
                "sexo": dados.sexo,
                "porte": dados.porte,
                "energia": dados.energia,
                "convivencia_criancas": dados.convivenciaCriancas,
                "convivencia_animais": dados.convivenciaAnimais,
                "castrado": dados.castrado,
                "vacinado": dados.vacinado,
                "descricao": descricao
            }
        )

        animal_id = resultado.lastrowid

        # -------------------------------------------------
        # Salvar fotos
        # -------------------------------------------------

        for ordem, url in enumerate(dados.fotos):

            conexao.execute(
                text("""
                    INSERT INTO foto_animal (
                        animal_id,
                        url,
                        ordem
                    )
                    VALUES (
                        :animal_id,
                        :url,
                        :ordem
                    )
                """),
                {
                    "animal_id": animal_id,
                    "url": url,
                    "ordem": ordem
                }
            )

        # -------------------------------------------------
        # Buscar animal recém-criado
        # -------------------------------------------------

        animal = conexao.execute(
            text("""
                SELECT
                    id,
                    ong_id,
                    nome,
                    especie,
                    raca,
                    idade_meses,
                    sexo,
                    porte,
                    energia,
                    convivencia_criancas,
                    convivencia_animais,
                    castrado,
                    vacinado,
                    descricao,
                    status,
                    criado_em,
                    atualizado_em
                FROM animal
                WHERE id = :animal_id
                LIMIT 1
            """),
            {
                "animal_id": animal_id
            }
        ).mappings().first()

    # -----------------------------------------------------
    # Resposta para o React
    # -----------------------------------------------------

    return {
        "id": animal["id"],
        "ongId": animal["ong_id"],
        "nome": animal["nome"],
        "especie": animal["especie"],
        "raca": animal["raca"],
        "idadeMeses": animal["idade_meses"],
        "sexo": animal["sexo"],
        "porte": animal["porte"],
        "energia": animal["energia"],
        "convivenciaCriancas": bool(
            animal["convivencia_criancas"]
        ),
        "convivenciaAnimais": bool(
            animal["convivencia_animais"]
        ),
        "castrado": bool(animal["castrado"]),
        "vacinado": bool(animal["vacinado"]),
        "descricao": animal["descricao"],
        "status": animal["status"],
        "fotos": dados.fotos,
        "criadoEm": (
            animal["criado_em"].isoformat()
            if animal["criado_em"]
            else None
        ),
        "atualizadoEm": (
            animal["atualizado_em"].isoformat()
            if animal["atualizado_em"]
            else None
        )
    }

# ============================================================
# GET /api/ong/solicitacoes
# Lista as solicitações recebidas pela ONG logada
# ============================================================

@router.get("/solicitacoes")
def listar_solicitacoes_da_ong(
    usuario_id: int = Depends(obter_usuario_id_token)
):
    with engine.connect() as conexao:

        # Verifica qual ONG pertence ao usuário logado
        usuario = verificar_ong(conexao, usuario_id)

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

                    u.nome AS usuario_nome,
                    u.cidade AS usuario_cidade

                FROM solicitacao s

                INNER JOIN animal a
                    ON a.id = s.animal_id

                INNER JOIN usuario u
                    ON u.id = s.usuario_id

                WHERE a.ong_id = :ong_id
                  AND a.excluido_em IS NULL

                ORDER BY s.criado_em DESC
            """),
            {
                "ong_id": usuario["ong_id"]
            }
        ).mappings().all()

        resposta = []

        for solicitacao in solicitacoes:

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
                    "fotos": list(fotos)
                },

                "usuario": {
                    "id": solicitacao["usuario_id"],
                    "nome": solicitacao["usuario_nome"],
                    "cidade": solicitacao["usuario_cidade"]
                }
            })

    return resposta