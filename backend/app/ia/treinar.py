"""
Treina o modelo de compatibilidade (regressão logística, scikit-learn).

Como rodar (na pasta backend, com o venv ativado):
    python -m app.ia.treinar                 # treina, mostra as métricas e salva o modelo
    python -m app.ia.treinar --registrar     # também registra a versão em modelo_ia e ativa
    python -m app.ia.treinar --sem-banco     # treina só com dados simulados (sem MySQL)

DE ONDE VÊM OS DADOS
1. Casos reais do sistema (view vw_dataset_treino): adoção concluída = deu certo (1),
   solicitação recusada = não deu certo (0). Cada caso real vale por PESO_REAL simulados.
2. Histórico simulado: ainda há poucas adoções reais, então o script gera perfis de
   adotantes e animais e simula o resultado da adoção a partir de critérios usados por
   ONGs (rotina, espaço, crianças, outros animais…), com ruído aleatório. Esses dados
   ficam guardados em amostra_treino (opção --salvar-amostras) para o treino ser repetível.

O QUE O MODELO APRENDE
Entradas: os 6 fatores de fatores.py + o pior fator. Saída: probabilidade de a adoção
dar certo. O score mostrado na tela é essa probabilidade × 100, e o "peso" de cada
fator na tela é a importância aprendida pelo modelo.
"""

import argparse
import json
from datetime import datetime

import numpy as np

from app.ia.codificacao import COLUNAS_ADOTANTE, COLUNAS_ANIMAL
from app.ia.fatores import FATORES, N_FATORES, fatores_numpy
from app.ia.modelo import ARQUIVO_MODELO, MODELO_REGRA, Modelo

PESO_REAL = 5          # um caso real conta como 5 simulados
SEMENTE = 2026

# "Verdade" usada só para SIMULAR o histórico (o modelo não vê estes números;
# ele tem que descobri-los a partir dos exemplos).
_SIMULACAO = {"intercepto": -10.3, "pesos": [2.2, 1.5, 2.8, 2.4, 1.7, 1.1], "pior": 2.6, "ruido": 0.8}


def gerar_perfis(qtd, rng):
    """Adotantes (qtd × 9) e animais (qtd × 6) sorteados com distribuições plausíveis."""
    adotantes = np.column_stack([
        rng.random(qtd) < 0.45,                 # apartamento
        rng.random(qtd) < 0.55,                 # quintal
        rng.random(qtd) < 0.5,                  # tela de proteção
        rng.integers(1, 6, qtd),                # pessoas
        rng.random(qtd) < 0.4,                  # crianças
        rng.random(qtd) < 0.4,                  # outros animais
        rng.integers(0, 13, qtd),               # horas sozinho
        rng.integers(0, 3, qtd),                # experiência
        rng.integers(0, 3, qtd),                # atividade
    ]).astype(np.float32)
    gato = rng.random(qtd) < 0.45
    porte = np.where(gato, rng.choice([0, 0, 0, 1], qtd), rng.integers(0, 3, qtd))
    animais = np.column_stack([
        gato, porte,
        rng.integers(0, 3, qtd),                # energia
        rng.integers(1, 181, qtd),              # idade (meses)
        rng.random(qtd) < 0.7,                  # convive com crianças
        rng.random(qtd) < 0.6,                  # convive com animais
    ]).astype(np.float32)
    return adotantes, animais


def _fatores_pares_rapido(adotantes, animais):
    """Fatores de cada par (adotante i com animal i) -> (qtd × 6), em blocos para economizar memória."""
    saida = np.empty((len(adotantes), N_FATORES), dtype=np.float32)
    bloco = 1000
    for ini in range(0, len(adotantes), bloco):
        fim = ini + bloco
        F = fatores_numpy(adotantes[ini:fim], animais[ini:fim])
        idx = np.arange(F.shape[0])
        saida[ini:fim] = F[idx, idx]
    return saida


def entradas_do_modelo(F):
    """6 fatores + pior fator -> matriz (qtd × 7)."""
    return np.column_stack([F, F.min(axis=1)])


def simular_resultado(F, rng):
    s = _SIMULACAO
    z = s["intercepto"] + F @ np.array(s["pesos"]) + s["pior"] * F.min(axis=1) + rng.normal(0, s["ruido"], len(F))
    return (rng.random(len(F)) < 1 / (1 + np.exp(-z))).astype(int)


