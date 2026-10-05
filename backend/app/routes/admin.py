from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text

from app.database import engine
from app.security import obter_usuario_id_token
from app.routes.solicitacoes import buscar_historicos, criar_notificacao


router = APIRouter(
    prefix="/api/admin",
    tags=["Administração"]
)


# =========================================================
# MODELOS
# =========================================================

class AtualizarUsuarioRequest(BaseModel):
    ativo: bool


class AlterarStatusOngRequest(BaseModel):
    status: str


STATUS_ONG = ("pendente", "aprovada", "suspensa")

MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]


# =========================================================
# CONTROLE DE PERFIL: só administrador
# =========================================================

def exigir_admin(conexao, usuario_id: int):
    usuario = conexao.execute(
        text("SELECT id, perfil, ativo FROM usuario WHERE id = :usuario_id"),
        {"usuario_id": usuario_id}
    ).mappings().first()

    if not usuario or not usuario["ativo"]:
        raise HTTPException(status_code=401, detail="Sessão inválida. Faça login novamente.")

    if usuario["perfil"] != "admin":
        raise HTTPException(status_code=403, detail="Apenas o administrador pode acessar esta área.")

    return usuario


def iso(valor):
    return valor.isoformat() if valor else None


# =========================================================
# GET /api/admin/usuarios?perfil=&busca=   (RF17)
# =========================================================

@router.get("/usuarios")
def listar_usuarios(
    perfil: str | None = None,
    busca: str | None = None,
    usuario_id: int = Depends(obter_usuario_id_token)
):
    filtros = ["1 = 1"]
    parametros = {}

    if perfil:
        filtros.append("perfil = :perfil")
        parametros["perfil"] = perfil

    if busca:
        filtros.append("(nome LIKE :busca OR email LIKE :busca)")
        parametros["busca"] = f"%{busca}%"

    with engine.connect() as conexao:
        exigir_admin(conexao, usuario_id)

        usuarios = conexao.execute(
            text(f"""
                SELECT id, nome, email, perfil, telefone, cidade, ativo, ong_id, criado_em
                FROM usuario
                WHERE {" AND ".join(filtros)}
                ORDER BY criado_em DESC
            """),
            parametros
        ).mappings().all()

    return [
        {
            "id": u["id"],
            "nome": u["nome"],
            "email": u["email"],
            "perfil": u["perfil"],
            "telefone": u["telefone"],
            "cidade": u["cidade"],
            "ativo": bool(u["ativo"]),
            "ongId": u["ong_id"],
            "criadoEm": iso(u["criado_em"])
        }
        for u in usuarios
    ]


# =========================================================
# PATCH /api/admin/usuarios/{id}   { ativo }   (RF17)
# O admin desativa em vez de apagar, para não perder o histórico.
# =========================================================

@router.patch("/usuarios/{alvo_id}")
def atualizar_usuario(
    alvo_id: int,
    dados: AtualizarUsuarioRequest,
    usuario_id: int = Depends(obter_usuario_id_token)
):
    with engine.begin() as conexao:
        exigir_admin(conexao, usuario_id)

        if alvo_id == usuario_id and not dados.ativo:
            raise HTTPException(status_code=409, detail="Você não pode desativar a sua própria conta.")

        resultado = conexao.execute(
            text("UPDATE usuario SET ativo = :ativo WHERE id = :alvo_id"),
            {"ativo": dados.ativo, "alvo_id": alvo_id}
        )

        if resultado.rowcount == 0:
            existe = conexao.execute(
                text("SELECT id FROM usuario WHERE id = :alvo_id"), {"alvo_id": alvo_id}
            ).first()
            if not existe:
                raise HTTPException(status_code=404, detail="Usuário não encontrado.")

        u = conexao.execute(
            text("""
                SELECT id, nome, email, perfil, telefone, cidade, ativo, ong_id, criado_em
                FROM usuario WHERE id = :alvo_id
            """),
            {"alvo_id": alvo_id}
        ).mappings().first()

    return {
        "id": u["id"],
        "nome": u["nome"],
        "email": u["email"],
        "perfil": u["perfil"],
        "telefone": u["telefone"],
        "cidade": u["cidade"],
        "ativo": bool(u["ativo"]),
        "ongId": u["ong_id"],
        "criadoEm": iso(u["criado_em"])
    }


