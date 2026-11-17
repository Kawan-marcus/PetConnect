"""
Sugestão de espécie, raça e porte a partir da foto (RF23).

Usa a rede neural MobileNetV2 já treinada no ImageNet (1.000 classes, entre elas
118 raças de cães e 5 tipos de gatos), no formato ONNX, executada pelo ONNX Runtime
na CPU. Nada é enviado para fora do servidor.

Como a resposta é montada:
  1. A foto é reduzida para 224×224 e normalizada como no treino do ImageNet.
  2. A rede devolve a probabilidade de cada uma das 1.000 classes.
  3. Espécie: soma das probabilidades das classes de cães × soma das de gatos.
  4. Raça: a classe mais provável dentro da espécie; abaixo de 30% vira "SRD".
  5. Porte: soma das probabilidades das raças de cada porte (gatos = pequeno).

O arquivo do modelo (~14 MB) não fica no GitHub: é baixado uma vez com
    python -m app.ia.baixar_modelo
Sem o arquivo, a rota responde 503 com uma mensagem clara e o cadastro de animal
continua funcionando normalmente (a ONG preenche os campos à mão).
"""

import io
import os
import time
from pathlib import Path

import numpy as np

from app.ia.racas import CAES, GATOS

PASTA_MODELOS = Path(__file__).resolve().parent / "modelos"
ARQUIVO_MODELO = Path(os.getenv("IA_MODELO_VISAO", PASTA_MODELOS / "mobilenetv2-12.onnx"))
NOME_MODELO = "mobilenetv2-imagenet-onnx"

LIMIAR_ANIMAL = 0.10   # abaixo disso a foto não parece ter cão nem gato
LIMIAR_RACA = 0.30     # abaixo disso a raça é sugerida como SRD

_MEDIA = np.array([0.485, 0.456, 0.406], dtype=np.float32).reshape(3, 1, 1)
_DESVIO = np.array([0.229, 0.224, 0.225], dtype=np.float32).reshape(3, 1, 1)

_sessao = None


class ModeloIndisponivel(Exception):
    """O arquivo do modelo ainda não foi baixado ou o onnxruntime não está instalado."""


class FotoInvalida(Exception):
    """A imagem não pôde ser lida ou não mostra um cão ou gato."""


def modelo_disponivel() -> bool:
    return ARQUIVO_MODELO.exists()


def _carregar_sessao():
    global _sessao
    if _sessao is None:
        if not ARQUIVO_MODELO.exists():
            raise ModeloIndisponivel(
                "A sugestão pela foto ainda não está ativa neste servidor. "
                "Rode 'python -m app.ia.baixar_modelo' na pasta backend."
            )
        try:
            import onnxruntime as ort
        except ImportError as erro:
            raise ModeloIndisponivel("Instale as dependências: pip install -r requirements.txt") from erro
        _sessao = ort.InferenceSession(str(ARQUIVO_MODELO), providers=["CPUExecutionProvider"])
    return _sessao


def _preparar(conteudo: bytes) -> np.ndarray:
    from PIL import Image, UnidentifiedImageError

    try:
        imagem = Image.open(io.BytesIO(conteudo)).convert("RGB")
    except (UnidentifiedImageError, OSError) as erro:
        raise FotoInvalida("Não foi possível ler a imagem enviada.") from erro

    # redimensiona o lado menor para 256 e recorta o centro 224×224 (padrão do ImageNet)
    largura, altura = imagem.size
    escala = 256 / min(largura, altura)
    imagem = imagem.resize((max(224, round(largura * escala)), max(224, round(altura * escala))), Image.BILINEAR)
    largura, altura = imagem.size
    esquerda, topo = (largura - 224) // 2, (altura - 224) // 2
    imagem = imagem.crop((esquerda, topo, esquerda + 224, topo + 224))

    matriz = np.asarray(imagem, dtype=np.float32).transpose(2, 0, 1) / 255.0
    return ((matriz - _MEDIA) / _DESVIO)[np.newaxis, ...].astype(np.float32)


def _softmax(valores: np.ndarray) -> np.ndarray:
    valores = valores - valores.max()
    exp = np.exp(valores)
    return exp / exp.sum()


def interpretar(prob: np.ndarray) -> dict:
    """Transforma as 1.000 probabilidades do ImageNet em espécie, raça e porte."""
    p_cao = float(sum(prob[i] for i in CAES))
    p_gato = float(sum(prob[i] for i in GATOS))
    if max(p_cao, p_gato) < LIMIAR_ANIMAL:
        raise FotoInvalida("Não identificamos um cão ou gato nesta foto. Preencha os campos manualmente.")

    especie = "cao" if p_cao >= p_gato else "gato"
    p_especie = p_cao if especie == "cao" else p_gato

    # junta classes que viram o mesmo nome em português
    por_raca = {}
    if especie == "cao":
        for i, (nome, _) in CAES.items():
            por_raca[nome] = por_raca.get(nome, 0.0) + float(prob[i])
    else:
        for i, nome in GATOS.items():
            nome = "SRD" if nome.startswith("SRD") else nome
            por_raca[nome] = por_raca.get(nome, 0.0) + float(prob[i])
    ranking = sorted(por_raca.items(), key=lambda par: par[1], reverse=True)
    raca, p_raca = ranking[0]
    conf_raca = p_raca / p_especie
    alternativas = [nome for nome, _ in ranking[1:3]]
    if conf_raca < LIMIAR_RACA and raca != "SRD":
        alternativas = [raca] + alternativas[:1]
        raca, conf_raca = "SRD", 1.0 - conf_raca

    if especie == "cao":
        portes = {"pequeno": 0.0, "medio": 0.0, "grande": 0.0}
        for i, (_, porte) in CAES.items():
            portes[porte] += float(prob[i])
        porte = max(portes, key=portes.get)
        conf_porte = portes[porte] / p_cao
    else:
        porte, conf_porte = "pequeno", 0.95

    return {
        "especie": {"valor": especie, "confianca": round(p_especie / (p_cao + p_gato), 3)},
        "raca": {"valor": raca, "confianca": round(conf_raca, 3), "alternativas": alternativas},
        "porte": {"valor": porte, "confianca": round(conf_porte, 3)},
    }


def classificar(conteudo: bytes) -> dict:
    """Roda a rede na foto e devolve a sugestão no formato do contrato da API."""
    sessao = _carregar_sessao()
    entrada = _preparar(conteudo)
    inicio = time.perf_counter()
    saida = sessao.run(None, {sessao.get_inputs()[0].name: entrada})[0][0]
    tempo_ms = (time.perf_counter() - inicio) * 1000
    resultado = interpretar(_softmax(saida))
    resultado["tempoMs"] = round(tempo_ms, 1)
    resultado["modelo"] = NOME_MODELO
    return resultado
