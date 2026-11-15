"""
Paginação opcional das listas (Sprint 08).

- Sem `limit` na URL: a rota devolve a lista inteira, como antes. O front, os
  relatórios e o dashboard continuam funcionando sem mudança.
- Com `limit` (1 a 1000) e `offset`: devolve só aquela página.
  Ex.: GET /api/animais?limit=20&offset=40  → animais 41 a 60.
"""

from fastapi import Query

SEM_LIMITE = 1_000_000

LIMIT = Query(default=None, ge=1, le=1000, description="Itens por página (opcional; sem ele vem tudo)")
OFFSET = Query(default=0, ge=0, description="Quantos itens pular")


def limite_sql(limit):
    """Valor usado no LIMIT do SQL: o pedido ou 'sem limite'."""
    return limit if limit else SEM_LIMITE
