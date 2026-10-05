from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text

from app.database import engine
from app.security import obter_usuario_id_token


router = APIRouter(
    prefix="/api/ia",
    tags=["IA / Compatibilidade"]
)


def clamp(valor):
    return max(0, min(1, valor))


def fator_espaco(f, a):
    peso_porte = {
        "pequeno": 0,
        "medio": 1,
        "grande": 2
    }.get(a["porte"], 0)

    valor = 1

    if f["tipo_moradia"] == "apartamento":
        valor -= peso_porte * 0.3

    if not f["tem_quintal"]:
        valor -= peso_porte * 0.12

    if (
        a["especie"] == "gato"
        and f["tipo_moradia"] == "apartamento"
        and not f["tela_protecao"]
    ):
        valor -= 0.45

    return clamp(valor)


def fator_energia(f, a):
    pessoa = {
        "baixo": 0,
        "medio": 1,
        "alto": 2
    }.get(f["nivel_atividade"], 0)

    animal = {
        "baixa": 0,
        "media": 1,
        "alta": 2
    }.get(a["energia"], 0)

    return clamp(1 - abs(pessoa - animal) * 0.42)


def fator_rotina(f, a):
    horas = f["horas_sozinho"] or 0

    tolerancia = 10 if a["especie"] == "gato" else 6

    if a["idade_meses"] < 12:
        tolerancia -= 2

    if a["energia"] == "alta":
        tolerancia -= 1

    return clamp(
        1 - max(0, horas - tolerancia) * 0.14
    )


def fator_criancas(f, a):
    if not f["tem_criancas"]:
        return 1

    return 1 if a["convivencia_criancas"] else 0.2


def fator_outros_animais(f, a):
    if not f["outros_animais"]:
        return 1

    return 1 if a["convivencia_animais"] else 0.25


def fator_experiencia(f, a):
    experiencia = {
        "nenhuma": 0,
        "alguma": 1,
        "muita": 2
    }.get(f["experiencia"], 0)

    exigencia = 0

    if a["idade_meses"] < 12:
        exigencia += 1

    if a["energia"] == "alta":
        exigencia += 1

    if a["porte"] == "grande":
        exigencia += 0.5

    return clamp(
        1 - max(0, exigencia - experiencia) * 0.3
    )


def descrever(chave, valor):
    bom = valor >= 0.75
    medio = valor >= 0.45

    if chave == "espaco":
        if bom:
            return "A moradia comporta bem o porte do animal."
        if medio:
            return "Espaço um pouco limitado para o porte."
        return "Moradia pouco adequada ao porte ou sem proteção."

    if chave == "energia":
        if bom:
            return "Ritmo do adotante combina com a energia do animal."
        if medio:
            return "Diferença moderada de ritmo."
        return "Energia do animal destoa bastante da rotina do adotante."

    if chave == "rotina":
        if bom:
            return "Tempo sozinho dentro do tolerável."
        if medio:
            return "O animal ficaria sozinho por bastante tempo."
        return "Tempo sozinho excessivo para este animal."

    if chave == "criancas":
        if bom:
            return "Sem conflito com crianças."
        return "O animal não tem histórico de convivência com crianças."

    if chave == "animais":
        if bom:
            return "Sem conflito com outros animais."
        return "O animal não convive bem com outros animais."

    if chave == "experiencia":
        if bom:
            return "Experiência compatível com as necessidades do animal."
        return "Animal exige mais experiência do que a informada."

    return ""


