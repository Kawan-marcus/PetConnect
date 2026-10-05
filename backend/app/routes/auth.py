from fastapi import APIRouter, HTTPException, Depends



from pydantic import BaseModel



from sqlalchemy import text







from app.database import engine



from app.security import (



    verificar_senha,



    gerar_hash_senha,



    gerar_token,



    obter_usuario_id_token



)











router = APIRouter(



    prefix="/api/auth",



    tags=["Autenticação"]



)











# =========================================================



# MODELOS



# =========================================================







class LoginRequest(BaseModel):



    email: str



    senha: str











class AtualizarPerfilRequest(BaseModel):

    nome: str

    telefone: str | None = None

    cidade: str | None = None

    senha: str | None = None





class CadastroAdotanteRequest(BaseModel):



    nome: str



    email: str



    senha: str



    telefone: str | None = None



    cidade: str | None = None











class CadastroOngRequest(BaseModel):



    nomeOng: str



    nomeResponsavel: str



    cnpj: str



    descricao: str | None = None



    email: str



    telefone: str



    cidade: str



    senha: str











# =========================================================



# LOGIN



# =========================================================







@router.post("/login")



def login(dados: LoginRequest):







    email = dados.email.strip().lower()







    with engine.connect() as conexao:







        usuario = conexao.execute(



            text("""



                SELECT



                    u.id,



                    u.nome,



                    u.email,



                    u.senha_hash,



                    u.perfil,



                    u.ativo,



                    u.ong_id,







                    o.nome AS ong_nome,



                    o.cnpj AS ong_cnpj,



                    o.email AS ong_email,



                    o.telefone AS ong_telefone,



                    o.cidade AS ong_cidade,



                    o.descricao AS ong_descricao,



                    o.status AS ong_status







                FROM usuario u







                LEFT JOIN ong o



                    ON o.id = u.ong_id







                WHERE u.email = :email



                LIMIT 1



            """),



            {



                "email": email



            }



        ).mappings().first()







    if not usuario:



        raise HTTPException(



            status_code=401,



            detail="E-mail ou senha inválidos."



        )







    if not usuario["ativo"]:



        raise HTTPException(



            status_code=403,



            detail="Usuário inativo."



        )







    if not verificar_senha(



        dados.senha,



        usuario["senha_hash"]



    ):



        raise HTTPException(



            status_code=401,



            detail="E-mail ou senha inválidos."



        )







    token = gerar_token(usuario["id"])







    usuario_resposta = {



        "id": usuario["id"],



        "nome": usuario["nome"],



        "email": usuario["email"],



        "perfil": usuario["perfil"],



        "ongId": usuario["ong_id"],



        "ong": None



    }







    if usuario["ong_id"]:



        usuario_resposta["ong"] = {



            "id": usuario["ong_id"],



            "nome": usuario["ong_nome"],



            "cnpj": usuario["ong_cnpj"],



            "email": usuario["ong_email"],



            "telefone": usuario["ong_telefone"],



            "cidade": usuario["ong_cidade"],



            "descricao": usuario["ong_descricao"],



            "status": usuario["ong_status"]



        }







    return {



        "token": token,



        "usuario": usuario_resposta



    }











# =========================================================



# USUÁRIO LOGADO



# =========================================================







@router.get("/me")



