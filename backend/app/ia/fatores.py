"""
Os 6 fatores de compatibilidade (cada um vai de 0 a 1).

As mesmas contas existem em três versões, que precisam dar o mesmo resultado:
    fatores_python  -> um par adotante × animal por vez (versão SEQUENCIAL do benchmark)
    fatores_numpy   -> todos os pares de uma vez com NumPy (vetorizado, na CPU)
    opencl.py       -> o kernel em C que roda em paralelo na GPU (um par por thread)

Índices dos vetores (ver codificacao.py):
    adotante: 0 apartamento, 1 quintal, 2 tela, 3 pessoas, 4 criancas, 5 outros_animais,
              6 horas_sozinho, 7 experiencia, 8 atividade
    animal:   0 gato, 1 porte, 2 energia, 3 idade_meses, 4 convive_criancas, 5 convive_animais
"""

import numpy as np

# Ordem fixa dos fatores (mesma ordem do kernel OpenCL e do modelo)
FATORES = (
    ("espaco",      "Espaço da moradia"),
    ("energia",     "Nível de energia × estilo de vida"),
    ("rotina",      "Tempo que o animal ficaria sozinho"),
    ("criancas",    "Convivência com crianças"),
    ("animais",     "Convivência com outros animais"),
    ("experiencia", "Experiência do adotante"),
)
N_FATORES = len(FATORES)


def _limitar(v):
    return 0.0 if v < 0.0 else 1.0 if v > 1.0 else v


def fatores_python(a, b):
    """Calcula os 6 fatores de UM adotante (a) com UM animal (b). Puro Python, sem NumPy."""
    apartamento, quintal, tela, _pessoas, criancas, outros, horas, experiencia, atividade = a
    gato, porte, energia, idade, conv_criancas, conv_animais = b

    # 1. Espaço: porte do animal × tipo de moradia, quintal e tela de proteção
    espaco = 1.0
    if apartamento:
        espaco -= porte * 0.3
    if not quintal:
        espaco -= porte * 0.12
    if gato and apartamento and not tela:
        espaco -= 0.45

    # 2. Energia: diferença entre o ritmo do adotante e a energia do animal
    ritmo = 1.0 - abs(atividade - energia) * 0.42

    # 3. Rotina: horas sozinho × quanto o animal tolera (filhotes e agitados toleram menos)
    tolerancia = 10.0 if gato else 6.0
    if idade < 12:
        tolerancia -= 2.0
    if energia == 2:
        tolerancia -= 1.0
    rotina = 1.0 - max(0.0, horas - tolerancia) * 0.14

    # 4 e 5. Convivência com crianças e com outros animais
    f_criancas = 1.0 if not criancas else (1.0 if conv_criancas else 0.2)
    f_animais = 1.0 if not outros else (1.0 if conv_animais else 0.25)

    # 6. Experiência: o quanto o animal exige × a experiência informada
    exigencia = (1.0 if idade < 12 else 0.0) + (1.0 if energia == 2 else 0.0) + (0.5 if porte == 2 else 0.0)
    f_experiencia = 1.0 - max(0.0, exigencia - experiencia) * 0.3

    return (
        _limitar(espaco), _limitar(ritmo), _limitar(rotina),
        _limitar(f_criancas), _limitar(f_animais), _limitar(f_experiencia),
    )


def fatores_numpy(A, B):
    """
    Calcula os fatores de TODOS os pares de uma vez.
    A: matriz (m × 9) de adotantes, B: matriz (n × 6) de animais.
    Devolve um array (m × n × 6).
    """
    A = np.asarray(A, dtype=np.float32)
    B = np.asarray(B, dtype=np.float32)
    # Colunas com formato (m × 1) e (1 × n): o NumPy combina todos os pares (broadcast)
    ap, quintal, tela = A[:, 0:1], A[:, 1:2], A[:, 2:3]
    criancas, outros, horas = A[:, 4:5], A[:, 5:6], A[:, 6:7]
    experiencia, atividade = A[:, 7:8], A[:, 8:9]
    gato, porte, energia = B[None, :, 0], B[None, :, 1], B[None, :, 2]
    idade, conv_c, conv_a = B[None, :, 3], B[None, :, 4], B[None, :, 5]

    espaco = (1.0 - ap * porte * 0.3 - (1.0 - quintal) * porte * 0.12
              - gato * ap * (1.0 - tela) * 0.45)
    ritmo = 1.0 - np.abs(atividade - energia) * 0.42
    tolerancia = np.where(gato > 0, 10.0, 6.0) - np.where(idade < 12, 2.0, 0.0) - np.where(energia == 2, 1.0, 0.0)
    rotina = 1.0 - np.maximum(0.0, horas - tolerancia) * 0.14
    f_criancas = np.where(criancas > 0, np.where(conv_c > 0, 1.0, 0.2), 1.0)
    f_animais = np.where(outros > 0, np.where(conv_a > 0, 1.0, 0.25), 1.0)
    exigencia = np.where(idade < 12, 1.0, 0.0) + np.where(energia == 2, 1.0, 0.0) + np.where(porte == 2, 0.5, 0.0)
    f_experiencia = 1.0 - np.maximum(0.0, exigencia - experiencia) * 0.3

    m, n = A.shape[0], B.shape[0]
    pilha = [np.broadcast_to(f, (m, n)) for f in (espaco, ritmo, rotina, f_criancas, f_animais, f_experiencia)]
    return np.clip(np.stack(pilha, axis=-1), 0.0, 1.0).astype(np.float32)


def descrever(chave, valor):
    """Frase curta que explica o fator para o usuário (aparece na tela)."""
    bom, medio = valor >= 0.75, valor >= 0.45
    textos = {
        "espaco": ("A moradia comporta bem o porte do animal.", "Espaço um pouco limitado para o porte.",
                   "Moradia pouco adequada ao porte ou sem proteção."),
        "energia": ("Ritmo do adotante combina com a energia do animal.", "Diferença moderada de ritmo.",
                    "Energia do animal destoa bastante da rotina do adotante."),
        "rotina": ("Tempo sozinho dentro do tolerável.", "O animal ficaria sozinho por bastante tempo.",
                   "Tempo sozinho excessivo para este animal."),
        "criancas": ("Sem conflito com crianças.", "O animal não tem histórico de convivência com crianças.",
                     "O animal não tem histórico de convivência com crianças."),
        "animais": ("Sem conflito com outros animais.", "O animal não convive bem com outros animais.",
                    "O animal não convive bem com outros animais."),
        "experiencia": ("Experiência compatível com as necessidades do animal.",
                        "Animal exige mais experiência do que a informada.",
                        "Animal exige mais experiência do que a informada."),
    }
    bom_txt, medio_txt, ruim_txt = textos[chave]
    return bom_txt if bom else medio_txt if medio else ruim_txt