def calcular_compatibilidade(formulario, animal):
    configuracao = [
        ("espaco", "Espaço da moradia", 0.22, fator_espaco),
        (
            "energia",
            "Nível de energia × estilo de vida",
            0.20,
            fator_energia
        ),
        (
            "rotina",
            "Tempo que o animal ficaria sozinho",
            0.18,
            fator_rotina
        ),
        (
            "criancas",
            "Convivência com crianças",
            0.15,
            fator_criancas
        ),
        (
            "animais",
            "Convivência com outros animais",
            0.13,
            fator_outros_animais
        ),
        (
            "experiencia",
            "Experiência do adotante",
            0.12,
            fator_experiencia
        ),
    ]

    fatores = []

    for chave, nome, peso, funcao in configuracao:
        valor = funcao(formulario, animal)
        valor_arredondado = round(valor, 2)

        fatores.append({
            "chave": chave,
            "nome": nome,
            "peso": peso,
            "valor": valor_arredondado,
            "descricao": descrever(chave, valor)
        })

    bruto = sum(
        fator["valor"] * fator["peso"]
        for fator in fatores
    )

    minimo = min(
        fator["valor"]
        for fator in fatores
    )

    score = round(
        100 * bruto * (0.7 + 0.3 * minimo)
    )

    return {
        "score": score,
        "fatores": fatores,
        "modelo": "simulacao-python-v1"
    }


@router.get("/compatibilidade/{animal_id}")
def obter_compatibilidade(
    animal_id: int,
    usuario_id: int = Depends(obter_usuario_id_token)
):
    with engine.connect() as conexao:

        formulario = conexao.execute(
            text("""
                SELECT *
                FROM formulario_avaliacao
                WHERE usuario_id = :usuario_id
            """),
            {"usuario_id": usuario_id}
        ).mappings().first()

        # Mesmo comportamento do mock:
        # sem formulário = null
        if not formulario:
            return None

        animal = conexao.execute(
    text("""
        SELECT *
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

    return calcular_compatibilidade(
        formulario,
        animal
    )

# ============================================================
# GET /api/ia/recomendacoes
# Retorna animais ordenados pela compatibilidade
# ============================================================

@router.get("/recomendacoes")
def obter_recomendacoes(
    limite: int = 9,
    usuario_id: int = Depends(obter_usuario_id_token)
):
    # Garante um limite razoável
    limite = max(1, min(limite, 50))

    with engine.connect() as conexao:

        # Busca o formulário do adotante
        formulario = conexao.execute(
            text("""
                SELECT *
                FROM formulario_avaliacao
                WHERE usuario_id = :usuario_id
            """),
            {"usuario_id": usuario_id}
        ).mappings().first()

        # Frontend espera semFormulario quando
        # o adotante ainda não respondeu ao formulário
        if not formulario:
            return {
                "semFormulario": True,
                "itens": [],
                "processados": 0,
                "tempoMs": 0,
                "modelo": "simulacao-python-v1"
            }

        # Busca animais disponíveis de ONGs aprovadas
        animais = conexao.execute(
            text("""
                SELECT
                    a.*,
                    o.id AS ong_id,
                    o.nome AS ong_nome,
                    o.cidade AS ong_cidade,
                    o.telefone AS ong_telefone
                FROM animal a

                INNER JOIN ong o
                    ON o.id = a.ong_id

                WHERE a.status = 'disponivel'
                  AND o.status = 'aprovada'
            """)
        ).mappings().all()

        itens = []

        for animal in animais:

            # Calcula a compatibilidade usando
            # a mesma função do endpoint individual
            resultado = calcular_compatibilidade(
                formulario,
                animal
            )

            # Busca as fotos do animal
            fotos = conexao.execute(
                text("""
                    SELECT url
                    FROM foto_animal
                    WHERE animal_id = :animal_id
                    ORDER BY ordem
                """),
                {"animal_id": animal["id"]}
            ).scalars().all()

            animal_json = {
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
            }

            itens.append({
                "animal": animal_json,
                "score": resultado["score"],
                "fatores": resultado["fatores"]
            })

        # Maior compatibilidade primeiro
        itens.sort(
            key=lambda item: item["score"],
            reverse=True
        )

        processados = len(itens)

        # Aplica o limite solicitado pelo frontend
        itens = itens[:limite]

    return {
        "semFormulario": False,
        "itens": itens,
        "processados": processados,
        "tempoMs": 0,
        "modelo": "simulacao-python-v1"
    }