# Sprint 12 — Versão final do sistema

Objetivo: concluir o desenvolvimento, congelar o código na versão **1.0.0** e preparar a apresentação e os vídeos.

## 1. Versão final

O PetConnect 1.0.0 tem todos os requisitos aprovados (RF01 a RF26) funcionando com front, API e banco reais, sem depender de dados simulados:

| Módulo | Situação | Evidência |
|---|---|---|
| Usuários e autenticação (cadastro, login, recuperação de senha, perfil) | completo | CT-01 a CT-20, NV-01, VL-01 a VL-04 |
| Animais (cadastro com fotos, catálogo, filtros, detalhe, favoritos) | completo | CT-21 a CT-40, VL-05, VL-06 |
| Adoção (formulário, pedido, análise, aprovação, recusa, conclusão, histórico, notificações, pós-adoção) | completo | CT-41 a CT-59, FX-02, FX-03 |
| Administração (ONGs, usuários, animais, dashboard, relatórios, pesquisa, logs, permissões) | completo | CT-60 a CT-79, FX-04, NV-04 a NV-13 |
| **Componente avançado (IA + processamento paralelo)** | completo | CT-34 a CT-40, CT-80 a CT-88, FX-01, `benchmark_opencl.txt` |
| Banco de dados (17 tabelas, 23 views, 15 triggers, 6 procedures) | completo | `verificacao_banco.txt` (14 verificações OK) |

O componente avançado tem três partes integradas ao produto:

1. **Compatibilidade** (regressão logística treinada, AUC 0,84): índice e fatores no detalhe do animal e na análise da ONG.
2. **Processamento paralelo com OpenCL**: recomendações calculadas em lote; medição real gravada e exibida no dashboard (até **136×** mais rápido que o sequencial).
3. **Visão computacional** (MobileNetV2): sugestão de espécie, raça e porte a partir da foto no cadastro do animal.

O modo demonstração do front (dados simulados) continua no código só para desenvolvimento de telas e **está desligado por padrão**; a apresentação e todos os testes usam o sistema real.

## 2. Correção dos bugs

| Origem | Bugs | Situação |
|---|---|---|
| Sprint 09 (testes) | B01 a B08 | corrigidos e com teste de comprovação |
| Sprint 11 (revisão de código) | R01 a R09, incluindo envio de fotos sem login e rota da IA pela foto inexistente no back | corrigidos e com teste de comprovação (CT-80 a CT-88, FX-01) |
| Sprint 12 (revisão geral) | nenhum bug de funcionamento; 12 avisos do analisador de código (R10) corrigidos | testes repetidos: 106/106 e 25/25 |

A revisão geral da Sprint 12 passou pelos fluxos principais, validações, permissões, integração entre os módulos, persistência (banco recriado do zero pelos scripts) e pelo componente avançado. As 36 telas do Manual do Usuário foram abertas no sistema real sem nenhum erro de JavaScript nem resposta 5xx da API.

**Limitações conhecidas (não afetam as funcionalidades essenciais):**

| Limitação | Justificativa |
|---|---|
| A recuperação de senha mostra o link no terminal da API, sem enviar e-mail | o projeto não tem servidor de e-mail; o fluxo (token de 1 hora, troca de senha) funciona por completo |
| A medição OpenCL foi feita com PoCL (OpenCL na CPU), não em placa de vídeo | a equipe não tem GPU dedicada disponível; o mesmo kernel roda em GPU sem alteração (`python -m app.ia.benchmark --registrar`) |
| A raça sugerida pela foto é a mais provável entre 118 raças do ImageNet; animais SRD recebem "SRD" | a ONG sempre confere e pode corrigir; o aceite é registrado para avaliar o modelo |

## 3. Code Freeze

| Item | Valor |
|---|---|
| Versão congelada | **1.0.0** |
| Identificação no GitHub | tag `v1.0.0` e release "PetConnect 1.0.0" |
| Versão no código | `package.json` 1.0.0 e API 1.0.0 (aparece no Swagger) |
| Histórico | [CHANGELOG.md](../../CHANGELOG.md) |
| Regra após o freeze | nenhuma funcionalidade nova; só correções críticas, como versões 1.0.x, com teste e PR |

