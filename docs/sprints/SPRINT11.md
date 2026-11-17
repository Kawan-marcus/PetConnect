# Sprint 11 — Preparação para entrega

Objetivo: deixar o produto documentado, o código revisado e o repositório organizado, para que qualquer pessoa consiga entender, instalar, executar e usar o PetConnect.

## Entregas

| Entrega | Onde está |
|---|---|
| Manual do Usuário (36 telas do sistema real) | [docs/MANUAL_USUARIO.md](../MANUAL_USUARIO.md) |
| Manual Técnico | [docs/MANUAL_TECNICO.md](../MANUAL_TECNICO.md) |
| Documentação final consolidada | [docs/README.md](../README.md) (índice) e [REQUISITOS_E_CASOS_DE_USO.md](../REQUISITOS_E_CASOS_DE_USO.md) |
| Revisão completa do código | seção "Revisão do código" abaixo |
| Organização do GitHub | seção "Organização do repositório" abaixo |

## Documentação final consolidada

Toda a documentação foi conferida contra a versão atual do sistema:

| Documento | O que mudou na revisão |
|---|---|
| Requisitos e regras | RF24 a RF26 formalizados (relatórios, pesquisa/logs, permissões). A numeração RN06–RN09 tinha significados diferentes nos textos das Sprints 05 e 08; foi unificada (RN01 a RN14) em um único documento. |
| Casos de uso | documento novo: 15 casos de uso com atores, pré-condições, fluxo principal e alternativos, com diagrama e rastreabilidade com os testes |
| Arquitetura | diagrama refeito com o que existe na 1.0.0: 50 rotas, 17 tabelas, as três partes da IA (compatibilidade, OpenCL e visão) |
| API | `docs/API.md` e `docs/openapi.json` regenerados a partir do código (50 rotas, com as 2 novas da IA) |
| Front-end | `docs/FRONTEND.md` atualizado: a API real passou a ser o padrão; o modo demonstração ficou opcional |
| Banco | dicionário de dados sem mudanças estruturais nesta Sprint (17 tabelas, 23 views, 19 FKs, 15 triggers, 6 procedures) |

## Revisão do código

A revisão passou pelos módulos principais do back (rotas, segurança, IA), do front (camada de API, telas da ONG) e pelos scripts do banco, com três ferramentas: leitura dos arquivos, analisador estático **Ruff** no Python (regras de erro, imports, boas práticas) e as duas suítes de teste.

### Problemas encontrados e corrigidos

| # | Onde | Problema | Correção |
|---|---|---|---|
| R01 | `routes/uploads.py` | **Qualquer pessoa, sem login, conseguia gravar arquivos no servidor** pela rota de envio de fotos | a rota exige login de ONG aprovada; validação de tipo e tamanho extraída para funções reaproveitáveis |
| R02 | `routes/uploads.py` | o endereço da foto era montado com `127.0.0.1:8000` fixo e quebraria fora do computador local | o endereço usa o servidor que recebeu a requisição |
| R03 | `src/api/ia.js` × back | o front chamava `POST /api/ia/classificar-imagem` (RF23), mas **a rota não existia no back**: no sistema real a sugestão pela foto nunca aparecia | rota implementada com visão computacional real (MobileNetV2 + ONNX Runtime), mais o registro de aceite da sugestão |
| R04 | `src/api/client.js` | sem o arquivo `.env`, o front abria em **modo simulado** (dados falsos no navegador) | a API real passou a ser o padrão; o modo demonstração só liga com `VITE_USE_MOCK=true` |
| R05 | `database/10_...sql` | senha fixa `relatorio123` do usuário de relatórios escrita no script | trocada por um marcador e instrução de `ALTER USER` |
| R06 | `routes/notificacoes.py`, `security.py`, `routes/ia.py` | exceções relançadas sem a causa original, o que esconde a origem do erro nos logs | `raise ... from erro` / `from None` |
| R07 | `ia/benchmark.py` | funções `lambda` dentro do laço capturavam a variável do laço por referência | variável fixada como argumento padrão |
| R08 | 5 rotas | imports sem uso (`Query`) e arquivos sem quebra de linha final | removidos/corrigidos |
| R09 | `testes-e2e/sistema.cjs` | o fluxo FX-01 usava uma imagem de 1 pixel e não testava a IA pela foto | usa a foto real de um cão e confere a sugestão aplicada |
| R10 | `ia/codificacao.py`, `ia/modelo.py`, `ia/treinar.py`, `routes/auth.py`, `routes/admin.py` | variáveis de uma letra (`l`) que se confundem com `1` e `zip()` que cortaria listas de tamanhos diferentes sem avisar | nomes descritivos e `zip(..., strict=True)`; configuração do Ruff em `backend/ruff.toml` |

