"""
Rotas do módulo 3 (IA de compatibilidade).

O cálculo fica em app/ia/ (modelo treinado + OpenCL). Aqui só ficam as rotas.
"""

import json

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from pydantic import BaseModel
from sqlalchemy import text

from app.database import engine
from app.ia import visao
from app.ia.modelo import carregar_modelo
from app.ia.opencl import descricao_motor
from app.ia.servico import avaliar, recomendar, salvar_analise
from app.routes.ong import verificar_ong
from app.routes.uploads import ler_imagem, salvar_imagem
from app.security import obter_usuario_id_token

router = APIRouter(
    prefix="/api/ia",
    tags=["IA / Compatibilidade"]
)


def calcular_compatibilidade(formulario, animal):
    """
    Mantida com o mesmo nome e formato de antes (usada em solicitacoes.py):
    devolve {"score", "fatores", "modelo"}.
    """
    return avaliar(formulario, animal)


# ============================================================
# GET /api/ia/compatibilidade/{animal_id}
# ============================================================
@router.get("/compatibilidade/{animal_id}")
def obter_compatibilidade(
    animal_id: int,
    usuario_id: int = Depends(obter_usuario_id_token)
):
    with engine.connect() as conexao:
        formulario = conexao.execute(
            text("SELECT * FROM formulario_avaliacao WHERE usuario_id = :usuario_id"),
            {"usuario_id": usuario_id}
        ).mappings().first()

        # Sem formulário = null (o front mostra o convite para preencher)
        if not formulario:
            return None

        animal = conexao.execute(
            text("SELECT * FROM animal WHERE id = :animal_id AND excluido_em IS NULL"),
            {"animal_id": animal_id}
        ).mappings().first()

        if not animal:
            raise HTTPException(status_code=404, detail="Animal não encontrado.")

    return avaliar(formulario, animal)


# ============================================================
# GET /api/ia/recomendacoes?limite=9
# Score do adotante contra TODOS os animais disponíveis, em lote (OpenCL/NumPy).
# As análises dos animais recomendados ficam gravadas (cache e ranking no banco).
# ============================================================
@router.get("/recomendacoes")
def obter_recomendacoes(
    limite: int = 9,
    usuario_id: int = Depends(obter_usuario_id_token)
):
    limite = max(1, min(limite, 50))

    with engine.begin() as conexao:
        resposta = recomendar(conexao, usuario_id, limite)
        for item in resposta["itens"]:
            salvar_analise(
                conexao,
                usuario_id,
                item["animal"]["id"],
                {"score": item["score"], "fatores": item["fatores"], "modelo": resposta["modelo"]},
            )

    return resposta


# ============================================================
# GET /api/ia/modelo
# Qual modelo está em uso, como foi treinado e onde roda (evidência do módulo 3).
# ============================================================
@router.get("/modelo")
def obter_modelo():
    modelo = carregar_modelo()
    dados = modelo.dados
    return {
        "versao": modelo.versao,
        "tipo": modelo.tipo,
        "algoritmo": modelo.algoritmo,
        "amostrasTreino": dados.get("amostras_treino"),
        "metricas": dados.get("metricas"),
        "treinadoEm": dados.get("treinado_em"),
        "importancia": [
            {"chave": f["chave"], "nome": f["nome"], "peso": f["peso"]}
            for f in modelo.explicar([1.0] * 6, lambda chave, valor: "")
        ],
        **descricao_motor(),
    }


# ============================================================
# POST /api/ia/classificar-imagem  (RF23)
# A ONG envia a primeira foto do animal e recebe a sugestão de espécie, raça e
# porte calculada pela rede MobileNetV2 (app/ia/visao.py). A sugestão fica
# registrada em classificacao_imagem; a ONG confirma ou corrige no formulário.
# ============================================================
@router.post("/classificar-imagem")
async def classificar_imagem(
    request: Request,
    imagem: UploadFile = File(...),
    usuario_id: int = Depends(obter_usuario_id_token),
):
    with engine.connect() as conexao:
        ong = verificar_ong(conexao, usuario_id)

    conteudo = await ler_imagem(imagem)
    try:
        resultado = visao.classificar(conteudo)
    except visao.ModeloIndisponivel as erro:
        raise HTTPException(status_code=503, detail=str(erro)) from erro
    except visao.FotoInvalida as erro:
        raise HTTPException(status_code=422, detail=str(erro)) from erro

    foto_url = salvar_imagem(conteudo, imagem.content_type, request)
    with engine.begin() as conexao:
        novo = conexao.execute(
            text("""
                INSERT INTO classificacao_imagem
                    (ong_id, foto_url, especie_sugerida, especie_confianca, raca_sugerida,
                     raca_confianca, raca_alternativas, porte_sugerido, porte_confianca, modelo, tempo_ms)
                VALUES (:ong, :url, :esp, :esp_c, :raca, :raca_c, :alt, :porte, :porte_c, :modelo, :tempo)
            """),
            {
                "ong": ong["ong_id"], "url": foto_url,
                "esp": resultado["especie"]["valor"], "esp_c": resultado["especie"]["confianca"],
                "raca": resultado["raca"]["valor"], "raca_c": resultado["raca"]["confianca"],
                "alt": json.dumps(resultado["raca"]["alternativas"], ensure_ascii=False),
                "porte": resultado["porte"]["valor"], "porte_c": resultado["porte"]["confianca"],
                "modelo": resultado["modelo"], "tempo": resultado["tempoMs"],
            },
        )
        resultado["id"] = novo.lastrowid
    return resultado


class RespostaSugestao(BaseModel):
    aceita: bool


# ============================================================
# PATCH /api/ia/classificacoes/{id}
# Registra se a ONG aplicou ou descartou a sugestão (mede a utilidade do modelo).
# ============================================================
@router.patch("/classificacoes/{classificacao_id}")
def responder_sugestao(
    classificacao_id: int,
    dados: RespostaSugestao,
    usuario_id: int = Depends(obter_usuario_id_token),
):
    with engine.begin() as conexao:
        ong = verificar_ong(conexao, usuario_id)
        alteradas = conexao.execute(
            text("UPDATE classificacao_imagem SET aceita = :aceita WHERE id = :id AND ong_id = :ong"),
            {"aceita": dados.aceita, "id": classificacao_id, "ong": ong["ong_id"]},
        ).rowcount
    if not alteradas:
        raise HTTPException(status_code=404, detail="Sugestão não encontrada.")
    return {"id": classificacao_id, "aceita": dados.aceita}
