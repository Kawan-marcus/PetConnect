"""
Comparativo de desempenho: sequencial (Python) × NumPy (CPU) × OpenCL (GPU).

Como rodar (na pasta backend, com o venv ativado):
    python -m app.ia.benchmark                       # usa os dados do MySQL e só mostra os tempos
    python -m app.ia.benchmark --registrar           # também grava em medicao_desempenho (painel do admin)
    python -m app.ia.benchmark --sem-banco --animais 10000 --adotantes 50   # dados sorteados

Para ter volume, gere antes a massa de dados no MySQL:
    CALL sp_gerar_massa_dados(10000, 200);      (script database/06_massa_dados.sql)

Tarefas medidas:
    1. Score em lote: 1 adotante × todos os animais      (o que a tela "Recomendados" faz)
    2. Score em lote: vários adotantes × todos os animais (ranking geral da plataforma)

O tempo do OpenCL inclui enviar os dados para a GPU e trazer o resultado de volta.
A compilação do kernel acontece uma vez antes da medição (como na API).
"""

import argparse
import statistics
import time

import numpy as np

from app.ia.codificacao import COLUNAS_ADOTANTE, COLUNAS_ANIMAL
from app.ia.modelo import carregar_modelo
from app.ia.opencl import descricao_motor, motor_opencl, pontuar_numpy, pontuar_opencl, pontuar_sequencial
from app.ia.treinar import gerar_perfis


def medir(funcao, repeticoes):
    """Roda a função algumas vezes e devolve (mediana em ms, último resultado)."""
    tempos, resultado = [], None
    for _ in range(repeticoes):
        inicio = time.perf_counter()
        resultado = funcao()
        tempos.append((time.perf_counter() - inicio) * 1000)
    return statistics.median(tempos), resultado


def carregar_do_banco(max_adotantes):
    from sqlalchemy import text
    from app.database import engine
    with engine.connect() as conexao:
        animais = conexao.execute(text(f"SELECT {', '.join(COLUNAS_ANIMAL)} FROM vw_features_animal")).all()
        adotantes = conexao.execute(
            text(f"SELECT {', '.join(COLUNAS_ADOTANTE)} FROM vw_features_adotante LIMIT :m"), {"m": max_adotantes}
        ).all()
    return np.array(adotantes, dtype=np.float32), np.array(animais, dtype=np.float32)


def registrar(linhas, dispositivo):
    from sqlalchemy import text
    from app.database import engine
    with engine.begin() as conexao:
        for tarefa, tamanho, seq_ms, ocl_ms in linhas:
            conexao.execute(
                text("""
                    INSERT INTO medicao_desempenho (tarefa, tamanho_entrada, sequencial_ms, opencl_ms, dispositivo)
                    VALUES (:tarefa, :tamanho, :seq, :ocl, :dispositivo)
                """),
                {"tarefa": tarefa, "tamanho": tamanho, "seq": round(seq_ms, 3), "ocl": round(ocl_ms, 3),
                 "dispositivo": dispositivo[:160]},
            )


def main():
    parser = argparse.ArgumentParser(description="Comparativo sequencial × OpenCL do PetConnect.")
    parser.add_argument("--sem-banco", action="store_true", help="usa dados sorteados em vez do MySQL")
    parser.add_argument("--animais", type=int, default=10000, help="animais sorteados (com --sem-banco)")
    parser.add_argument("--adotantes", type=int, default=50, help="adotantes na tarefa 2")
    parser.add_argument("--repeticoes", type=int, default=5, help="repetições de NumPy/OpenCL (usa a mediana)")
    parser.add_argument("--registrar", action="store_true", help="grava em medicao_desempenho")
    args = parser.parse_args()

    modelo = carregar_modelo()
    if args.sem_banco:
        rng = np.random.default_rng(7)
        _, B = gerar_perfis(args.animais, rng)
        A, _ = gerar_perfis(args.adotantes, rng)
    else:
        A, B = carregar_do_banco(args.adotantes)
    if len(A) == 0 or len(B) == 0:
        raise SystemExit("Sem dados: rode o script 06_massa_dados.sql ou use --sem-banco.")

    motor = descricao_motor()
    tem_opencl = motor_opencl() is not None
    print(f"Modelo: {modelo.versao} | Animais: {len(B)} | Adotantes (tarefa 2): {len(A)}")
    print(f"Dispositivo: {motor['dispositivo']}\n")

    tarefas = [
        (f"Score em lote (1 adotante × {len(B):,} animais)".replace(",", "."), A[:1]),
        (f"Score em lote ({len(A)} adotantes × {len(B):,} animais)".replace(",", "."), A),
    ]
    para_registrar = []
    print(f"{'Tarefa':52} {'Sequencial':>12} {'NumPy':>10} {'OpenCL':>10} {'Ganho':>8}")
    for nome, A_t in tarefas:
        pares = len(A_t) * len(B)
        rep_seq = 1 if pares > 200_000 else 3
        seq_ms, ref = medir(lambda: pontuar_sequencial(A_t, B, modelo), rep_seq)
        np_ms, res_np = medir(lambda: pontuar_numpy(A_t, B, modelo), args.repeticoes)
        assert np.abs(res_np - ref).max() < 0.01, "NumPy e sequencial deram resultados diferentes!"
        if tem_opencl:
            pontuar_opencl(A_t[:1], B[:8], modelo)   # aquecimento
            ocl_ms, res_ocl = medir(lambda: pontuar_opencl(A_t, B, modelo), args.repeticoes)
            assert np.abs(res_ocl - ref).max() < 0.01, "OpenCL e sequencial deram resultados diferentes!"
            ganho = seq_ms / ocl_ms
            print(f"{nome:52} {seq_ms:10.1f}ms {np_ms:8.1f}ms {ocl_ms:8.1f}ms {ganho:7.1f}×")
            para_registrar.append((nome, pares, seq_ms, ocl_ms))
        else:
            print(f"{nome:52} {seq_ms:10.1f}ms {np_ms:8.1f}ms {'—':>10} {'—':>8}")

    print("\nResultados conferidos: as versões calculam o mesmo score para todos os pares.")
    if not tem_opencl:
        print("OpenCL indisponível nesta máquina: instale um driver OpenCL e o pyopencl (ver backend/README.md).")
    if args.registrar:
        if para_registrar:
            registrar(para_registrar, motor["dispositivo"])
            print("Medições gravadas em medicao_desempenho (aparecem no painel do admin).")
        else:
            print("Nada gravado: sem OpenCL não há medição paralela real para registrar.")


if __name__ == "__main__":
    main()
