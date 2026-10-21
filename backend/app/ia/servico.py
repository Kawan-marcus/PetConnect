"""
Funções do módulo 3 usadas pelas rotas da API.

    avaliar(...)          -> compatibilidade de um adotante com um animal (score + fatores)
    recomendar(...)       -> ranking de todos os animais disponíveis, calculado em lote (OpenCL)
    salvar_analise(...)   -> grava a análise em analise_compatibilidade (integração com o módulo 2)
"""

import json
import time

import numpy as np
from sqlalchemy import bindparam, text

from app.ia.codificacao import codificar_adotante, codificar_animal, matriz_animais
from app.ia.fatores import descrever, fatores_python
from app.ia.modelo import carregar_modelo
from app.ia.opencl import pontuar_lote

# Animais que aparecem na plataforma (mesma regra da vw_animal_publico)
SQL_ANIMAIS_PUBLICOS = """
    SELECT a.*, o.nome AS ong_nome, o.cidade AS ong_cidade, o.telefone AS ong_telefone
    FROM animal a
    JOIN ong o ON o.id = a.ong_id
    WHERE a.excluido_em IS NULL
      AND a.status = 'disponivel'
      AND o.status = 'aprovada'
"""


def avaliar(formulario, animal):
    """Score (0–100) + os 6 fatores explicados, no formato do contrato da API."""
    modelo = carregar_modelo()
    f = fatores_python(codificar_adotante(formulario), codificar_animal(animal))
    return {
        "score": int(round(modelo.pontuar_python(f))),
        "fatores": modelo.explicar(f, descrever),
        "modelo": modelo.versao,
    }


def _animal_json(animal, fotos):
    return {
        "id": animal["id"],
        "ongId": animal["ong_id"],
        "nome": animal["nome"],
        "especie": animal["especie"],
        "raca": animal["raca"],
        "porte": animal["porte"],
        "sexo": animal["sexo"],
        "idadeMeses": animal["idade_meses"],
        "energia": animal["energia"],
        "castrado": bool(animal["castrado"]),
        "vacinado": bool(animal["vacinado"]),
        "convivenciaCriancas": bool(animal["convivencia_criancas"]),
        "convivenciaAnimais": bool(animal["convivencia_animais"]),
        "descricao": animal["descricao"],
        "status": animal["status"],
        "fotos": fotos,
        "ong": {
            "id": animal["ong_id"],
            "nome": animal["ong_nome"],
            "cidade": animal["ong_cidade"],
            "telefone": animal["ong_telefone"],
        },
    }


def recomendar(conexao, usuario_id, limite=9):
    """
    Calcula o score do adotante contra TODOS os animais disponíveis de uma vez
    (OpenCL na GPU, ou NumPy se não houver) e devolve os mais compatíveis.
    """
    modelo = carregar_modelo()
    formulario = conexao.execute(
        text("SELECT * FROM formulario_avaliacao WHERE usuario_id = :u"), {"u": usuario_id}
    ).mappings().first()
    if not formulario:
        return {"semFormulario": True, "itens": [], "processados": 0, "tempoMs": 0, "modelo": modelo.versao}

    animais = conexao.execute(text(SQL_ANIMAIS_PUBLICOS)).mappings().all()
    if not animais:
        return {"semFormulario": False, "itens": [], "processados": 0, "tempoMs": 0, "modelo": modelo.versao}

    A = np.array([codificar_adotante(formulario)], dtype=np.float32)
    B = matriz_animais(animais)
    scores, info = pontuar_lote(A, B, modelo)          # 1 × n, em paralelo

    # Os mais compatíveis primeiro (empate: o mais novo na plataforma)
    ordem = sorted(range(len(animais)), key=lambda j: (-float(scores[0, j]), -animais[j]["id"]))[:limite]
    escolhidos = [animais[j] for j in ordem]

    # Fotos só dos escolhidos (uma consulta só)
    fotos = {}
    if escolhidos:
        linhas = conexao.execute(
            text("SELECT animal_id, url FROM foto_animal WHERE animal_id IN :ids ORDER BY animal_id, ordem")
            .bindparams(bindparam("ids", expanding=True)),
            {"ids": [a["id"] for a in escolhidos]},
        ).all()
        for animal_id, url in linhas:
            fotos.setdefault(animal_id, []).append(url)

    itens = []
    for animal in escolhidos:
        resultado = avaliar(formulario, animal)   # fatores explicados + score exato
        itens.append({
            "animal": _animal_json(animal, fotos.get(animal["id"], [])),
            "score": resultado["score"],
            "fatores": resultado["fatores"],
        })

    return {
        "semFormulario": False,
        "itens": itens,
        "processados": len(animais),
        "tempoMs": info["tempo_ms"],
        "modelo": modelo.versao,
        "motor": info["motor"],
        "dispositivo": info["dispositivo"],
    }


