from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text

from app.database import engine
from app.security import obter_usuario_id_token


router = APIRouter(
    prefix="/api/favoritos",
    tags=["Favoritos"]
)


# ============================================================
# GET /api/favoritos
# Retorna os animais favoritos do usuário logado
# ============================================================

@router.get("")
def listar_favoritos(
    usuario_id: int = Depends(obter_usuario_id_token)
):
    with engine.connect() as conexao:

        favoritos = conexao.execute(
            text("""
                SELECT
                    a.id,
                    a.nome,
                    a.especie,
                    a.raca,
                    a.porte,
                    a.sexo,
                    a.idade_meses,
                    a.energia,
                    a.castrado,
                    a.vacinado,
                    a.convivencia_criancas,
                    a.convivencia_animais,
                    a.descricao,
                    a.status,

                    o.id AS ong_id,
                    o.nome AS ong_nome,
                    o.cidade AS ong_cidade,
                    o.telefone AS ong_telefone,

                    f.criado_em AS favoritado_em

                FROM favorito f

                INNER JOIN animal a
                    ON a.id = f.animal_id

                INNER JOIN ong o
                    ON o.id = a.ong_id

                WHERE f.usuario_id = :usuario_id

                ORDER BY f.criado_em DESC
            """),
            {"usuario_id": usuario_id}
        ).mappings().all()

        resposta = []

        for animal in favoritos:

            fotos = conexao.execute(
                text("""
                    SELECT url
                    FROM foto_animal
                    WHERE animal_id = :animal_id
                    ORDER BY ordem
                """),
                {"animal_id": animal["id"]}
            ).scalars().all()

            resposta.append({
                "id": animal["id"],
                "nome": animal["nome"],
                "especie": animal["especie"],
                "raca": animal["raca"],
                "porte": animal["porte"],
                "sexo": animal["sexo"],
                "idadeMeses": animal["idade_meses"],
                "energia": animal["energia"],
                "castrado": bool(animal["castrado"]),
                "vacinado": bool(animal["vacinado"]),
                "convivenciaCriancas": bool(
                    animal["convivencia_criancas"]
                ),
                "convivenciaAnimais": bool(
                    animal["convivencia_animais"]
                ),
                "descricao": animal["descricao"],
                "status": animal["status"],
                "fotos": list(fotos),

                "ong": {
                    "id": animal["ong_id"],
                    "nome": animal["ong_nome"],
                    "cidade": animal["ong_cidade"],
                    "telefone": animal["ong_telefone"]
                }
            })

    return resposta


# ============================================================
# GET /api/favoritos/ids
# Retorna somente os IDs dos animais favoritados
# ============================================================

@router.get("/ids")
def listar_ids_favoritos(
    usuario_id: int = Depends(obter_usuario_id_token)
):
    with engine.connect() as conexao:

        ids = conexao.execute(
            text("""
                SELECT animal_id
                FROM favorito
                WHERE usuario_id = :usuario_id
            """),
            {"usuario_id": usuario_id}
        ).scalars().all()

    return list(ids)


# ============================================================
# POST /api/favoritos/{animal_id}
# Adiciona ou remove um animal dos favoritos
# ============================================================

@router.post("/{animal_id}")
def alternar_favorito(
    animal_id: int,
    usuario_id: int = Depends(obter_usuario_id_token)
):
    with engine.begin() as conexao:

        # Verifica se o animal existe
        animal = conexao.execute(
            text("""
                SELECT id
                FROM animal
                WHERE id = :animal_id
            """),
            {"animal_id": animal_id}
        ).mappings().first()

        if not animal:
            raise HTTPException(
                status_code=404,
                detail="Animal não encontrado."
            )

        # Verifica se já está favoritado
        favorito = conexao.execute(
            text("""
                SELECT usuario_id, animal_id
                FROM favorito
                WHERE usuario_id = :usuario_id
                  AND animal_id = :animal_id
            """),
            {
                "usuario_id": usuario_id,
                "animal_id": animal_id
            }
        ).mappings().first()

        # Se já existe, remove
        if favorito:
            conexao.execute(
                text("""
                    DELETE FROM favorito
                    WHERE usuario_id = :usuario_id
                      AND animal_id = :animal_id
                """),
                {
                    "usuario_id": usuario_id,
                    "animal_id": animal_id
                }
            )

            return {
                "favorito": False
            }

        # Se não existe, adiciona
        conexao.execute(
            text("""
                INSERT INTO favorito (
                    usuario_id,
                    animal_id
                )
                VALUES (
                    :usuario_id,
                    :animal_id
                )
            """),
            {
                "usuario_id": usuario_id,
                "animal_id": animal_id
            }
        )

        return {
            "favorito": True
        }