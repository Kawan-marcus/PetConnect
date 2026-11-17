# Documentação do PetConnect (versão 1.0.0)

Índice da documentação final, revisada na Sprint 11 para corresponder à versão entregue.

## Para usar e instalar

| Documento | Para quem | Conteúdo |
|---|---|---|
| [Manual do Usuário](MANUAL_USUARIO.md) | adotantes, ONGs, administradores | telas, passo a passo dos fluxos, mensagens e perguntas frequentes |
| [Manual Técnico](MANUAL_TECNICO.md) | equipe técnica e avaliadores | arquitetura, tecnologias, instalação, variáveis de ambiente, IA, segurança, testes, manutenção |
| [README do projeto](../README.md) | todos | resumo, equipe, instalação rápida e como rodar |

## Documentação técnica

| Documento | Conteúdo |
|---|---|
| [Requisitos, regras de negócio e casos de uso](REQUISITOS_E_CASOS_DE_USO.md) | RF01–RF26, RNF01–RNF10, RN01–RN14 (numeração final), 15 casos de uso e rastreabilidade com os testes |
| [API](API.md) · [openapi.json](openapi.json) | as 50 rotas, perfis, parâmetros e exemplos de resposta |
| [Contrato front ↔ back](CONTRATO_API.md) | formato combinado entre as telas e a API |
| [Banco de dados](BANCO_DE_DADOS.md) · [scripts](../database/README.md) | dicionário de dados: 17 tabelas, 23 views, triggers e procedures |
| [Front-end](FRONTEND.md) | estrutura do React, telas × requisitos, regras no front |
| [Apresentação e vídeos](APRESENTACAO.md) | roteiro da apresentação, distribuição das falas e roteiro dos dois vídeos |
| [Histórico de versões](../CHANGELOG.md) | o que entrou em cada versão |

## Diagramas

| Diagrama | Arquivo |
|---|---|
| Arquitetura | [diagramas/arquitetura.png](diagramas/arquitetura.png) (fonte `.mmd`) |
| Casos de uso | [diagramas/casos_de_uso.png](diagramas/casos_de_uso.png) |
| Classes | [diagramas/diagrama_classes.png](diagramas/diagrama_classes.png) |
| MER conceitual | [../database/diagramas/mer_conceitual.png](../database/diagramas/mer_conceitual.png) |
| Modelo relacional | [../database/diagramas/modelo_relacional.png](../database/diagramas/modelo_relacional.png) |

## Registro das Sprints

Veja [sprints/README.md](sprints/README.md): cada Sprint tem o seu documento e as evidências (prints e relatórios de teste).
