# Sprint 09 — Verificação completa: testes, correção de bugs e documentação

Todos os testes rodaram com o **sistema real**: front React, API FastAPI e banco com os scripts 01 a 10.
São automatizados, então podem ser repetidos a qualquer momento, inclusive na apresentação.

| Conjunto | Ferramenta | Casos | Resultado | Relatório |
|---|---|---|---|---|
| Funcionais e de validação da API | pytest (`backend/tests/`) | 97 | 97 passaram | [RELATORIO_API.md](sprint09/RELATORIO_API.md) |
| Navegação, validação na tela e fluxo completo | Playwright (`testes-e2e/`) | 25 | 25 passaram | [RELATORIO_INTERFACE.md](sprint09/RELATORIO_INTERFACE.md) + prints em [sprint09/interface](sprint09/interface) |

Cada relatório lista, para cada caso: **ID, caso de teste, resultado esperado, resultado obtido e situação**.
Os casos de ID repetido (como CT-16, CT-26, CT-76 e CT-77) são parametrizados: cada variação conta como um caso.

## 1. Testes funcionais

| Módulo | O que foi testado | Casos |
|---|---|---|
| Autenticação | login certo/errado, e-mail com maiúsculas, campos vazios, sessão (`/me`), token falso, atualizar perfil, trocar senha, recuperação de senha | CT-01 a CT-13 |
| Cadastros | adotante e ONG válidos, e-mail/CNPJ duplicado, ONG nasce pendente | CT-14 a CT-20 |
| Animais | cadastrar, consultar, detalhe, editar, excluir (lógico), animal de ONG pendente fora do catálogo | CT-21 a CT-33 |
| Área do adotante | formulário de avaliação, favoritos, recomendações e compatibilidade da IA, notificações | CT-34 a CT-40 |
| Solicitações | fluxo completo pedir → analisar → aprovar (encerra os outros) → concluir (animal adotado), cancelar, recusar com motivo, linha do tempo, pós-adoção | CT-41 a CT-59 |
| Administração | usuários, desativar/reativar, conta desativada perde o acesso na hora, aprovar ONG, estatísticas, logs com filtros, remover anúncio | CT-60 a CT-70 |
| Consultas | filtros por espécie/porte/sexo, busca, paginação, saúde da API | CT-71 a CT-79 |

## 2. Testes de validação

**Na API:**
- dados inválidos (nome curto, e-mail sem @, senha curta, campo faltando, CNPJ inválido);
- valores fora da lista (espécie, porte, sexo, moradia, status);
- números absurdos (idade negativa ou de 50 anos, horas sozinho negativas, data no futuro);
- regras de negócio (pedido duplicado, animal já adotado, concluir sem aprovar, cancelar aprovado, recusar sem motivo, excluir com pedido aberto, marcar "adotado" à mão).

Todos devolvem 400, 409 ou 422 com mensagem em português.

**Na tela (VL-01 a VL-08):**
- login vazio e senha errada;
- cadastro com e-mail, senha e confirmação inválidos;
- CNPJ inválido;
- cadastro de animal vazio e com 30 anos;
- formulário sem respostas;
- pesquisa com 1 letra.

Cada erro aparece embaixo do campo certo.

## 3. Testes de navegação (NV-01 a NV-13)

- menus de cada perfil, abrindo cada página;
- volta para a página pedida depois do login, inclusive em "Entrar para adotar";
- "Acesso restrito" para perfil errado;
- ONG pendente no painel;
- página não encontrada;
- trilha de navegação;
- sair da conta;
- token inválido guardado no navegador.

## 4. Fluxo completo pela interface (FX-01 a FX-04)

A ONG cadastra um animal com foto. O adotante acha o animal e pede a adoção. A ONG analisa, aprova e conclui, e o animal fica "Adotado". O administrador encontra a adoção na pesquisa e as etapas no histórico de operações.

## 5. Bugs encontrados e corrigidos

| Bug | Onde | Problema | Correção | Teste que comprova |
|---|---|---|---|---|
| B01 | API | `/api/auth/me` não devolvia telefone e cidade; ao recarregar, a tela de perfil abria com os campos vazios | `/me` passou a devolver telefone, cidade e data de cadastro | CT-09 |
| B02 | API e tela | CNPJ "123" ou "11.111.111/1111-11" era aceito | validação dos 14 dígitos e dos dígitos verificadores no back e no front | CT-19, VL-04 |
| B03 | API e tela | idade de 600 meses (50 anos) era aceita | limite de 25 anos no back (cadastro e edição) e no formulário | CT-26, VL-06 |
| B04 | API e tela | acompanhamento pós-adoção com data no futuro era aceito | back recusa data futura; o campo de data não deixa escolher depois de hoje | CT-56 |
| B05 | API | ONG e administrador conseguiam ler `/api/formulario` | rota exclusiva do adotante (403 para os outros) | CT-76 |
| B06 | Tela | "Sair" dentro de uma página protegida levava ao login com "entre para continuar", em vez do início | sai da página primeiro e depois encerra a sessão | NV-12 |
| B07 | Banco | os dados de demonstração deixavam pedidos "esperando há 160 dias" e aprovações paradas há meses | pedido antigo é cancelado e aprovação antiga é concluída no script 09 | dashboard e script 12 |
| B08 | API | listas limitadas a 20 registros cortavam catálogo e relatórios (encontrado na integração da Sprint 08) | paginação opcional | CT-74, CT-75 |

**Pendências:**
- **Medições OpenCL:** a tabela de medições sequencial × OpenCL só é preenchida num computador com placa de vídeo e driver OpenCL. Ação: rodar `python -m app.ia.benchmark --registrar` no computador do grupo que tiver GPU.
- **Banco do grupo:** os testes rodaram num banco compatível com MySQL. Ação: repetir `python -m pytest tests -v` no MySQL do grupo antes da apresentação.

## 6. Atualização da documentação

| Documento | O que mudou |
|---|---|
| `README.md` | reescrito: objetivo, tecnologias, requisitos, instalação passo a passo, banco, execução, testes, estrutura, equipe |
| `docs/API.md` (novo) e `docs/openapi.json` | as 48 rotas com quem pode usar, parâmetros, corpo, autenticação, erros e exemplos reais; Swagger em português em `/docs` |
| `docs/BANCO_DE_DADOS.md` (novo) | dicionário de dados das 17 tabelas, gerado do banco real |
| `database/diagramas/modelo_relacional` | modelo relacional regerado do banco final |
| `database/12_verificacao_final.sql` (novo) | confere estrutura e consistência |
| `docs/FRONTEND.md`, `database/README.md`, `docs/CONTRATO_API.md` | telas novas, scripts 08 a 12, logs e paginação |

## Dificuldades e próximos passos

- **Dificuldade:** testar a interface com dados reais exigiu um ambiente com os três componentes ligados ao mesmo tempo. Os testes criam dados com nomes únicos para poder repetir.
- **Próximos passos:** Sprint 10 (versão candidata), rodar os testes no banco do grupo e preparar a apresentação final.