def obter_me(



    usuario_id: int = Depends(obter_usuario_id_token)



):







    with engine.connect() as conexao:







        usuario = conexao.execute(



            text("""



                SELECT



                    u.id,



                    u.nome,



                    u.email,



                    u.perfil,



                    u.ativo,



                    u.ong_id,







                    o.nome AS ong_nome,



                    o.cnpj AS ong_cnpj,



                    o.email AS ong_email,



                    o.telefone AS ong_telefone,



                    o.cidade AS ong_cidade,



                    o.descricao AS ong_descricao,



                    o.status AS ong_status







                FROM usuario u







                LEFT JOIN ong o



                    ON o.id = u.ong_id







                WHERE u.id = :usuario_id



                LIMIT 1



            """),



            {



                "usuario_id": usuario_id



            }



        ).mappings().first()







    if not usuario:



        raise HTTPException(



            status_code=404,



            detail="Usuário não encontrado."



        )







    if not usuario["ativo"]:



        raise HTTPException(



            status_code=403,



            detail="Usuário inativo."



        )







    resposta = {



        "id": usuario["id"],



        "nome": usuario["nome"],



        "email": usuario["email"],



        "perfil": usuario["perfil"],



        "ongId": usuario["ong_id"],



        "ong": None



    }







    if usuario["ong_id"]:



        resposta["ong"] = {



            "id": usuario["ong_id"],



            "nome": usuario["ong_nome"],



            "cnpj": usuario["ong_cnpj"],



            "email": usuario["ong_email"],



            "telefone": usuario["ong_telefone"],



            "cidade": usuario["ong_cidade"],



            "descricao": usuario["ong_descricao"],



            "status": usuario["ong_status"]



        }







    return resposta











# =========================================================
# ATUALIZAR USUÁRIO LOGADO
# =========================================================

@router.put("/me")
def atualizar_me(
    dados: AtualizarPerfilRequest,
    usuario_id: int = Depends(obter_usuario_id_token)
):
    nome = dados.nome.strip()
    telefone = dados.telefone.strip() if dados.telefone else None
    cidade = dados.cidade.strip() if dados.cidade else None
    senha = dados.senha.strip() if dados.senha else ""

    if len(nome) < 3:
        raise HTTPException(
            status_code=400,
            detail="Nome deve possuir pelo menos 3 caracteres."
        )

    if senha and len(senha) < 6:
        raise HTTPException(
            status_code=400,
            detail="A nova senha deve possuir pelo menos 6 caracteres."
        )

    with engine.begin() as conexao:
        usuario = conexao.execute(
            text("""
                SELECT id, perfil, ativo, ong_id
                FROM usuario
                WHERE id = :usuario_id
                LIMIT 1
            """),
            {"usuario_id": usuario_id}
        ).mappings().first()

        if not usuario:
            raise HTTPException(
                status_code=404,
                detail="Usuário não encontrado."
            )

        if not usuario["ativo"]:
            raise HTTPException(
                status_code=403,
                detail="Usuário inativo."
            )

        parametros = {
            "nome": nome,
            "telefone": telefone,
            "cidade": cidade,
            "usuario_id": usuario_id
        }

        if senha:
            parametros["senha_hash"] = gerar_hash_senha(senha)

            conexao.execute(
                text("""
                    UPDATE usuario
                    SET nome = :nome,
                        telefone = :telefone,
                        cidade = :cidade,
                        senha_hash = :senha_hash
                    WHERE id = :usuario_id
                """),
                parametros
            )
        else:
            conexao.execute(
                text("""
                    UPDATE usuario
                    SET nome = :nome,
                        telefone = :telefone,
                        cidade = :cidade
                    WHERE id = :usuario_id
                """),
                parametros
            )

        atualizado = conexao.execute(
            text("""
                SELECT
                    u.id,
                    u.nome,
                    u.email,
                    u.telefone,
                    u.cidade,
                    u.perfil,
                    u.ativo,
                    u.ong_id,
                    o.nome AS ong_nome,
                    o.cnpj AS ong_cnpj,
                    o.email AS ong_email,
                    o.telefone AS ong_telefone,
                    o.cidade AS ong_cidade,
                    o.descricao AS ong_descricao,
                    o.status AS ong_status
                FROM usuario u
                LEFT JOIN ong o
                    ON o.id = u.ong_id
                WHERE u.id = :usuario_id
                LIMIT 1
            """),
            {"usuario_id": usuario_id}
        ).mappings().first()

    resposta = {
        "id": atualizado["id"],
        "nome": atualizado["nome"],
        "email": atualizado["email"],
        "telefone": atualizado["telefone"],
        "cidade": atualizado["cidade"],
        "perfil": atualizado["perfil"],
        "ativo": bool(atualizado["ativo"]),
        "ongId": atualizado["ong_id"],
        "ong": None
    }

    if atualizado["ong_id"]:
        resposta["ong"] = {
            "id": atualizado["ong_id"],
            "nome": atualizado["ong_nome"],
            "cnpj": atualizado["ong_cnpj"],
            "email": atualizado["ong_email"],
            "telefone": atualizado["ong_telefone"],
            "cidade": atualizado["ong_cidade"],
            "descricao": atualizado["ong_descricao"],
            "status": atualizado["ong_status"]
        }

    return resposta


