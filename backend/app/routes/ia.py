"""
Rotas do módulo 3 (IA de compatibilidade).

O cálculo fica em app/ia/ (modelo treinado + OpenCL). Aqui só ficam as rotas.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text

from app.database import engine
from app.ia.modelo import carregar_modelo
from app.ia.opencl import descricao_motor
from app.ia.servico import avaliar, recomendar, salvar_analise
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