def carregar_casos_reais():
    """Casos reais (do sistema ou importados) da vw_dataset_treino -> (adotantes, animais, rótulos)."""
    from sqlalchemy import text
    from app.database import engine
    with engine.connect() as conexao:
        linhas = conexao.execute(text(
            f"SELECT {', '.join(COLUNAS_ADOTANTE + COLUNAS_ANIMAL)}, rotulo FROM vw_dataset_treino "
            "WHERE origem <> 'sintetico'"   # os simulados já entram pelo gerador
        )).all()
    if not linhas:
        return np.empty((0, 9), np.float32), np.empty((0, 6), np.float32), np.empty(0, int)
    dados = np.array(linhas, dtype=np.float32)
    return dados[:, :9], dados[:, 9:15], dados[:, 15].astype(int)


def salvar_amostras(adotantes, animais, rotulos):
    from sqlalchemy import text
    from app.database import engine
    colunas = COLUNAS_ADOTANTE + COLUNAS_ANIMAL + ("rotulo",)
    linhas = [dict(zip(colunas, map(int, list(a) + list(b) + [r]))) for a, b, r in zip(adotantes, animais, rotulos)]
    with engine.begin() as conexao:
        conexao.execute(text("DELETE FROM amostra_treino WHERE origem = 'sintetico'"))
        conexao.execute(
            text(f"INSERT INTO amostra_treino (origem, {', '.join(colunas)}) VALUES ('sintetico', {', '.join(':' + c for c in colunas)})"),
            linhas,
        )


def proxima_versao(usar_banco):
    if not usar_banco:
        return "compat-logreg-v1"
    from sqlalchemy import text
    from app.database import engine
    try:
        with engine.connect() as conexao:
            qtd = conexao.execute(text("SELECT COUNT(*) FROM modelo_ia WHERE versao LIKE 'compat-logreg-v%'")).scalar()
    except Exception:  # banco sem a tabela modelo_ia (script 05 não rodado)
        return "compat-logreg-v1"
    return f"compat-logreg-v{qtd + 1}"


def registrar_no_banco(modelo_json):
    from sqlalchemy import text
    from app.database import engine
    with engine.begin() as conexao:
        conexao.execute(text("UPDATE modelo_ia SET ativo = FALSE WHERE tipo = 'compatibilidade' AND ativo"))
        conexao.execute(
            text("""
                INSERT INTO modelo_ia (tipo, versao, algoritmo, descricao, amostras_treino, metricas, parametros, ativo, treinado_em)
                VALUES ('compatibilidade', :versao, :algoritmo, :descricao, :amostras, :metricas, :parametros, TRUE, :treinado_em)
                ON DUPLICATE KEY UPDATE algoritmo = VALUES(algoritmo), metricas = VALUES(metricas),
                                        parametros = VALUES(parametros), ativo = TRUE, treinado_em = VALUES(treinado_em)
            """),
            {
                "versao": modelo_json["versao"],
                "algoritmo": modelo_json["algoritmo"],
                "descricao": modelo_json["descricao"],
                "amostras": modelo_json["amostras_treino"],
                "metricas": json.dumps(modelo_json["metricas"]),
                "parametros": json.dumps({"coeficientes": modelo_json["coeficientes"], "intercepto": modelo_json["intercepto"]}),
                "treinado_em": modelo_json["treinado_em"].replace("T", " ")[:19],
            },
        )


