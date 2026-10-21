"""
Módulo 3 do PetConnect: inteligência de compatibilidade (Tópicos Avançados).

Organização:
    codificacao.py  -> transforma formulário e animal em vetores de números
    fatores.py      -> os 6 fatores de compatibilidade (Python, NumPy)
    modelo.py       -> modelo treinado (regressão logística) que transforma fatores em score
    opencl.py       -> cálculo em lote na GPU com OpenCL (com reserva em NumPy)
    servico.py      -> funções usadas pelas rotas da API
    treinar.py      -> treina o modelo:            python -m app.ia.treinar
    benchmark.py    -> mede sequencial × OpenCL:   python -m app.ia.benchmark
"""