# =========================================================



# CADASTRO DE ADOTANTE



# =========================================================







@router.post("/cadastro/adotante")



def cadastrar_adotante(dados: CadastroAdotanteRequest):







    nome = dados.nome.strip()



    email = dados.email.strip().lower()



    senha = dados.senha







    if len(nome) < 3:



        raise HTTPException(



            status_code=400,



            detail="Nome deve possuir pelo menos 3 caracteres."



        )







    if "@" not in email:



        raise HTTPException(



            status_code=400,



            detail="E-mail inválido."



        )







    if len(senha) < 6:



        raise HTTPException(



            status_code=400,



            detail="A senha deve possuir pelo menos 6 caracteres."



        )







    with engine.begin() as conexao:







        existente = conexao.execute(



            text("""



                SELECT id



                FROM usuario



                WHERE email = :email



                LIMIT 1



            """),



            {



                "email": email



            }



        ).first()







        if existente:



            raise HTTPException(



                status_code=409,



                detail="Já existe um usuário cadastrado com este e-mail."



            )







        senha_hash = gerar_hash_senha(senha)







        resultado = conexao.execute(



            text("""



                INSERT INTO usuario (



                    nome,



                    email,



                    senha_hash,



                    perfil,



                    telefone,



                    cidade,



                    ativo,



                    ong_id



                )



                VALUES (



                    :nome,



                    :email,



                    :senha_hash,



                    'adotante',



                    :telefone,



                    :cidade,



                    TRUE,



                    NULL



                )



            """),



            {



                "nome": nome,



                "email": email,



                "senha_hash": senha_hash,



                "telefone": dados.telefone,



                "cidade": dados.cidade



            }



        )







        usuario_id = resultado.lastrowid







    token = gerar_token(usuario_id)







    return {



        "token": token,



        "usuario": {



            "id": usuario_id,



            "nome": nome,



            "email": email,



            "perfil": "adotante",



            "telefone": dados.telefone,



            "cidade": dados.cidade,



            "ativo": True,



            "ongId": None,



            "ong": None



        }



    }











# =========================================================



# CADASTRO DE ONG



# =========================================================







@router.post("/cadastro/ong")



