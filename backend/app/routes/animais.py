from fastapi import APIRouter, Query, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy import text

from app.database import engine
from app.security import obter_usuario_id_token


router = APIRouter(
    prefix="/api/animais",
    tags=["Animais"]
)


# =========================================================
# MODELOS
# =========================================================

class AnimalUpdateRequest(BaseModel):
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
# GET - LISTAR ANIMAIS PÚBLICOS
# =========================================================

@router.get("")
def listar_animais(
    especie: str | None = None,
    porte: str | None = None,
    sexo: str | None = None,
    idade: str | None = None,
    busca: str | None = None,
    ordenar: str = Query(default="recentes")
):
    filtros = [
        "a.excluido_em IS NULL",
        "a.status <> 'adotado'",
        "o.status = 'aprovada'"
    ]

    parametros = {}

    if especie:
        filtros.append("a.especie = :especie")
        parametros["especie"] = especie

    if porte:
        filtros.append("a.porte = :porte")
        parametros["porte"] = porte

    if sexo:
        filtros.append("a.sexo = :sexo")
        parametros["sexo"] = sexo

    if idade == "filhote":
        filtros.append("a.idade_meses < 12")

    elif idade == "adulto":
        filtros.append(
            "a.idade_meses >= 12 AND a.idade_meses < 96"
        )

    elif idade == "idoso":
        filtros.append("a.idade_meses >= 96")

    if busca:
        filtros.append("""
            (
                a.nome LIKE :busca
                OR a.raca LIKE :busca
                OR a.descricao LIKE :busca
            )
        """)

        parametros["busca"] = f"%{busca}%"

    ordenacoes = {
        "recentes": "a.criado_em DESC",
        "nome": "a.nome ASC",
        "idade": "a.idade_meses ASC"
    }

    ordem = ordenacoes.get(
        ordenar,
        "a.criado_em DESC"
    )

    where = " AND ".join(filtros)

    consulta = text(f"""
        SELECT
            a.id,
            a.ong_id,
            a.nome,
            a.especie,
            a.raca,
            a.idade_meses,
            a.sexo,
            a.porte,
            a.energia,
            a.convivencia_criancas,
            a.convivencia_animais,
            a.castrado,
            a.vacinado,
            a.descricao,
            a.status,
            a.criado_em,

            o.nome AS ong_nome,
            o.cnpj AS ong_cnpj,
            o.email AS ong_email,
            o.telefone AS ong_telefone,
            o.cidade AS ong_cidade,
            o.descricao AS ong_descricao,
            o.status AS ong_status,
            o.criado_em AS ong_criado_em

        FROM animal a

        INNER JOIN ong o
            ON o.id = a.ong_id

        WHERE {where}

        ORDER BY {ordem}
    """)

    with engine.connect() as conexao:

        animais = conexao.execute(
            consulta,
            parametros
        ).mappings().all()

        resposta = []

        for animal in animais:

            fotos = conexao.execute(
                text("""
                    SELECT url
                    FROM foto_animal
                    WHERE animal_id = :animal_id
                    ORDER BY ordem ASC
                """),
                {
                    "animal_id": animal["id"]
                }
            ).scalars().all()

            resposta.append({
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
                "castrado": bool(
                    animal["castrado"]
                ),
                "vacinado": bool(
                    animal["vacinado"]
                ),
                "descricao": animal["descricao"],
                "fotos": list(fotos),
                "status": animal["status"],
                "criadoEm": (
                    animal["criado_em"].isoformat()
                    if animal["criado_em"]
                    else None
                ),

                "ong": {
                    "id": animal["ong_id"],
                    "nome": animal["ong_nome"],
                    "cnpj": animal["ong_cnpj"],
                    "email": animal["ong_email"],
                    "telefone": animal["ong_telefone"],
                    "cidade": animal["ong_cidade"],
                    "descricao": animal["ong_descricao"],
                    "status": animal["ong_status"],
                    "criadoEm": (
                        animal["ong_criado_em"].isoformat()
                        if animal["ong_criado_em"]
                        else None
                    )
                }
            })

    return resposta


# =========================================================
# GET - OBTER UM ANIMAL
# =========================================================

