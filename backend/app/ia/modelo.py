"""
Modelo de compatibilidade.

Entrada do modelo: os 6 fatores (0 a 1) + o pior fator (um único fator muito ruim,
como "animal não convive com crianças" numa casa com crianças, pesa mais que a média).

Dois tipos de modelo, ambos calculados da mesma forma em Python, NumPy e OpenCL:
    "logistico"  -> modelo TREINADO (regressão logística, scikit-learn).
                    score = 100 × probabilidade de a adoção dar certo
                          = 100 / (1 + e^-(b + w1·f1 + ... + w6·f6 + w7·pior))
    "ponderado"  -> regra antiga com pesos fixos (simulacao-python-v1). Usada só se
                    o arquivo do modelo treinado não existir.

O modelo treinado fica em app/ia/modelo_compatibilidade.json (gerado por
`python -m app.ia.treinar`). Trocar o modelo = treinar de novo; a API lê o arquivo
novo sem mudar código.
"""

import json
import math
import os
from pathlib import Path

import numpy as np

from app.ia.fatores import FATORES, N_FATORES

ARQUIVO_MODELO = Path(os.getenv("IA_MODELO", Path(__file__).with_name("modelo_compatibilidade.json")))

# Regra antiga (Sprint 05): pesos fixos, sem treino.
MODELO_REGRA = {
    "versao": "simulacao-python-v1",
    "tipo": "ponderado",
    "algoritmo": "Regra ponderada (pesos fixos)",
    "coeficientes": [0.22, 0.20, 0.18, 0.15, 0.13, 0.12, 0.0],
    "intercepto": 0.0,
    "importancia": [0.22, 0.20, 0.18, 0.15, 0.13, 0.12],
}

TIPOS = {"logistico": 0, "ponderado": 1}


class Modelo:
    def __init__(self, dados):
        self.dados = dados
        self.versao = dados["versao"]
        self.tipo = dados.get("tipo", "logistico")
        self.algoritmo = dados.get("algoritmo", "")
        self.coef = np.array(dados["coeficientes"], dtype=np.float64)  # 7 valores
        self.intercepto = float(dados.get("intercepto", 0.0))
        importancia = dados.get("importancia") or list(np.abs(self.coef[:N_FATORES]))
        total = sum(importancia) or 1.0
        # "peso" mostrado na tela para cada fator (soma 1)
        self.importancia = [round(float(v) / total, 2) for v in importancia]

    # -- parâmetros para o kernel OpenCL: 7 pesos + intercepto, e o tipo (0 ou 1)
    def parametros_kernel(self):
        return np.array(list(self.coef) + [self.intercepto], dtype=np.float32), TIPOS[self.tipo]

    # -- um par (Python puro): usado na versão sequencial e na tela de detalhe
    def pontuar_python(self, f):
        pior = min(f)
        if self.tipo == "ponderado":
            bruto = sum(p * v for p, v in zip(self.coef[:N_FATORES], f))
            return 100.0 * bruto * (0.7 + 0.3 * pior)
        z = self.intercepto + sum(w * v for w, v in zip(self.coef[:N_FATORES], f)) + self.coef[N_FATORES] * pior
        return 100.0 / (1.0 + math.exp(-z))

    # -- muitos pares de uma vez (NumPy): F tem formato (..., 6)
    def pontuar_numpy(self, F):
        F = np.asarray(F, dtype=np.float32)
        pior = F.min(axis=-1)
        w = self.coef.astype(np.float32)
        if self.tipo == "ponderado":
            return 100.0 * (F @ w[:N_FATORES]) * (0.7 + 0.3 * pior)
        z = self.intercepto + F @ w[:N_FATORES] + w[N_FATORES] * pior
        return 100.0 / (1.0 + np.exp(-z))

    def explicar(self, f, descrever):
        """Monta a lista de fatores no formato que o front espera."""
        return [
            {
                "chave": chave,
                "nome": nome,
                "peso": self.importancia[i],
                "valor": round(float(f[i]), 2),
                "descricao": descrever(chave, f[i]),
            }
            for i, (chave, nome) in enumerate(FATORES)
        ]


_cache = {"modelo": None, "mtime": None}


def carregar_modelo():
    """
    Devolve o modelo em uso. Lê o arquivo treinado; se ele mudar (novo treino),
    recarrega sozinho. Sem arquivo, usa a regra antiga para a API nunca parar.
    """
    try:
        mtime = ARQUIVO_MODELO.stat().st_mtime
    except OSError:
        mtime = None

    if _cache["modelo"] is None or _cache["mtime"] != mtime:
        if mtime is None:
            _cache["modelo"] = Modelo(MODELO_REGRA)
        else:
            with open(ARQUIVO_MODELO, encoding="utf-8") as arquivo:
                _cache["modelo"] = Modelo(json.load(arquivo))
        _cache["mtime"] = mtime
    return _cache["modelo"]