def cadastrar_ong(dados: CadastroOngRequest):







    nome_ong = dados.nomeOng.strip()



    nome_responsavel = dados.nomeResponsavel.strip()



    cnpj = dados.cnpj.strip()



    email = dados.email.strip().lower()



    telefone = dados.telefone.strip()



    cidade = dados.cidade.strip()







    descricao = (



        dados.descricao.strip()



        if dados.descricao



        else None



    )







    senha = dados.senha







    # -----------------------------------------------------



    # VALIDAÇÕES



    # -----------------------------------------------------







    if len(nome_ong) < 3:



        raise HTTPException(



            status_code=400,



            detail="Nome da ONG deve possuir pelo menos 3 caracteres."



        )







    if len(nome_responsavel) < 3:



        raise HTTPException(



            status_code=400,



            detail="Informe o nome do responsável pela ONG."



        )







    if "@" not in email:



        raise HTTPException(



            status_code=400,



            detail="E-mail inválido."



        )







    if len(senha) < 6:



        raise HTTPException(



            status_code=400,



            detail="A senha deve possuir pelo menos 6 caracteres."



        )







    if not telefone:



        raise HTTPException(



            status_code=400,



            detail="Informe o telefone da ONG."



        )







    if not cidade:



        raise HTTPException(



            status_code=400,



            detail="Informe a cidade da ONG."



        )







    # -----------------------------------------------------



    # TRANSAÇÃO



    # -----------------------------------------------------







    with engine.begin() as conexao:







        # Verifica e-mail duplicado



        usuario_existente = conexao.execute(



            text("""



                SELECT id



                FROM usuario



                WHERE email = :email



                LIMIT 1



            """),



            {



                "email": email



            }



        ).first()







        if usuario_existente:



            raise HTTPException(



                status_code=409,



                detail="Já existe um usuário cadastrado com este e-mail."



            )







        # Verifica CNPJ duplicado



        ong_existente = conexao.execute(



            text("""



                SELECT id



                FROM ong



                WHERE cnpj = :cnpj



                LIMIT 1



            """),



            {



                "cnpj": cnpj



            }



        ).first()







        if ong_existente:



            raise HTTPException(



                status_code=409,



                detail="Já existe uma ONG cadastrada com este CNPJ."



            )







        # -------------------------------------------------



        # CRIA A ONG



        # -------------------------------------------------







        resultado_ong = conexao.execute(



            text("""



                INSERT INTO ong (



                    nome,



                    cnpj,



                    email,



                    telefone,



                    cidade,



                    descricao,



                    status



                )



                VALUES (



                    :nome,



                    :cnpj,



                    :email,



                    :telefone,



                    :cidade,



                    :descricao,



                    'pendente'



                )



            """),



            {



                "nome": nome_ong,



                "cnpj": cnpj,



                "email": email,



                "telefone": telefone,



                "cidade": cidade,



                "descricao": descricao



            }



        )







        ong_id = resultado_ong.lastrowid







        # -------------------------------------------------



        # CRIA O USUÁRIO RESPONSÁVEL



        # -------------------------------------------------







        senha_hash = gerar_hash_senha(senha)







        resultado_usuario = conexao.execute(



            text("""



                INSERT INTO usuario (



                    nome,



                    email,



                    senha_hash,



                    perfil,



                    telefone,



                    cidade,



                    ativo,



                    ong_id



                )



                VALUES (



                    :nome,



                    :email,



                    :senha_hash,



                    'ong',



                    :telefone,



                    :cidade,



                    TRUE,



                    :ong_id



                )



            """),



            {



                "nome": nome_responsavel,



                "email": email,



                "senha_hash": senha_hash,



                "telefone": telefone,



                "cidade": cidade,



                "ong_id": ong_id



            }



        )







        usuario_id = resultado_usuario.lastrowid







    # -----------------------------------------------------



    # GERA JWT



    # -----------------------------------------------------







    token = gerar_token(usuario_id)







    return {



        "token": token,



        "usuario": {



            "id": usuario_id,



            "nome": nome_responsavel,



            "email": email,



            "perfil": "ong",



            "telefone": telefone,



            "cidade": cidade,



            "ativo": True,



            "ongId": ong_id,







            # Importante para o frontend reconhecer a ONG



            "ong": {



                "id": ong_id,



                "nome": nome_ong,



                "cnpj": cnpj,



                "email": email,



                "telefone": telefone,



                "cidade": cidade,



                "descricao": descricao,



                "status": "pendente"



            }



        },







        "ong": {



            "id": ong_id,



            "nome": nome_ong,



            "cnpj": cnpj,



            "email": email,



            "telefone": telefone,



            "cidade": cidade,



            "descricao": descricao,



            "status": "pendente"



        }



    }