# =========================================================
# GET /api/admin/ongs?status=   (RF18)
# =========================================================

@router.get("/ongs")
def listar_ongs(
    status: str | None = None,
    usuario_id: int = Depends(obter_usuario_id_token)
):
    parametros = {}
    where = ""

    if status:
        where = "WHERE o.status = :status"
        parametros["status"] = status

    with engine.connect() as conexao:
        exigir_admin(conexao, usuario_id)

        ongs = conexao.execute(
            text(f"""
                SELECT
                    o.id, o.nome, o.cnpj, o.email, o.telefone, o.cidade,
                    o.descricao, o.status, o.criado_em,
                    (SELECT COUNT(*) FROM animal a
                      WHERE a.ong_id = o.id AND a.excluido_em IS NULL) AS total_animais,
                    (SELECT COUNT(*) FROM solicitacao s
                       JOIN animal a ON a.id = s.animal_id
                      WHERE a.ong_id = o.id AND s.status = 'concluida') AS total_adocoes
                FROM ong o
                {where}
                ORDER BY o.criado_em DESC
            """),
            parametros
        ).mappings().all()

    return [
        {
            "id": o["id"],
            "nome": o["nome"],
            "cnpj": o["cnpj"],
            "email": o["email"],
            "telefone": o["telefone"],
            "cidade": o["cidade"],
            "descricao": o["descricao"],
            "status": o["status"],
            "criadoEm": iso(o["criado_em"]),
            "totalAnimais": o["total_animais"],
            "totalAdocoes": o["total_adocoes"]
        }
        for o in ongs
    ]


# =========================================================
# PATCH /api/admin/ongs/{id}/status   { status }   (RF18 + RN04)
# =========================================================

@router.patch("/ongs/{ong_id}/status")
def alterar_status_ong(
    ong_id: int,
    dados: AlterarStatusOngRequest,
    usuario_id: int = Depends(obter_usuario_id_token)
):
    if dados.status not in STATUS_ONG:
        raise HTTPException(status_code=400, detail="Status inválido. Use: pendente, aprovada ou suspensa.")

    with engine.begin() as conexao:
        exigir_admin(conexao, usuario_id)

        ong = conexao.execute(
            text("SELECT id, nome, status FROM ong WHERE id = :ong_id"), {"ong_id": ong_id}
        ).mappings().first()

        if not ong:
            raise HTTPException(status_code=404, detail="ONG não encontrada.")

        conexao.execute(
            text("UPDATE ong SET status = :status WHERE id = :ong_id"),
            {"status": dados.status, "ong_id": ong_id}
        )

        mensagens = {
            "aprovada": "Sua ONG foi aprovada! Você já pode cadastrar animais.",
            "suspensa": "Sua ONG foi suspensa pelo administrador.",
            "pendente": "Sua ONG voltou para análise do administrador."
        }

        membros = conexao.execute(
            text("SELECT id FROM usuario WHERE ong_id = :ong_id"), {"ong_id": ong_id}
        ).scalars().all()

        for membro_id in membros:
            criar_notificacao(conexao, membro_id, mensagens[dados.status], "/ong")

        atualizada = conexao.execute(
            text("SELECT * FROM ong WHERE id = :ong_id"), {"ong_id": ong_id}
        ).mappings().first()

    return {
        "id": atualizada["id"],
        "nome": atualizada["nome"],
        "cnpj": atualizada["cnpj"],
        "email": atualizada["email"],
        "telefone": atualizada["telefone"],
        "cidade": atualizada["cidade"],
        "descricao": atualizada["descricao"],
        "status": atualizada["status"],
        "criadoEm": iso(atualizada["criado_em"])
    }


# =========================================================
# GET /api/admin/animais?status=&especie=   (RF19)
# =========================================================