@router.get("/{animal_id}")
def obter_animal(animal_id: int):

    with engine.connect() as conexao:

        animal = conexao.execute(
            text("""
                SELECT
                    a.id,
                    a.ong_id,
                    a.nome,
                    a.especie,
                    a.raca,
                    a.idade_meses,
                    a.sexo,
                    a.porte,
                    a.energia,
                    a.convivencia_criancas,
                    a.convivencia_animais,
                    a.castrado,
                    a.vacinado,
                    a.descricao,
                    a.status,
                    a.criado_em,

                    o.nome AS ong_nome,
                    o.cnpj AS ong_cnpj,
                    o.email AS ong_email,
                    o.telefone AS ong_telefone,
                    o.cidade AS ong_cidade,
                    o.descricao AS ong_descricao,
                    o.status AS ong_status,
                    o.criado_em AS ong_criado_em

                FROM animal a

                INNER JOIN ong o
                    ON o.id = a.ong_id

                WHERE a.id = :animal_id
                  AND a.excluido_em IS NULL
                  AND o.status = 'aprovada'

                LIMIT 1
            """),
            {
                "animal_id": animal_id
            }
        ).mappings().first()

        if not animal:
            raise HTTPException(
                status_code=404,
                detail="Animal não encontrado."
            )

        fotos = conexao.execute(
            text("""
                SELECT url
                FROM foto_animal
                WHERE animal_id = :animal_id
                ORDER BY ordem ASC
            """),
            {
                "animal_id": animal_id
            }
        ).scalars().all()

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
        "castrado": bool(
            animal["castrado"]
        ),
        "vacinado": bool(
            animal["vacinado"]
        ),
        "descricao": animal["descricao"],
        "fotos": list(fotos),
        "status": animal["status"],
        "criadoEm": (
            animal["criado_em"].isoformat()
            if animal["criado_em"]
            else None
        ),

        "ong": {
            "id": animal["ong_id"],
            "nome": animal["ong_nome"],
            "cnpj": animal["ong_cnpj"],
            "email": animal["ong_email"],
            "telefone": animal["ong_telefone"],
            "cidade": animal["ong_cidade"],
            "descricao": animal["ong_descricao"],
            "status": animal["ong_status"],
            "criadoEm": (
                animal["ong_criado_em"].isoformat()
                if animal["ong_criado_em"]
                else None
            )
        }
    }


# =========================================================
# PUT - EDITAR ANIMAL
# =========================================================

