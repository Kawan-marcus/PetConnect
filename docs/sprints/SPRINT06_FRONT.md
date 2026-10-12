# Sprint 06: front-end (aprimoramento do sistema)

Este arquivo registra o que o front-end entregou na Sprint 06. O texto pode ser copiado para o documento PDF da equipe.
Os prints ficam em `docs/sprints/sprint06/antes/` e `docs/sprints/sprint06/depois/`.

> Os prints foram gerados no modo demonstração (faixa escura no topo). Para o PDF final, refaça os prints com o backend
> ligado (`VITE_USE_MOCK=false`). As telas são as mesmas.

---

## 1. Correções apontadas na Pré-Banca

> **[PREENCHER pela equipe]** Liste cada observação recebida na Pré-Banca, a ação tomada e o que ficou pendente.

| Observação da Pré-Banca | Ação realizada | Situação |
|---|---|---|
| [PREENCHER] | [PREENCHER] | Resolvido / Pendente (prazo) |

---

## 2. Terceiro módulo: Inteligência de compatibilidade

O módulo 3 usa o componente de IA do backend para ajudar o adotante a escolher um animal e a ONG a analisar os pedidos.
No front, o módulo tem quatro partes funcionando:

| Funcionalidade | Rota | O que faz |
|---|---|---|
| **Recomendados** | `/recomendados` | Ranking de todos os animais disponíveis pelo índice de compatibilidade (`GET /api/ia/recomendacoes`). Novo na Sprint 06: filtros por espécie, porte e compatibilidade mínima, e o **motivo** de cada recomendação ("Combina: espaço da moradia…", "Atenção: convivência com crianças"). |
| **Comparador de compatibilidade** (novo) | `/comparar?ids=1,8,3` | Coloca até 3 animais lado a lado. Mostra o score de cada um e cada fator do modelo, com o melhor valor de cada linha destacado e a ficha do animal. Usa `GET /api/ia/compatibilidade/:id` + `GET /api/animais/:id`. A seleção fica na URL, então dá para recarregar, voltar ou compartilhar. |
| **Compatibilidade no detalhe e na análise da ONG** | `/animais/:id`, `/ong/solicitacoes/:id` | Score com os fatores explicados. A ONG ordena as solicitações pelo maior índice. |
| **Sugestão por foto** | `/ong/animais/novo` | Ao enviar a primeira foto, a IA sugere espécie, raça e porte (`POST /api/ia/classificar-imagem`). Se o backend ainda não tiver esse endpoint, o front avisa e o cadastro continua normalmente. |
| **Comparativo sequencial × OpenCL** | `/admin` | Mostra os tempos gravados em `medicao_desempenho`. Se a tabela estiver vazia, exibe um aviso em vez de quebrar. |

---

## 3. Integração entre os módulos

**Minha área** (`/minha-area`, nova) é a página inicial do adotante e junta os três módulos numa tela:

- **Jornada de adoção:** criar conta → preencher formulário → escolher animal → solicitar → adoção concluída. Mostra a etapa atual e um botão para o próximo passo.
- **Módulo 1 (animais e favoritos):** total de favoritos, atalho para procurar animais.
- **Módulo 2 (solicitações):** últimas solicitações com o status atual.
- **Módulo 3 (IA):** os 3 animais mais compatíveis e o botão "Comparar estes 3".

Cada bloco carrega de forma independente: se um falhar, os outros continuam na tela.

**Fluxo principal para demonstrar na orientação:**

1. Adotante entra → cai em **Minha área**.
2. Preenche o **formulário de avaliação** (módulo 2).
3. Abre **Recomendados**: a IA ordena os animais (módulo 3) e explica por quê.
4. Clica em **Comparar os 3 primeiros** e vê fator por fator.
5. Clica em **Ver e solicitar** → detalhe do animal (módulo 1) → **Solicitar adoção** (módulo 2). O score vai junto.
6. Entra como ONG → **Solicitações** ordenadas por compatibilidade → aprova (RN02).
7. Volta como adotante → **Minha área** mostra a solicitação aprovada e a jornada avançada.
8. Entra como admin → **Dashboard** com estatísticas e o comparativo de desempenho.

---

## 4. Melhorias na interface