@router.get("/animais")
def listar_todos_animais(
    status: str | None = None,
    especie: str | None = None,
    usuario_id: int = Depends(obter_usuario_id_token)
):
    filtros = ["a.excluido_em IS NULL"]
    parametros = {}

    if status:
        filtros.append("a.status = :status")
        parametros["status"] = status

    if especie:
        filtros.append("a.especie = :especie")
        parametros["especie"] = especie

    with engine.connect() as conexao:
        exigir_admin(conexao, usuario_id)

        animais = conexao.execute(
            text(f"""
                SELECT
                    a.id, a.ong_id, a.nome, a.especie, a.raca, a.idade_meses, a.sexo,
                    a.porte, a.energia, a.status, a.criado_em,
                    o.nome AS ong_nome, o.cidade AS ong_cidade
                FROM animal a
                JOIN ong o ON o.id = a.ong_id
                WHERE {" AND ".join(filtros)}
                ORDER BY a.criado_em DESC
            """),
            parametros
        ).mappings().all()

        resposta = []

        for a in animais:
            fotos = conexao.execute(
                text("SELECT url FROM foto_animal WHERE animal_id = :animal_id ORDER BY ordem ASC"),
                {"animal_id": a["id"]}
            ).scalars().all()

            resposta.append({
                "id": a["id"],
                "ongId": a["ong_id"],
                "nome": a["nome"],
                "especie": a["especie"],
                "raca": a["raca"],
                "idadeMeses": a["idade_meses"],
                "sexo": a["sexo"],
                "porte": a["porte"],
                "energia": a["energia"],
                "status": a["status"],
                "criadoEm": iso(a["criado_em"]),
                "fotos": list(fotos),
                "ong": {"id": a["ong_id"], "nome": a["ong_nome"], "cidade": a["ong_cidade"]}
            })

    return resposta


# =========================================================
# DELETE /api/admin/animais/{id}   (RF19)
# Exclusão lógica, igual à da ONG: preserva o histórico de adoções.
# =========================================================

@router.delete("/animais/{animal_id}")
def remover_animal(
    animal_id: int,
    usuario_id: int = Depends(obter_usuario_id_token)
):
    with engine.begin() as conexao:
        exigir_admin(conexao, usuario_id)

        animal = conexao.execute(
            text("SELECT id FROM animal WHERE id = :animal_id AND excluido_em IS NULL"),
            {"animal_id": animal_id}
        ).first()

        if not animal:
            raise HTTPException(status_code=404, detail="Animal não encontrado.")

        em_andamento = conexao.execute(
            text("""
                SELECT COUNT(*) FROM solicitacao
                WHERE animal_id = :animal_id
                  AND status IN ('pendente', 'em_analise', 'aprovada')
            """),
            {"animal_id": animal_id}
        ).scalar()

        if em_andamento:
            raise HTTPException(
                status_code=409,
                detail="Não é possível remover um animal com solicitações em andamento."
            )

        conexao.execute(
            text("UPDATE animal SET excluido_em = NOW() WHERE id = :animal_id"),
            {"animal_id": animal_id}
        )

    return {"ok": True}


# =========================================================
# GET /api/admin/solicitacoes   (RF16: histórico completo)
# =========================================================

@router.get("/solicitacoes")
def listar_todas_solicitacoes(
    usuario_id: int = Depends(obter_usuario_id_token)
):
    with engine.connect() as conexao:
        exigir_admin(conexao, usuario_id)

        linhas = conexao.execute(
            text("""
                SELECT
                    s.id, s.animal_id, s.usuario_id, s.status, s.score, s.criado_em,
                    a.nome AS animal_nome, a.ong_id,
                    u.nome AS usuario_nome,
                    o.nome AS ong_nome
                FROM solicitacao s
                JOIN animal a ON a.id = s.animal_id
                JOIN usuario u ON u.id = s.usuario_id
                JOIN ong o ON o.id = a.ong_id
                ORDER BY s.criado_em DESC
            """)
        ).mappings().all()

        historicos = buscar_historicos(conexao, [s["id"] for s in linhas])

    return [
        {
            "id": s["id"],
            "animalId": s["animal_id"],
            "usuarioId": s["usuario_id"],
            "ongId": s["ong_id"],
            "status": s["status"],
            "score": s["score"],
            "criadoEm": iso(s["criado_em"]),
            "animal": {"id": s["animal_id"], "nome": s["animal_nome"]},
            "usuario": {"id": s["usuario_id"], "nome": s["usuario_nome"]},
            "ong": {"id": s["ong_id"], "nome": s["ong_nome"]},
            "historico": historicos.get(s["id"]) or [
                {"status": s["status"], "data": iso(s["criado_em"]), "obs": ""}
            ]
        }
        for s in linhas
    ]