@router.put("/{animal_id}")
def atualizar_animal(
    animal_id: int,
    dados: AnimalUpdateRequest,
    usuario_id: int = Depends(obter_usuario_id_token)
):

    nome = dados.nome.strip()
    raca = dados.raca.strip()
    descricao = dados.descricao.strip()

    # -----------------------------------------------------
    # VALIDAÇÕES
    # -----------------------------------------------------

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

    if dados.idadeMeses < 0:
        raise HTTPException(
            status_code=400,
            detail="A idade do animal não pode ser negativa."
        )

    if dados.sexo not in ["M", "F"]:
        raise HTTPException(
            status_code=400,
            detail="Sexo inválido."
        )

    if dados.porte not in [
        "pequeno",
        "medio",
        "grande"
    ]:
        raise HTTPException(
            status_code=400,
            detail="Porte inválido."
        )

    if dados.energia not in [
        "baixa",
        "media",
        "alta"
    ]:
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
            detail="Adicione pelo menos uma foto."
        )

    if len(dados.fotos) > 6:
        raise HTTPException(
            status_code=400,
            detail="É permitido no máximo 6 fotos."
        )

    # -----------------------------------------------------
    # BANCO DE DADOS
    # -----------------------------------------------------

    with engine.begin() as conexao:

        # Descobre a ONG do usuário autenticado
        usuario = conexao.execute(
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

        if not usuario:
            raise HTTPException(
                status_code=404,
                detail="Usuário não encontrado."
            )

        if usuario["perfil"] != "ong":
            raise HTTPException(
                status_code=403,
                detail="Apenas uma ONG pode editar animais."
            )

        if not usuario["ong_id"]:
            raise HTTPException(
                status_code=403,
                detail="Usuário não está vinculado a uma ONG."
            )

        # Verifica se o animal existe
        animal_existente = conexao.execute(
            text("""
                SELECT
                    id,
                    ong_id
                FROM animal
                WHERE id = :animal_id
                  AND excluido_em IS NULL
                LIMIT 1
            """),
            {
                "animal_id": animal_id
            }
        ).mappings().first()

        if not animal_existente:
            raise HTTPException(
                status_code=404,
                detail="Animal não encontrado."
            )

        # Impede uma ONG de editar animal de outra ONG
        if animal_existente["ong_id"] != usuario["ong_id"]:
            raise HTTPException(
                status_code=403,
                detail="Você não pode editar um animal de outra ONG."
            )

        # Atualiza os dados do animal
        conexao.execute(
            text("""
                UPDATE animal
                SET
                    nome = :nome,
                    especie = :especie,
                    raca = :raca,
                    idade_meses = :idade_meses,
                    sexo = :sexo,
                    porte = :porte,
                    energia = :energia,
                    convivencia_criancas = :convivencia_criancas,
                    convivencia_animais = :convivencia_animais,
                    castrado = :castrado,
                    vacinado = :vacinado,
                    descricao = :descricao
                WHERE id = :animal_id
            """),
            {
                "animal_id": animal_id,
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

        # Remove os registros antigos das fotos
        conexao.execute(
            text("""
                DELETE FROM foto_animal
                WHERE animal_id = :animal_id
            """),
            {
                "animal_id": animal_id
            }
        )

        # Cadastra novamente as fotos
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

        # Recupera o animal atualizado
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
    # RESPOSTA
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
        "castrado": bool(
            animal["castrado"]
        ),
        "vacinado": bool(
            animal["vacinado"]
        ),
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

# =========================================================
# PATCH - ALTERAR STATUS DO ANIMAL
# =========================================================

class AnimalStatusRequest(BaseModel):
    status: str


@router.patch("/{animal_id}/status")
def alterar_status_animal(
    animal_id: int,
    dados: AnimalStatusRequest,
    usuario_id: int = Depends(obter_usuario_id_token)
):

    status_validos = [
        "disponivel",
        "em_processo",
        "adotado"
    ]

    if dados.status not in status_validos:
        raise HTTPException(
            status_code=400,
            detail="Status do animal inválido."
        )

    with engine.begin() as conexao:

        # Busca o usuário logado
        usuario = conexao.execute(
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

        if not usuario:
            raise HTTPException(
                status_code=404,
                detail="Usuário não encontrado."
            )

        if usuario["perfil"] != "ong":
            raise HTTPException(
                status_code=403,
                detail="Apenas uma ONG pode alterar o status de um animal."
            )

        if not usuario["ong_id"]:
            raise HTTPException(
                status_code=403,
                detail="Usuário não está vinculado a uma ONG."
            )

        # Busca o animal
        animal = conexao.execute(
            text("""
                SELECT
                    id,
                    nome,
                    ong_id,
                    status
                FROM animal
                WHERE id = :animal_id
                  AND excluido_em IS NULL
                LIMIT 1
            """),
            {
                "animal_id": animal_id
            }
        ).mappings().first()

        if not animal:
            raise HTTPException(
                status_code=404,
                detail="Animal não encontrado."
            )

        # Segurança: ONG só altera os próprios animais
        if animal["ong_id"] != usuario["ong_id"]:
            raise HTTPException(
                status_code=403,
                detail="Você não pode alterar um animal de outra ONG."
            )

        # Atualiza status
        conexao.execute(
            text("""
                UPDATE animal
                SET status = :status
                WHERE id = :animal_id
            """),
            {
                "status": dados.status,
                "animal_id": animal_id
            }
        )

    return {
        "id": animal_id,
        "nome": animal["nome"],
        "status": dados.status,
        "mensagem": "Status do animal atualizado com sucesso."
    }

# =========================================================
# DELETE - REMOVER ANIMAL
# =========================================================

@router.delete("/{animal_id}")
def remover_animal(
    animal_id: int,
    usuario_id: int = Depends(obter_usuario_id_token)
):
    with engine.begin() as conexao:

        # Busca o usuário logado
        usuario = conexao.execute(
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

        if not usuario:
            raise HTTPException(
                status_code=404,
                detail="Usuário não encontrado."
            )

        if usuario["perfil"] != "ong":
            raise HTTPException(
                status_code=403,
                detail="Apenas uma ONG pode remover animais."
            )

        if not usuario["ong_id"]:
            raise HTTPException(
                status_code=403,
                detail="Usuário não está vinculado a uma ONG."
            )

        # Busca o animal
        animal = conexao.execute(
            text("""
                SELECT
                    id,
                    nome,
                    ong_id,
                    status
                FROM animal
                WHERE id = :animal_id
                  AND excluido_em IS NULL
                LIMIT 1
            """),
            {
                "animal_id": animal_id
            }
        ).mappings().first()

        if not animal:
            raise HTTPException(
                status_code=404,
                detail="Animal não encontrado."
            )

        # Impede que uma ONG remova animal de outra ONG
        if animal["ong_id"] != usuario["ong_id"]:
            raise HTTPException(
                status_code=403,
                detail="Você não pode remover um animal de outra ONG."
            )

        # Exclusão lógica:
        # não apagamos definitivamente do banco.
        conexao.execute(
            text("""
                UPDATE animal
                SET excluido_em = CURRENT_TIMESTAMP
                WHERE id = :animal_id
            """),
            {
                "animal_id": animal_id
            }
        )

    return {
        "mensagem": "Animal removido com sucesso.",
        "id": animal_id,
        "nome": animal["nome"]
    }