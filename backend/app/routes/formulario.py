from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text

from app.database import engine
from app.security import obter_usuario_id_token


router = APIRouter(
    prefix="/api/formulario",
    tags=["Formulário"]
)


class FormularioRequest(BaseModel):
    tipoMoradia: str
    temQuintal: bool
    telaProtecao: bool
    pessoasCasa: int
    temCriancas: bool
    outrosAnimais: bool
    horasSozinho: int
    experiencia: str
    nivelAtividade: str
    motivacao: str


def montar_formulario(formulario):
    if not formulario:
        return None

    return {
        "usuarioId": formulario["usuario_id"],
        "tipoMoradia": formulario["tipo_moradia"],
        "temQuintal": bool(formulario["tem_quintal"]),
        "telaProtecao": bool(formulario["tela_protecao"]),
        "pessoasCasa": formulario["pessoas_casa"],
        "temCriancas": bool(formulario["tem_criancas"]),
        "outrosAnimais": bool(formulario["outros_animais"]),
        "horasSozinho": formulario["horas_sozinho"],
        "experiencia": formulario["experiencia"],
        "nivelAtividade": formulario["nivel_atividade"],
        "motivacao": formulario["motivacao"],
        "criadoEm": formulario["criado_em"].isoformat(),
        "atualizadoEm": formulario["atualizado_em"].isoformat()
    }


@router.get("")
def obter_formulario(
    usuario_id: int = Depends(obter_usuario_id_token)
):
    with engine.connect() as conexao:
        formulario = conexao.execute(
            text("""
                SELECT *
                FROM formulario_avaliacao
                WHERE usuario_id = :usuario_id
                LIMIT 1
            """),
            {"usuario_id": usuario_id}
        ).mappings().first()

    return montar_formulario(formulario)


@router.put("")
def salvar_formulario(
    dados: FormularioRequest,
    usuario_id: int = Depends(obter_usuario_id_token)
):
    if dados.tipoMoradia not in ["casa", "apartamento"]:
        raise HTTPException(
            status_code=400,
            detail="Tipo de moradia inválido."
        )

    if dados.pessoasCasa < 1 or dados.pessoasCasa > 20:
        raise HTTPException(
            status_code=400,
            detail="Quantidade de pessoas deve estar entre 1 e 20."
        )

    if dados.horasSozinho < 0 or dados.horasSozinho > 24:
        raise HTTPException(
            status_code=400,
            detail="Horas sozinho deve estar entre 0 e 24."
        )

    if dados.experiencia not in ["nenhuma", "alguma", "muita"]:
        raise HTTPException(
            status_code=400,
            detail="Experiência inválida."
        )

    if dados.nivelAtividade not in ["baixo", "medio", "alto"]:
        raise HTTPException(
            status_code=400,
            detail="Nível de atividade inválido."
        )

    if len(dados.motivacao.strip()) < 20:
        raise HTTPException(
            status_code=400,
            detail="A motivação deve possuir pelo menos 20 caracteres."
        )

    with engine.begin() as conexao:

        usuario = conexao.execute(
            text("""
                SELECT perfil
                FROM usuario
                WHERE id = :usuario_id
                LIMIT 1
            """),
            {"usuario_id": usuario_id}
        ).mappings().first()

        if not usuario or usuario["perfil"] != "adotante":
            raise HTTPException(
                status_code=403,
                detail="Apenas adotantes podem preencher o formulário."
            )

        conexao.execute(
            text("""
                INSERT INTO formulario_avaliacao (
                    usuario_id,
                    tipo_moradia,
                    tem_quintal,
                    tela_protecao,
                    pessoas_casa,
                    tem_criancas,
                    outros_animais,
                    horas_sozinho,
                    experiencia,
                    nivel_atividade,
                    motivacao
                )
                VALUES (
                    :usuario_id,
                    :tipo_moradia,
                    :tem_quintal,
                    :tela_protecao,
                    :pessoas_casa,
                    :tem_criancas,
                    :outros_animais,
                    :horas_sozinho,
                    :experiencia,
                    :nivel_atividade,
                    :motivacao
                )
                ON DUPLICATE KEY UPDATE
                    tipo_moradia = VALUES(tipo_moradia),
                    tem_quintal = VALUES(tem_quintal),
                    tela_protecao = VALUES(tela_protecao),
                    pessoas_casa = VALUES(pessoas_casa),
                    tem_criancas = VALUES(tem_criancas),
                    outros_animais = VALUES(outros_animais),
                    horas_sozinho = VALUES(horas_sozinho),
                    experiencia = VALUES(experiencia),
                    nivel_atividade = VALUES(nivel_atividade),
                    motivacao = VALUES(motivacao)
            """),
            {
                "usuario_id": usuario_id,
                "tipo_moradia": dados.tipoMoradia,
                "tem_quintal": dados.temQuintal,
                "tela_protecao": dados.telaProtecao,
                "pessoas_casa": dados.pessoasCasa,
                "tem_criancas": dados.temCriancas,
                "outros_animais": dados.outrosAnimais,
                "horas_sozinho": dados.horasSozinho,
                "experiencia": dados.experiencia,
                "nivel_atividade": dados.nivelAtividade,
                "motivacao": dados.motivacao.strip()
            }
        )

        formulario = conexao.execute(
            text("""
                SELECT *
                FROM formulario_avaliacao
                WHERE usuario_id = :usuario_id
            """),
            {"usuario_id": usuario_id}
        ).mappings().first()

    return montar_formulario(formulario)