# =========================================================
# GET /api/admin/estatisticas   (dashboard)
# Usa as views criadas em database/02_views.sql
# =========================================================

@router.get("/estatisticas")
def estatisticas(
    usuario_id: int = Depends(obter_usuario_id_token)
):
    with engine.connect() as conexao:
        exigir_admin(conexao, usuario_id)

        t = conexao.execute(text("SELECT * FROM vw_estatisticas_totais")).mappings().first()

        por_mes = {
            linha["mes"]: linha["adocoes"]
            for linha in conexao.execute(text("SELECT mes, adocoes FROM vw_adocoes_por_mes")).mappings()
        }

        por_ong = conexao.execute(
            text("SELECT ong, animais, adocoes FROM vw_adocoes_por_ong WHERE status = 'aprovada' ORDER BY ong")
        ).mappings().all()

    # últimos 6 meses, incluindo os meses sem adoção (valor 0)
    hoje = date.today()
    meses = []
    for i in range(5, -1, -1):
        ano, mes = hoje.year, hoje.month - i
        while mes <= 0:
            mes += 12
            ano -= 1
        chave = f"{ano}-{mes:02d}"
        meses.append({"mes": MESES[mes - 1], "adocoes": int(por_mes.get(chave, 0))})

    return {
        "totais": {
            "animaisDisponiveis": t["animais_disponiveis"],
            "emProcesso": t["em_processo"],
            "adotados": t["adotados"],
            "adotantes": t["adotantes"],
            "ongsAprovadas": t["ongs_aprovadas"],
            "ongsPendentes": t["ongs_pendentes"],
            "solicitacoesAbertas": t["solicitacoes_abertas"]
        },
        "tempoMedioAdocaoDias": int(t["tempo_medio_adocao_dias"]) if t["tempo_medio_adocao_dias"] is not None else None,
        "adocoesPorMes": meses,
        "porOng": [
            {"ong": o["ong"], "animais": o["animais"], "adocoes": o["adocoes"]}
            for o in por_ong
        ]
    }


# =========================================================
# GET /api/admin/desempenho   (comparativo sequencial × OpenCL)
# Lê as medições gravadas pelo módulo de processamento em medicao_desempenho.
# =========================================================

@router.get("/desempenho")
def desempenho(
    usuario_id: int = Depends(obter_usuario_id_token)
):
    with engine.connect() as conexao:
        exigir_admin(conexao, usuario_id)

        # a medição mais recente de cada tarefa
        medicoes = conexao.execute(
            text("""
                SELECT m.tarefa, m.tamanho_entrada, m.sequencial_ms, m.opencl_ms, m.dispositivo, m.medido_em
                FROM medicao_desempenho m
                JOIN (
                    SELECT tarefa, MAX(id) AS ultimo_id
                    FROM medicao_desempenho
                    GROUP BY tarefa
                ) ult ON ult.ultimo_id = m.id
                ORDER BY m.tarefa
            """)
        ).mappings().all()

    if not medicoes:
        return {
            "exemplo": False,
            "dispositivo": "Nenhuma medição registrada ainda (tabela medicao_desempenho vazia).",
            "medicoes": []
        }

    return {
        "exemplo": False,
        "dispositivo": medicoes[0]["dispositivo"],
        "medicoes": [
            {
                "tarefa": f'{m["tarefa"]} ({m["tamanho_entrada"]:,} itens)'.replace(",", "."),
                "sequencialMs": float(m["sequencial_ms"]),
                "openclMs": float(m["opencl_ms"])
            }
            for m in medicoes
        ]
    }