# ---------------------------------------------------------------------------
# Gravação no banco (tabelas da Sprint 06). Se o script 05 ainda não foi rodado,
# estas funções simplesmente não gravam, e a API continua funcionando.
# ---------------------------------------------------------------------------

_existe = {}


def existe(conexao, tabela, coluna=None):
    chave = (tabela, coluna)
    if chave not in _existe:
        if coluna is None:
            sql = "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = :t"
            parametros = {"t": tabela}
        else:
            sql = ("SELECT COUNT(*) FROM information_schema.columns "
                   "WHERE table_schema = DATABASE() AND table_name = :t AND column_name = :c")
            parametros = {"t": tabela, "c": coluna}
        _existe[chave] = bool(conexao.execute(text(sql), parametros).scalar())
    return _existe[chave]


_registrados = set()


def garantir_modelo_registrado(conexao):
    """Garante que a versão em uso está em modelo_ia e é a ativa (Sprint 06)."""
    modelo = carregar_modelo()
    if modelo.versao in _registrados or not existe(conexao, "modelo_ia"):
        return
    linha = conexao.execute(
        text("SELECT id, ativo FROM modelo_ia WHERE versao = :v"), {"v": modelo.versao}
    ).mappings().first()
    if not linha:
        conexao.execute(text("UPDATE modelo_ia SET ativo = FALSE WHERE tipo = 'compatibilidade' AND ativo"))
        d = modelo.dados
        conexao.execute(
            text("""
                INSERT INTO modelo_ia (tipo, versao, algoritmo, descricao, amostras_treino, metricas, parametros, ativo, treinado_em)
                VALUES ('compatibilidade', :versao, :algoritmo, :descricao, :amostras, :metricas, :parametros, TRUE, :treinado_em)
            """),
            {
                "versao": modelo.versao,
                "algoritmo": modelo.algoritmo,
                "descricao": d.get("descricao"),
                "amostras": d.get("amostras_treino"),
                "metricas": json.dumps(d.get("metricas")) if d.get("metricas") else None,
                "parametros": json.dumps({"coeficientes": d["coeficientes"], "intercepto": d.get("intercepto", 0)}),
                "treinado_em": (d.get("treinado_em") or "").replace("T", " ")[:19] or None,
            },
        )
    elif not linha["ativo"]:
        conexao.execute(text("UPDATE modelo_ia SET ativo = FALSE WHERE tipo = 'compatibilidade' AND ativo"))
        conexao.execute(text("UPDATE modelo_ia SET ativo = TRUE WHERE id = :id"), {"id": linha["id"]})
    _registrados.add(modelo.versao)


def salvar_analise(conexao, usuario_id, animal_id, resultado, tempo_ms=None):
    """Grava a análise e devolve o id (ou None se a tabela não existir)."""
    if not existe(conexao, "analise_compatibilidade"):
        return None
    garantir_modelo_registrado(conexao)
    res = conexao.execute(
        text("""
            INSERT INTO analise_compatibilidade (usuario_id, animal_id, score, fatores, modelo, tempo_ms)
            VALUES (:u, :a, :s, :f, :m, :t)
        """),
        {
            "u": usuario_id, "a": animal_id, "s": resultado["score"],
            "f": json.dumps(resultado["fatores"], ensure_ascii=False),
            "m": resultado["modelo"], "t": tempo_ms,
        },
    )
    return res.lastrowid


def avaliar_e_salvar(conexao, usuario_id, formulario, animal):
    """Avalia, grava a análise e devolve (resultado, analise_id)."""
    inicio = time.perf_counter()
    resultado = avaliar(formulario, animal)
    tempo_ms = round((time.perf_counter() - inicio) * 1000, 3)
    return resultado, salvar_analise(conexao, usuario_id, animal["id"], resultado, tempo_ms)
