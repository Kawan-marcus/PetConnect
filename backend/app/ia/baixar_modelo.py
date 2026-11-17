"""
Baixa o modelo de visão usado na sugestão pela foto (RF23).

Uso (dentro da pasta backend, com o ambiente virtual ativo):
    python -m app.ia.baixar_modelo

O arquivo (~14 MB) vem do repositório oficial de modelos ONNX no GitHub
(github.com/onnx/models) e é conferido pelo SHA-256 antes de ser salvo em
backend/app/ia/modelos/. Só precisa ser feito uma vez.
"""

import hashlib
import sys
import urllib.request

from app.ia.visao import ARQUIVO_MODELO

URL = (
    "https://media.githubusercontent.com/media/onnx/models/main/"
    "validated/vision/classification/mobilenet/model/mobilenetv2-12.onnx"
)
SHA256 = "c0c3f76d93fa3fd6580652a45618618a220fced18babf65774ed169de0432ad5"


def main():
    if ARQUIVO_MODELO.exists() and hashlib.sha256(ARQUIVO_MODELO.read_bytes()).hexdigest() == SHA256:
        print(f"O modelo já está baixado em {ARQUIVO_MODELO}")
        return
    ARQUIVO_MODELO.parent.mkdir(parents=True, exist_ok=True)
    print("Baixando o modelo MobileNetV2 (≈14 MB)...")
    with urllib.request.urlopen(URL, timeout=120) as resposta:
        dados = resposta.read()
    if hashlib.sha256(dados).hexdigest() != SHA256:
        sys.exit("O arquivo baixado não confere com o esperado. Tente de novo.")
    ARQUIVO_MODELO.write_bytes(dados)
    print(f"Pronto: {ARQUIVO_MODELO}")


if __name__ == "__main__":
    main()
