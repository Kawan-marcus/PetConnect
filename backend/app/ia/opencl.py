"""
Cálculo em lote com OpenCL (processamento paralelo na GPU).

Cada par adotante × animal vira uma "thread" na GPU: com 10.000 animais, as
10.000 contas acontecem ao mesmo tempo em vez de uma por vez.

O kernel (código em C abaixo) faz exatamente as mesmas contas de fatores.py e
modelo.py. Se o computador não tiver OpenCL (ou o pyopencl não estiver instalado),
o sistema usa NumPy na CPU, com o mesmo resultado; a API nunca deixa de responder.

Variável de ambiente IA_MOTOR (arquivo .env do backend):
    auto   -> usa OpenCL se houver; senão NumPy (padrão)
    opencl -> exige OpenCL (dá erro se não houver)
    numpy  -> nunca usa OpenCL
"""

import os
import time

import numpy as np

from app.ia.fatores import fatores_numpy, fatores_python

KERNEL = r"""
// Um work-item = um par (adotante i, animal j).
// A: adotantes (m x 9), B: animais (n x 6), coef: 7 pesos + intercepto
// tipo 0 = modelo treinado (logístico), 1 = regra ponderada antiga
__kernel void pontuar(__global const float *A,
                      __global const float *B,
                      __constant float *coef,
                      const int tipo,
                      const int n,
                      __global float *saida)
{
    const int j = get_global_id(0);   // animal
    const int i = get_global_id(1);   // adotante
    if (j >= n) return;

    const __global float *a = A + i * 9;
    const __global float *b = B + j * 6;

    const float ap = a[0], quintal = a[1], tela = a[2];
    const float criancas = a[4], outros = a[5], horas = a[6];
    const float experiencia = a[7], atividade = a[8];
    const float gato = b[0], porte = b[1], energia = b[2];
    const float idade = b[3], conv_c = b[4], conv_a = b[5];

    float f[6];
    // 1. espaço
    f[0] = 1.0f - ap * porte * 0.3f - (1.0f - quintal) * porte * 0.12f - gato * ap * (1.0f - tela) * 0.45f;
    // 2. energia x estilo de vida
    f[1] = 1.0f - fabs(atividade - energia) * 0.42f;
    // 3. rotina (tempo sozinho)
    float tolerancia = (gato > 0.0f ? 10.0f : 6.0f) - (idade < 12.0f ? 2.0f : 0.0f) - (energia == 2.0f ? 1.0f : 0.0f);
    f[2] = 1.0f - fmax(0.0f, horas - tolerancia) * 0.14f;
    // 4 e 5. convivência
    f[3] = criancas > 0.0f ? (conv_c > 0.0f ? 1.0f : 0.2f) : 1.0f;
    f[4] = outros > 0.0f ? (conv_a > 0.0f ? 1.0f : 0.25f) : 1.0f;
    // 6. experiência
    float exigencia = (idade < 12.0f ? 1.0f : 0.0f) + (energia == 2.0f ? 1.0f : 0.0f) + (porte == 2.0f ? 0.5f : 0.0f);
    f[5] = 1.0f - fmax(0.0f, exigencia - experiencia) * 0.3f;

    float pior = 1.0f, soma = 0.0f;
    for (int k = 0; k < 6; k++) {
        f[k] = fmin(1.0f, fmax(0.0f, f[k]));
        pior = fmin(pior, f[k]);
        soma += coef[k] * f[k];
    }

    float score;
    if (tipo == 0) {
        float z = coef[7] + soma + coef[6] * pior;
        score = 100.0f / (1.0f + exp(-z));
    } else {
        score = 100.0f * soma * (0.7f + 0.3f * pior);
    }
    saida[i * n + j] = score;
}
"""