def main():
    parser = argparse.ArgumentParser(description="Treina o modelo de compatibilidade do PetConnect.")
    parser.add_argument("--amostras", type=int, default=20000, help="quantidade de casos simulados (padrão 20000)")
    parser.add_argument("--sem-banco", action="store_true", help="não usa o MySQL (só dados simulados)")
    parser.add_argument("--registrar", action="store_true", help="registra a versão em modelo_ia e ativa")
    parser.add_argument("--salvar-amostras", action="store_true", help="guarda os casos simulados em amostra_treino")
    args = parser.parse_args()

    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score
    from sklearn.model_selection import train_test_split

    rng = np.random.default_rng(SEMENTE)
    usar_banco = not args.sem_banco

    # 1. Dados simulados
    adotantes, animais = gerar_perfis(args.amostras, rng)
    F_sim = _fatores_pares_rapido(adotantes, animais)
    y_sim = simular_resultado(F_sim, rng)
    print(f"Casos simulados: {len(y_sim)} ({y_sim.mean():.0%} com adoção bem-sucedida)")
    if usar_banco and args.salvar_amostras:
        salvar_amostras(adotantes, animais, y_sim)
        print("Casos simulados guardados em amostra_treino.")

    # 2. Casos reais do sistema
    F_real, y_real = np.empty((0, N_FATORES), np.float32), np.empty(0, int)
    if usar_banco:
        try:
            a_real, b_real, y_real = carregar_casos_reais()
            if len(y_real):
                F_real = _fatores_pares_rapido(a_real, b_real)
            print(f"Casos reais (vw_dataset_treino): {len(y_real)}")
        except Exception as erro:
            print(f"Aviso: não foi possível ler vw_dataset_treino ({erro}). Seguindo só com dados simulados.")
            y_real = np.empty(0, int)

    X = entradas_do_modelo(np.vstack([F_sim, F_real]))
    y = np.concatenate([y_sim, y_real])
    pesos = np.concatenate([np.ones(len(y_sim)), np.full(len(y_real), PESO_REAL)])

    # 3. Treino (80%) e teste (20%)
    X_tr, X_te, y_tr, y_te, w_tr, _ = train_test_split(X, y, pesos, test_size=0.2, random_state=SEMENTE, stratify=y)
    clf = LogisticRegression(max_iter=1000)
    clf.fit(X_tr, y_tr, sample_weight=w_tr)

    prob = clf.predict_proba(X_te)[:, 1]
    pred = (prob >= 0.5).astype(int)
    # Comparação com a regra antiga de pesos fixos (mesmos casos de teste)
    regra = Modelo(MODELO_REGRA)
    auc_regra = roc_auc_score(y_te, regra.pontuar_numpy(X_te[:, :N_FATORES]))
    metricas = {
        "acuracia": round(accuracy_score(y_te, pred), 4),
        "precisao": round(precision_score(y_te, pred), 4),
        "recall": round(recall_score(y_te, pred), 4),
        "f1": round(f1_score(y_te, pred), 4),
        "auc": round(roc_auc_score(y_te, prob), 4),
        "auc_regra_antiga": round(float(auc_regra), 4),
        "casos_teste": int(len(y_te)),
        "casos_reais": int(len(y_real)),
    }

    coef = [round(float(c), 6) for c in clf.coef_[0]]
    importancia = [abs(c) for c in coef[:N_FATORES]]
    total = sum(importancia)
    modelo_json = {
        "versao": proxima_versao(usar_banco),
        "tipo": "logistico",
        "algoritmo": "Regressão logística (scikit-learn)",
        "descricao": "Probabilidade de a adoção dar certo a partir dos 6 fatores de compatibilidade e do pior fator.",
        "entradas": [chave for chave, _ in FATORES] + ["pior_fator"],
        "coeficientes": coef,
        "intercepto": round(float(clf.intercept_[0]), 6),
        "importancia": [round(v / total, 4) for v in importancia],
        "amostras_treino": int(len(y_tr)),
        "metricas": metricas,
        "treinado_em": datetime.now().isoformat(timespec="seconds"),
    }

    with open(ARQUIVO_MODELO, "w", encoding="utf-8") as arquivo:
        json.dump(modelo_json, arquivo, ensure_ascii=False, indent=2)

    print(f"\nModelo {modelo_json['versao']} salvo em {ARQUIVO_MODELO}")
    print("Métricas no conjunto de teste:")
    for nome, valor in metricas.items():
        print(f"  {nome:18} {valor}")
    print("Importância aprendida de cada fator:")
    for (chave, nome), imp in zip(FATORES, modelo_json["importancia"]):
        print(f"  {nome:38} {imp:.0%}")

    if args.registrar and usar_banco:
        registrar_no_banco(modelo_json)
        print(f"Versão {modelo_json['versao']} registrada em modelo_ia como ATIVA.")


if __name__ == "__main__":
    main()
