# PetConnect: Backend (API)

API em **Python + FastAPI** que liga o front-end (React) ao banco **MySQL**.

- **Autenticação:** senhas com bcrypt e login com token **JWT**.
- **Rotas:** todas começam com `/api` (o Vite do front encaminha `/api` para a porta 8000).
- **Contrato:** formato de cada rota em [`docs/CONTRATO_API.md`](../docs/CONTRATO_API.md).

## Pré-requisitos
- Python 3.11 ou superior ([python.org](https://www.python.org/downloads/); marque **"Add python.exe to PATH"** na instalação).
- MySQL com o banco `petconnect` criado pelos scripts da pasta [`database/`](../database/README.md).

## Como rodar (Windows)

Todos os comandos são executados **dentro da pasta `backend`**.

**1. Configuração (só na primeira vez)**
```bash
copy .env.example .env
```
Abra o `.env` e coloque usuário e senha do **seu** MySQL. Para não usar o `root`, crie um usuário só para o sistema, rodando no MySQL Workbench:
```sql
CREATE USER 'petconnect_app'@'localhost' IDENTIFIED BY 'troque_esta_senha';
GRANT SELECT, INSERT, UPDATE, DELETE ON petconnect.* TO 'petconnect_app'@'localhost';
```

**2. Ambiente e bibliotecas (só na primeira vez)**
```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```
> Se o `activate` der erro de "execução de scripts desabilitada", rode `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` uma vez.

**3. Ligar a API (sempre)**
```bash
venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

**4. Conferir**
- http://localhost:8000/api/health/db → `{"status": "conectado", "banco": "petconnect"}`
- http://localhost:8000/docs → documentação interativa de todas as rotas (Swagger)

## Estrutura
```
backend/
  app/
    main.py          # cria a API e registra as rotas
    database.py      # conexão com o MySQL (lê o .env)
    security.py      # bcrypt + JWT
    routes/
      auth.py            # login, cadastro (adotante/ONG), perfil
      recuperacao.py     # recuperar e redefinir senha
      animais.py         # lista pública, detalhe, edição, status, exclusão lógica
      ong.py             # animais e solicitações da ONG logada
      favoritos.py       # favoritar/desfavoritar
      formulario.py      # formulário de avaliação do adotante
      solicitacoes.py    # fluxo de adoção (RN01–RN05) + histórico
      acompanhamentos.py # pós-adoção
      notificacoes.py    # sino de notificações
      ia.py              # compatibilidade e recomendações
      uploads.py         # envio de fotos
      admin.py           # painel do administrador (usuários, ONGs, animais, estatísticas)
  uploads/           # fotos enviadas (não vão para o GitHub)
  requirements.txt
  .env.example
```

## Erros comuns
| Mensagem | Causa / solução |
|---|---|
| `Access denied for user ...` | Usuário ou senha errados no `.env`. |
| `Can't connect to MySQL server` | O serviço do MySQL está desligado (`services.msc` → MySQL80 → Iniciar). |
| `Unknown database 'petconnect'` | Rode os scripts de `database/` no Workbench. |
| `ModuleNotFoundError` | O `venv` não está ativado ou faltou o `pip install -r requirements.txt`. |