class _MotorOpenCL:
    """Guarda o contexto, a fila e o programa compilado (compilar é lento: faz uma vez só)."""

    def __init__(self):
        import pyopencl as cl  # import aqui: o back funciona mesmo sem pyopencl instalado

        dispositivo = None
        for plataforma in cl.get_platforms():           # prefere GPU
            gpus = plataforma.get_devices(device_type=cl.device_type.GPU)
            if gpus:
                dispositivo = gpus[0]
                break
        if dispositivo is None:                         # senão, qualquer dispositivo OpenCL
            for plataforma in cl.get_platforms():
                if plataforma.get_devices():
                    dispositivo = plataforma.get_devices()[0]
                    break
        if dispositivo is None:
            raise RuntimeError("Nenhum dispositivo OpenCL encontrado.")

        self.cl = cl
        self.ctx = cl.Context([dispositivo])
        self.fila = cl.CommandQueue(self.ctx)
        self.programa = cl.Program(self.ctx, KERNEL).build()
        self.kernel = cl.Kernel(self.programa, "pontuar")
        self.nome = f"{dispositivo.name.strip()} ({dispositivo.version.strip()})"

    def pontuar(self, A, B, coef, tipo):
        cl, mf = self.cl, self.cl.mem_flags
        m, n = A.shape[0], B.shape[0]
        saida = np.empty(m * n, dtype=np.float32)
        buf_a = cl.Buffer(self.ctx, mf.READ_ONLY | mf.COPY_HOST_PTR, hostbuf=np.ascontiguousarray(A, dtype=np.float32))
        buf_b = cl.Buffer(self.ctx, mf.READ_ONLY | mf.COPY_HOST_PTR, hostbuf=np.ascontiguousarray(B, dtype=np.float32))
        buf_c = cl.Buffer(self.ctx, mf.READ_ONLY | mf.COPY_HOST_PTR, hostbuf=np.ascontiguousarray(coef, dtype=np.float32))
        buf_s = cl.Buffer(self.ctx, mf.WRITE_ONLY, saida.nbytes)
        self.kernel.set_args(buf_a, buf_b, buf_c, np.int32(tipo), np.int32(n), buf_s)
        cl.enqueue_nd_range_kernel(self.fila, self.kernel, (n, m), None)
        cl.enqueue_copy(self.fila, saida, buf_s)
        self.fila.finish()
        return saida.reshape(m, n)


_estado = {"motor": None, "erro": None, "tentou": False}


def motor_opencl():
    """Devolve o motor OpenCL pronto, ou None se não houver OpenCL nesta máquina."""
    preferencia = os.getenv("IA_MOTOR", "auto").lower()
    if preferencia == "numpy":
        return None
    if not _estado["tentou"]:
        _estado["tentou"] = True
        try:
            _estado["motor"] = _MotorOpenCL()
        except Exception as erro:  # sem pyopencl, sem driver ou sem dispositivo
            _estado["erro"] = f"{type(erro).__name__}: {erro}"
    if _estado["motor"] is None and preferencia == "opencl":
        raise RuntimeError(f"OpenCL exigido (IA_MOTOR=opencl), mas indisponível: {_estado['erro']}")
    return _estado["motor"]


def descricao_motor():
    motor = motor_opencl()
    if motor:
        return {"motor": "opencl", "dispositivo": motor.nome}
    motivo = _estado["erro"] or "desativado em IA_MOTOR"
    return {"motor": "numpy", "dispositivo": f"CPU (NumPy) — OpenCL indisponível: {motivo}"}


# ---------------------------------------------------------------------------
# As três formas de calcular o score de todos os pares (m adotantes × n animais)
# ---------------------------------------------------------------------------

def pontuar_sequencial(A, B, modelo):
    """Versão SEQUENCIAL: um par por vez, em Python puro (base do comparativo)."""
    A_l, B_l = np.asarray(A).tolist(), np.asarray(B).tolist()
    saida = np.empty((len(A_l), len(B_l)), dtype=np.float32)
    for i, a in enumerate(A_l):
        for j, b in enumerate(B_l):
            saida[i, j] = modelo.pontuar_python(fatores_python(a, b))
    return saida


def pontuar_numpy(A, B, modelo):
    """Versão vetorizada na CPU com NumPy."""
    return modelo.pontuar_numpy(fatores_numpy(A, B)).astype(np.float32)


def pontuar_opencl(A, B, modelo):
    """Versão paralela na GPU. Levanta erro se não houver OpenCL."""
    motor = motor_opencl()
    if motor is None:
        raise RuntimeError("OpenCL indisponível nesta máquina.")
    coef, tipo = modelo.parametros_kernel()
    return motor.pontuar(np.asarray(A, dtype=np.float32), np.asarray(B, dtype=np.float32), coef, tipo)


def pontuar_lote(A, B, modelo):
    """
    Usado pela API: OpenCL quando houver, senão NumPy.
    Devolve (scores m×n, {"motor", "dispositivo", "tempo_ms"}).
    """
    inicio = time.perf_counter()
    if motor_opencl() is not None:
        scores = pontuar_opencl(A, B, modelo)
    else:
        scores = pontuar_numpy(A, B, modelo)
    info = descricao_motor()
    info["tempo_ms"] = round((time.perf_counter() - inicio) * 1000, 3)
    return scores, info