| Antes | Depois |
|---|---|
| Recomendados mostrava só a porcentagem. | Cada card explica o motivo (fatores fortes e ponto de atenção), com filtros e contador "4 de 10 animais". |
| Sem filtros na lista de recomendados. | Filtros por espécie, porte e compatibilidade mínima, com mensagem e botão "Limpar filtros" quando nada aparece. |
| Erros do servidor apareciam em inglês ("Network Error") ou como JSON. | Mensagens em português: sem conexão, servidor lento, sem permissão, erro de validação com o nome do campo. |
| Página 404 só com "Voltar ao início". | Mostra o endereço digitado e atalhos de acordo com o perfil. |
| Dashboard quebrava se não houvesse medições de desempenho. | Exibe aviso explicando que as medições aparecem quando o módulo rodar. |
| Menu do celular só tinha as páginas. | Menu do celular também tem Meu perfil, Formulário e Sair. |
| Sem atalho para teclado. | Link "Pular para o conteúdo" (aparece ao apertar Tab) e textos para leitores de tela. |

---

## 5. Ajustes de navegação

| Problema identificado | Ajuste |
|---|---|
| O usuário não sabia em que parte do sistema estava. | **Trilha "Você está em"** no topo das páginas internas (ex.: `Minha área › Adotar › Thor`). Cada item é clicável. |
| Todas as abas do navegador tinham o mesmo título. | O título da aba muda por tela (ex.: "Thor · PetConnect"), o que ajuda no histórico do navegador. |
| Adotante caía na lista de animais depois do login, sem visão geral. | Adotante agora cai em **Minha área**. ONG continua no Painel e admin no Dashboard. |
| Um perfil abrindo a área de outro era redirecionado sem explicação. | Tela **Acesso restrito** explica qual perfil pode entrar e oferece "Ir para a minha página inicial" ou "Entrar com outra conta". |
| Ao exigir login, os filtros da URL se perdiam. | O login guarda o caminho completo (com `?filtros`) e devolve o usuário exatamente para onde ele estava, com um aviso "Entre para continuar". |
| "Voltar" e "Cancelar" saíam do site quando a página era aberta por link direto. | Se não há histórico dentro do app, eles levam à tela pai (ex.: Cadastrar animal → Meus animais). |
| Detalhe do animal tinha um link fixo "Todos os animais". | Substituído pela trilha, que mostra o nome do animal. |

---

## 6. Prints (antes × depois)

| Tela | Antes | Depois |
|---|---|---|
| Página inicial do adotante | `antes/01-adotante-apos-login.png` | `depois/01-minha-area.png` |
| Recomendados | `antes/02-recomendados.png` | `depois/02-recomendados.png`, `02b-…filtro-gatos.png`, `02c-…sem-resultado.png` |
| Favoritos | `antes/03-favoritos.png` | `depois/03-favoritos.png` (botão Comparar) |
| Detalhe do animal | `antes/04-detalhe-animal.png` | `depois/04-detalhe-animal.png` (trilha) |
| Perfil errado | `antes/05-adotante-tenta-admin.png` | `depois/05-adotante-tenta-admin.png` |
| Página 404 | `antes/06-pagina-404.png` | `depois/06-pagina-404.png` |
| Menu no celular | `antes/08-menu-celular.png` | `depois/08-menu-celular.png` |
| Comparador (novo) | — | `depois/09-comparar.png`, `09b-comparar-3.png`, `15-comparar-celular.png` |
| Login com aviso | — | `depois/00-login-com-aviso.png` |
| ONG e admin com trilha | — | `depois/10-ong-trilha.png`, `12-admin-dashboard.png` |

---

## 7. Arquivos alterados no front

- **Novos:** `src/pages/adotante/MinhaArea.jsx`, `src/pages/adotante/Comparar.jsx`, `src/pages/publico/AcessoRestrito.jsx`, `src/components/Trilha.jsx`, `src/routes/mapaRotas.js`.
- **Alterados:** `App.jsx` (novas rotas), `Layout.jsx` (trilha, menu do celular, voltar seguro, pular conteúdo), `RotaProtegida.jsx`, `AuthContext.jsx` (rota inicial do adotante), `api/client.js` (mensagens de erro), `Recomendados.jsx`, `Favoritos.jsx`, `AnimalDetalhe.jsx`, `AnimalCard.jsx`, `NaoEncontrado.jsx`, `Login.jsx`, `FormularioAvaliacao.jsx`, `OngAnimalForm.jsx`, `AdminDashboard.jsx`, `Icone.jsx`, `global.css`.
- **Backend:** nenhuma rota nova é necessária. O comparador e a Minha área usam endpoints que já existem.

## 8. Dificuldades e próximos passos

- **Dificuldade:** encaixar o módulo 3 sem criar endpoints novos. O comparador reaproveita `/ia/compatibilidade/:id` para cada animal.
- **Próximo passo (back):** trocar o cálculo `simulacao-python-v1` pelo modelo treinado + OpenCL. O front já mostra qualquer lista de fatores e o tempo de processamento que vier.
- **Próximo passo (back):** implementar `POST /api/ia/classificar-imagem`. O front já está pronto e hoje mostra um aviso amigável.