Resultado do Ruff depois da revisão (`ruff check app` na pasta `backend`): **0 problemas** nas regras de erro (E, F, W) e boas práticas (B). A única regra desligada é a B008, que acusa `Depends(...)` e `File(...)` nos parâmetros, o padrão do próprio FastAPI. Também não há arquivos do front sem uso, `console.log` esquecido ou comentários `TODO` pendentes.

### Pontos verificados sem problemas

| Item | Situação |
|---|---|
| SQL injection | todas as consultas usam parâmetros (`text(...)` com `:parametro`) |
| Senhas | bcrypt; nunca voltam nas respostas |
| Sessão | JWT + conta conferida a cada requisição |
| Permissões | cada rota confere perfil e dono; testes CT-72 a CT-79 e NV-04 a NV-13 |
| Tratamento de erros | respostas sempre `{"detail": "..."}` em português; erros de trigger viram 409 |
| Credenciais | nenhum `.env` no Git; só `.env.example` sem senha real |
| Arquivos desnecessários | nenhum `__pycache__`, `.log`, `.zip` ou `node_modules` versionado |

### Nova funcionalidade concluída: sugestão pela foto (RF23)

| Item | Detalhe |
|---|---|
| Modelo | MobileNetV2 treinada no ImageNet (118 raças de cães e 5 tipos de gatos), formato ONNX, executada pelo ONNX Runtime na CPU |
| Arquivos | `backend/app/ia/visao.py`, `racas.py`, `baixar_modelo.py` |
| Rotas | `POST /api/ia/classificar-imagem` e `PATCH /api/ia/classificacoes/{id}` |
| Banco | grava cada sugestão em `classificacao_imagem` (tabela que já existia desde a Sprint 02), com o aceite da ONG |
| Tempo | 5 a 16 ms por foto |
| Testes | CT-80 a CT-88 (API) e FX-01 (interface) |

Exemplos reais da rota:

| Foto | Espécie | Raça sugerida | Porte |
|---|---|---|---|
| pastor alemão | cão (100%) | Pastor alemão (99%) | grande (99%) |
| corgi | cão (100%) | Corgi (84%) | pequeno (99%) |
| beagle | cão (100%) | Beagle (79%) | médio (83%) |
| gatinho rajado | gato (100%) | SRD (99%) | pequeno |
| foto de pessoa | — | "Não identificamos um cão ou gato nesta foto" (422) | — |

### OpenCL executado de verdade

A medição OpenCL estava pendente desde a Sprint 06 por falta de uma placa de vídeo. Nesta Sprint o kernel foi executado com o **PoCL** (implementação OpenCL 3.0 que roda na CPU), sem mudar uma linha do kernel, e as medições foram gravadas no banco e aparecem no dashboard:

| Tarefa | Sequencial | NumPy | OpenCL | Ganho |
|---|---:|---:|---:|---:|
| 1 adotante × 10.000 animais | 55,8 ms | 1,8 ms | 0,6 ms | 96× |
| 50 adotantes × 10.000 animais | 2.024 ms | 53,6 ms | 14,9 ms | 136× |

## Organização do repositório

| Item exigido | Situação |
|---|---|
| Organização das pastas | `src/` (front), `backend/` (API e IA), `database/` (scripts e diagramas), `testes-e2e/`, `docs/` (manuais, API, banco, diagramas, Sprints) |
| Código-fonte atualizado | `main` com tudo integrado pelos PRs #5, #6, #7 e o desta Sprint |
| README com instruções | README atualizado para a 1.0.0 com instalação, execução, contas de teste, testes e links para os manuais |
| Documentação técnica | `docs/` com índice em `docs/README.md` |
| Configuração e dependências | `package.json`, `package-lock.json`, `backend/requirements.txt`, `.env.example` (raiz e back) |
| Histórico de commits | uma branch por Sprint e merge por pull request, mensagens em português |
| Sem arquivos desnecessários ou sensíveis | `.gitignore` cobre `.env`, `node_modules`, `__pycache__`, `uploads`, relatórios gerados e o modelo `.onnx` |
| Identificação dos integrantes | seção "Equipe" do README e capa do documento |

## Pendências e próximos passos

| Pendência | Próximo passo |
|---|---|
| Nomes dos integrantes e número do grupo | preencher no README e na capa do documento |
| Print do Swagger (`localhost:8000/docs`) | feito: `docs/sprints/sprint12/swagger.jpg` |
| Code Freeze, vídeos e ensaio | Sprint 12 |
