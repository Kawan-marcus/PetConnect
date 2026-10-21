"""
Logs do sistema (Sprint 06): tabela log_acao do banco.

- Mudanças de status (solicitação, animal, ONG, conta) são gravadas pelos triggers
  do MySQL (database/05_sprint06_modulo3.sql). Para o trigger saber QUEM fez a
  alteração, a rota chama definir_usuario_logado() na mesma transação.
- O que o banco não enxerga (login, login com senha errada) é gravado aqui com
  registrar_log().

Se o script 05 ainda não foi rodado, nada disso quebra a API: só não grava.
Os logs também saem no terminal do uvicorn (módulo logging do Python).
"""

import json
import logging

from sqlalchemy import text

logger = logging.getLogger("petconnect")
if not logger.handlers:
    _saida = logging.StreamHandler()
    _saida.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
    logger.addHandler(_saida)
    logger.setLevel(logging.INFO)

_tem_tabela_log = {}


def _tem_log(conexao):
    if "ok" not in _tem_tabela_log:
        _tem_tabela_log["ok"] = bool(conexao.execute(text(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'log_acao'"
        )).scalar())
    return _tem_tabela_log["ok"]


def definir_usuario_logado(conexao, usuario_id):
    """Informa ao MySQL quem está fazendo a alteração (lido pelos triggers de log)."""
    conexao.execute(text("SET @app_usuario_id = :id"), {"id": usuario_id})


def registrar_log(conexao, usuario_id, acao, entidade, entidade_id=None, detalhes=None, ip=None):
    """Grava uma linha em log_acao. Nunca derruba a requisição se der erro."""
    logger.info("%s | usuário %s | %s %s | %s", acao, usuario_id, entidade, entidade_id, detalhes or "")
    try:
        if not _tem_log(conexao):
            return
        conexao.execute(
            text("""
                INSERT INTO log_acao (usuario_id, acao, entidade, entidade_id, detalhes, origem, ip)
                VALUES (:usuario_id, :acao, :entidade, :entidade_id, :detalhes, 'backend', :ip)
            """),
            {
                "usuario_id": usuario_id,
                "acao": acao,
                "entidade": entidade,
                "entidade_id": entidade_id,
                "detalhes": json.dumps(detalhes, ensure_ascii=False) if detalhes else None,
                "ip": ip,
            },
        )
    except Exception as erro:  # log nunca pode impedir o uso do sistema
        logger.warning("Não foi possível gravar o log %s: %s", acao, erro)