Comandos usados para criar a tag (depois do merge na `main`):
```bash
git checkout main
git pull
git tag -a v1.0.0 -m "PetConnect 1.0.0 - versao final (code freeze)"
git push origin v1.0.0
```
Depois, no GitHub: **Releases → Draft a new release → tag v1.0.0**, título "PetConnect 1.0.0", descrição copiada do CHANGELOG.

## 4. Vídeos

O planejamento completo está em [docs/APRESENTACAO.md](../APRESENTACAO.md):

| Vídeo | Formato | Duração | Andamento |
|---|---|---|---|
| Horizontal: apresentação completa (problema, solução, arquitetura, tecnologias, funcionamento, IA) | 16:9, 1920×1080 | até 10 min | roteiro com 10 cenas, tempos e narração concluído; gravação e edição com a equipe (item 6) |
| Vertical: divulgação no Instagram, marcando @pryscillabgoncalves e @antenorparnaiba | 9:16, 1080×1920 | 45–60 s | roteiro com 7 cortes, textos e legenda da publicação concluído; gravação e publicação com a equipe (item 6) |

## 5. Ensaio completo da apresentação

### 5.1 Ensaio técnico (sistema)

Feito em 15/11/2026 com o ambiente montado do zero e repetido em 16/11/2026, depois da última revisão de código, na mesma sequência da apresentação:

| Etapa | Resultado |
|---|---|
| Banco recriado pelos scripts 01, 02, 03, 05, 08, 09 e 10 | sem erros (no MySQL Workbench da equipe e no ambiente de testes) |
| Verificação final do banco (script 12) | 17 tabelas, 23 views, 19 FKs, 15 triggers, 6 procedures; **14 de 14 verificações OK** |
| Subida da API | 1,1 s até responder `{"status": "conectado"}` |
| Medição OpenCL registrada | 96× e 136× sobre o sequencial; quadro do dashboard preenchido |
| Testes da API | **106 de 106** passaram em 10,9 s ([RELATORIO_API.md](sprint12/RELATORIO_API.md)) |
| Testes da interface (navegador real) | **25 de 25** passaram ([RELATORIO_INTERFACE.md](sprint12/RELATORIO_INTERFACE.md), prints em `sprint12/interface/`) |
| Demonstração do adotante, da ONG (com a foto) e do admin | fluxo FX-01 → FX-04 executado de ponta a ponta: animal cadastrado com a sugestão da IA, pedido feito, aprovado, concluído e encontrado na pesquisa e no histórico |
| Erros no navegador durante as 36 telas do manual | nenhum |

### 5.2 Ensaio da equipe (falas e tempo)

Sequência, falas e plano B estão em [APRESENTACAO.md](../APRESENTACAO.md). Registro do ensaio cronometrado:

| Parte | Responsável | Tempo previsto | Tempo no ensaio | Observações |
|---|---|---|---|---|
| Abertura e problema | [Scrum Master] | 2:00 | [preencher] | |
| Arquitetura e tecnologias | Ecliton | 1:30 | [preencher] | |
| Demonstração adotante | Kawan | 2:00 | [preencher] | |
| Demonstração ONG (IA pela foto) | [Integrante 4] | 2:00 | [preencher] | |
| Demonstração admin | [Integrante 5] | 1:00 | [preencher] | |
| Componente avançado | Ecliton | 1:30 | [preencher] | |
| Qualidade e conclusão | Kawan / [Scrum Master] | 2:00 | [preencher] | |
| **Total** | | **12:00** | [preencher] | |

### 5.3 Problemas técnicos previstos

| Risco | Prevenção |
|---|---|
| Modelo de visão não baixado no computador da apresentação | `python -m app.ia.baixar_modelo` na preparação (item 4 do checklist) |
| Dashboard sem a medição OpenCL | `python -m app.ia.benchmark --registrar` na preparação |
| Sessão expirando no meio da demonstração | entrar nas três contas logo antes de começar |
| API ou front fechados por engano | terminais identificados; comando de subida anotado |

## 6. Ajustes finais

| Ajuste | Situação |
|---|---|
| Preencher nomes dos integrantes e número do grupo (README e documento) | pendente da equipe |
| Print do Swagger | feito: `docs/sprints/sprint12/swagger.jpg` |
| Gravar e editar os dois vídeos | com a equipe, a partir dos roteiros de `docs/APRESENTACAO.md` |
| Criar a tag `v1.0.0` e a release no GitHub | após o merge desta Sprint |
| Registrar o tempo do ensaio da equipe (5.2) | pendente da equipe |
