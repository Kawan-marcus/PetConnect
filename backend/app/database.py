import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import URL

load_dotenv()

DATABASE_URL = URL.create(
    drivername="mysql+pymysql",
    username=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    host=os.getenv("DB_HOST", "localhost"),
    port=int(os.getenv("DB_PORT", "3306")),
    database=os.getenv("DB_NAME", "petconnect"),
    query={"charset": "utf8mb4"},
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)


@event.listens_for(engine, "checkout")
def _limpar_usuario_logado(conexao_dbapi, registro, proxy):
    """
    As conexões são reaproveitadas entre requisições. Zera a variável usada
    pelos triggers de log para um pedido nunca herdar o usuário de outro.
    """
    cursor = conexao_dbapi.cursor()
    cursor.execute("SET @app_usuario_id = NULL")
    cursor.close()


def testar_conexao():
    with engine.connect() as conexao:
        resultado = conexao.execute(
            text("SELECT DATABASE()")
        )
        return resultado.scalar()