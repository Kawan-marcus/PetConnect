# PetConnect — Apresentação final e vídeos

Planejamento da apresentação, distribuição das falas e roteiro dos dois vídeos obrigatórios. Os nomes entre colchetes devem ser trocados pelos integrantes.

## 1. Preparação do ambiente (antes de começar)

Faça a lista na ordem, no computador que vai ser usado na apresentação, **com pelo menos 30 minutos de antecedência**.

| # | Passo | Como conferir |
|---|---|---|
| 1 | MySQL ligado (serviço MySQL80) | Workbench conecta na instância local |
| 2 | Banco com dados de demonstração | rodar `database/12_verificacao_final.sql`: 14 linhas "OK" |
| 3 | API ligada | `uvicorn app.main:app --port 8000` e http://localhost:8000/api/health/db → `conectado` |
| 4 | Modelo de visão baixado | http://localhost:8000/docs → `POST /api/ia/classificar-imagem` não responde 503 |
| 5 | Medição OpenCL registrada | dashboard do admin mostra o quadro "Desempenho: sequencial × OpenCL" com valores reais |
| 6 | Front ligado | `npm run dev` e http://localhost:5173 abre sem a faixa "Modo demonstração" |
| 7 | Navegador preparado | 3 abas já logadas: adotante (ana@email.com), ONG (ong@patinhas.org), admin (admin@adotapet.com); zoom 110% |
| 8 | Foto para a demonstração da IA | `backend/tests/fotos/cao.jpg` na área de trabalho |
| 9 | Plano B | vídeo horizontal salvo no computador e prints do Manual do Usuário abertos |

## 2. Sequência da apresentação (12 minutos)

| Tempo | Parte | Quem fala | O que mostrar |
|---|---|---|---|
| 0:00–1:00 | Abertura, equipe e problema | [Scrum Master] | adoções que dão errado por falta de compatibilidade; ONGs com processo manual |
| 1:00–2:00 | Solução e público | [Scrum Master] | página inicial; os três perfis |
| 2:00–3:30 | Arquitetura e tecnologias | Ecliton | diagrama de arquitetura: React → FastAPI → MySQL; componente de IA |
| 3:30–5:30 | Demonstração: adotante | Kawan | formulário de avaliação → Recomendados (compatibilidade e motivos) → detalhe → solicitar adoção |
| 5:30–7:30 | Demonstração: ONG | [Integrante 4] | cadastrar animal com a **foto** (sugestão da IA) → analisar o pedido com o índice → aprovar → concluir |
| 7:30–8:30 | Demonstração: administrador | [Integrante 5] | dashboard, relatórios com exportação, histórico de operações |
| 8:30–10:00 | Componente avançado | Ecliton | modelo treinado (AUC 0,84), quadro **sequencial × OpenCL** (até 136× mais rápido), visão computacional |
| 10:00–11:00 | Qualidade | Kawan | 106 testes da API + 25 da interface passando; banco com 14 verificações OK |
| 11:00–12:00 | Conclusão e próximos passos | [Scrum Master] | resultado, aprendizados, perguntas |

**Transições:** cada pessoa encerra a sua parte chamando a próxima ("agora o [nome] mostra o lado da ONG").

## 3. Possíveis problemas e o que fazer

| Problema | Ação rápida |
|---|---|
| Tela em "Carregando" | API caiu: reabrir o terminal 1 e rodar o uvicorn de novo (5 s) |
| "Sua sessão expirou" | entrar de novo na aba (as contas estão no item 7 da preparação) |
| Sugestão pela foto não aparece | confirmar o item 4; se não der tempo, mostrar o print `docs/manual/telas/21-ong-cadastro-ia.png` |
| Projetor com resolução baixa | usar zoom 90% no navegador |
| Internet da sala instável | o sistema funciona sem internet (tudo local); só o Swagger usa CDN |
| Estourou o tempo | pular o item 10:00–11:00 (qualidade) e citar os números na conclusão |

## 4. Vídeo horizontal (16:9, até 10 minutos)

**Objetivo:** apresentação completa do projeto. **Ferramentas:** OBS Studio (gravação da tela em 1920×1080), microfone de fone de ouvido, CapCut ou DaVinci Resolve para a edição, trilha sem direitos autorais.

| Cena | Tempo | Imagem | Narração (resumo) |
|---|---|---|---|
| 1 | 0:00–0:30 | logo do PetConnect + animais do catálogo | "Todo ano milhares de animais são devolvidos depois da adoção…" |
| 2 | 0:30–1:30 | integrantes (câmera) e o problema em texto na tela | problema, público e objetivo |
| 3 | 1:30–2:30 | diagrama de arquitetura com destaque em cada camada | React, FastAPI, MySQL, IA |
| 4 | 2:30–3:00 | tabela de tecnologias | linguagens e bibliotecas |
| 5 | 3:00–5:00 | gravação da tela: jornada do adotante | formulário, recomendados, compatibilidade, pedido |
| 6 | 5:00–6:30 | gravação da tela: ONG | foto com sugestão da IA, análise com o índice, aprovação, conclusão, pós-adoção |
| 7 | 6:30–7:30 | gravação da tela: administrador | dashboard, relatórios, permissões, logs |
| 8 | 7:30–9:00 | componente avançado | modelo treinado e métricas, kernel OpenCL, gráfico sequencial × OpenCL, visão computacional |
| 9 | 9:00–9:40 | testes rodando no terminal (acelerado) | qualidade: 131 testes automatizados |
| 10 | 9:40–10:00 | encerramento com link do GitHub | agradecimento e créditos |

## 5. Vídeo vertical (9:16, 45 a 60 segundos, Instagram)

**Objetivo:** divulgar o projeto de forma curta e criativa. **Formato:** 1080×1920, legendas grandes, cortes a cada 2–3 segundos, música animada.

| Tempo | Cena | Texto na tela |
|---|---|---|
| 0–3 s | close de um cachorro/gato olhando para a câmera (ou ilustração do catálogo) | "E se o seu pet fosse escolhido por compatibilidade?" |
| 3–10 s | celular rolando o catálogo do PetConnect | "PetConnect: adoção responsável" |
| 10–20 s | formulário sendo preenchido rápido + Recomendados com o percentual | "A IA calcula o quanto cada animal combina com você" |
| 20–30 s | ONG enviando a foto e a sugestão aparecendo | "Foto → espécie, raça e porte em milissegundos" |
| 30–40 s | gráfico sequencial × OpenCL crescendo | "Processamento paralelo: até 136× mais rápido" |
| 40–50 s | equipe reunida | "Fábrica de Software + Tópicos Avançados 2026.2" |
| 50–60 s | logo e chamada | "Adote com responsabilidade 🐾" |

**Legenda da publicação (rascunho):** "Conheçam o PetConnect, nossa plataforma de adoção responsável que usa IA para calcular a compatibilidade entre adotantes e animais 🐶🐱 Projeto de Fábrica de Software e Tópicos Avançados 2026.2. @pryscillabgoncalves @antenorparnaiba #adocaoresponsavel #petconnect"

## 6. Andamento da produção

| Item | Responsável | Situação |
|---|---|---|
| Roteiro dos dois vídeos | equipe | concluído (este documento) |
| Gravações de tela do sistema | [Nome] | [preencher] |
| Narração | [Nome] | [preencher] |
| Edição do vídeo horizontal | [Nome] | [preencher] |
| Edição do vídeo vertical e publicação | [Nome] | [preencher] |
| Ensaio completo com cronômetro | equipe | ver `docs/sprints/SPRINT12.md` |
