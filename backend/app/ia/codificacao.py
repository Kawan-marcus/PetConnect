"""
Codificação das variáveis: texto do banco -> números.

A mesma regra é usada pelas views vw_features_animal e vw_features_adotante
(database/05_sprint06_modulo3.sql), então tanto faz ler das tabelas ou das views.

Vetor do ADOTANTE (9 posições, nesta ordem):
    apartamento, tem_quintal, tela_protecao, pessoas_casa, tem_criancas,
    outros_animais, horas_sozinho, experiencia_cod, atividade_cod

Vetor do ANIMAL (6 posições, nesta ordem):
    gato, porte_cod, energia_cod, idade_meses, convive_criancas, convive_animais
"""

import numpy as np

COLUNAS_ADOTANTE = (
    "apartamento", "tem_quintal", "tela_protecao", "pessoas_casa", "tem_criancas",
    "outros_animais", "horas_sozinho", "experiencia_cod", "atividade_cod",
)
COLUNAS_ANIMAL = (
    "gato", "porte_cod", "energia_cod", "idade_meses", "convive_criancas", "convive_animais",
)

_NIVEL_3 = {
    # porte do animal
    "pequeno": 0, "medio": 1, "grande": 2,
    # energia do animal
    "baixa": 0, "media": 1, "alta": 2,
    # atividade do adotante
    "baixo": 0, "alto": 2,
    # experiência do adotante
    "nenhuma": 0, "alguma": 1, "muita": 2,
}


def _nivel(valor):
    """Converte 'pequeno'/'media'/'muita'... (ou um número já codificado) em 0, 1 ou 2."""
    if valor is None:
        return 0
    if isinstance(valor, (int, float)):
        return int(valor)
    return _NIVEL_3.get(str(valor), 0)


def _bool(valor):
    return 1 if valor else 0


def codificar_adotante(linha):
    """
    Recebe uma linha do formulario_avaliacao (ou da vw_features_adotante)
    e devolve o vetor do adotante como tupla de 9 números.
    """
    if "apartamento" in linha:  # já veio da view, codificado
        return tuple(float(linha[c]) for c in COLUNAS_ADOTANTE)

    return (
        float(1 if linha["tipo_moradia"] == "apartamento" else 0),
        float(_bool(linha["tem_quintal"])),
        float(_bool(linha["tela_protecao"])),
        float(linha["pessoas_casa"] or 1),
        float(_bool(linha["tem_criancas"])),
        float(_bool(linha["outros_animais"])),
        float(linha["horas_sozinho"] or 0),
        float(_nivel(linha["experiencia"])),
        float(_nivel(linha["nivel_atividade"])),
    )


def codificar_animal(linha):
    """
    Recebe uma linha da tabela animal (ou da vw_features_animal)
    e devolve o vetor do animal como tupla de 6 números.
    """
    if "gato" in linha:  # já veio da view, codificado
        return tuple(float(linha[c]) for c in COLUNAS_ANIMAL)

    return (
        float(1 if linha["especie"] == "gato" else 0),
        float(_nivel(linha["porte"])),
        float(_nivel(linha["energia"])),
        float(linha["idade_meses"]),
        float(_bool(linha["convivencia_criancas"])),
        float(_bool(linha["convivencia_animais"])),
    )


def matriz_adotantes(linhas):
    """Lista de linhas -> matriz float32 (m × 9), pronta para NumPy/OpenCL."""
    return np.array([codificar_adotante(l) for l in linhas], dtype=np.float32).reshape(-1, len(COLUNAS_ADOTANTE))


def matriz_animais(linhas):
    """Lista de linhas -> matriz float32 (n × 6), pronta para NumPy/OpenCL."""
    return np.array([codificar_animal(l) for l in linhas], dtype=np.float32).reshape(-1, len(COLUNAS_ANIMAL))
