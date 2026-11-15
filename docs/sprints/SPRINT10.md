# Sprint 10 — Release Candidate (versão 1.0.0-rc)

A versão **1.0.0-rc** reúne tudo o que foi construído nas Sprints 01 a 09:
- os três módulos (adoção, gestão da ONG e administração);
- o componente de IA para compatibilidade e sugestão pela foto;
- dashboard, relatórios, logs, permissões e as regras de negócio protegidas em três camadas (tela, API e banco).

## 1. Sistema estável

- **122 testes automatizados passando:** 97 na API e 25 na interface. Eles cobrem os fluxos principais de ponta a ponta (ver [SPRINT09.md](SPRINT09.md)).
- **Todos os bugs da Sprint 09 corrigidos** (B01 a B08), cada um com um teste que comprova a correção.
- **Telas sem erro técnico:** a revisão das 22 telas, no computador e no celular, não mostrou nenhum erro de JavaScript nem erro 500 da API.
- **Banco consistente:** o script `12_verificacao_final.sql` passa nas 14 verificações de consistência.

## 2. Interface final

A revisão cobriu 22 telas, cada uma em duas larguras: computador (1280 px) e celular (390 px). Os prints estão em [sprint10/telas](sprint10/telas).

| Perfil | Telas |
|---|---|
| Público | início, catálogo com filtros, detalhe do animal, login, cadastro |
| Adotante | minha área, recomendados, solicitações, formulário, perfil |
| ONG | painel com desempenho, meus animais, solicitações, análise da solicitação, pós-adoção, relatórios |
| Administrador | dashboard, ONGs, usuários, relatórios, histórico de operações, permissões |

Padronização das telas:
- **Visual:** cores, tipografia e componentes iguais em todas as telas; cabeçalho com trilha de navegação; mensagens de vazio e de erro em português.
- **Confirmações:** feitas no padrão visual do sistema.
- **Celular:** layout adaptado, com menu recolhido.

## 3. Banco de dados final

- **Estrutura:** 17 tabelas, 23 views, 19 chaves estrangeiras, 15 triggers e 6 procedures/funções.
- **Documentação:** dicionário completo em [BANCO_DE_DADOS.md](../BANCO_DE_DADOS.md) e modelo relacional regerado do banco real.
- **Instalação:** a ordem dos scripts está no README.

Verificações do script `12_verificacao_final.sql` (todas com 0 problemas):
- nenhum animal com dois vencedores;
- nenhum "adotado" sem adoção concluída;
- nenhum pedido aberto em animal já adotado ou excluído;
- nenhuma recusa sem motivo;
- toda solicitação tem histórico;
- toda solicitação tem formulário;
- perfis coerentes;
- nenhum animal de ONG não aprovada no catálogo;
- acompanhamento só de adoção concluída;
- todo animal tem foto.

## 4. APIs documentadas

- [docs/API.md](../API.md): as 48 rotas, com:
  - método, quem pode usar, parâmetros e corpo;
  - autenticação JWT e códigos de erro;
  - paginação;
  - exemplos de resposta reais.
- **Swagger** em `http://localhost:8000/docs`, com resumos em português e botão *Authorize* para testar com token.
- [docs/openapi.json](../openapi.json) para importar no Postman ou Insomnia.

## 5. README atualizado

O [README](../../README.md) traz:
- nome e descrição, objetivo e tecnologias;
- requisitos;
- instalação e configuração, banco de dados passo a passo e comandos para executar;
- contas de teste, testes automatizados e estrutura do projeto;
- documentação, problemas comuns e identificação da equipe.

## 6. Principais correções e ajustes desde a Sprint 08

- **Bugs B01 a B08** (ver Sprint 09).
- **Dados de demonstração** mais realistas.
- **Swagger** documentado em português.
- **Versão** 1.0.0-rc na API e no front.
- **Testes automatizados** incluídos no repositório.

## Pendências e próximos passos

| Pendência | Como resolver |
|---|---|
| Medições reais de OpenCL no painel | rodar `python -m app.ia.benchmark --registrar` num computador com placa de vídeo |
| Nomes e número do grupo no README e no documento | preencher os campos `[Nº]` e `[Nome]` |
| Testes no MySQL do grupo | rodar `python -m pytest tests -v` e `npm run teste:interface` antes da apresentação |
| Apresentação final | roteiro de demonstração: adotante pede → ONG aprova e conclui → admin vê no dashboard e nos logs |
