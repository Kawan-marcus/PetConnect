# PetConnect: Front-end

Interface web do **PetConnect**, plataforma de adoção de animais (Fábrica de Software + Tópicos Avançados, 2026.2).

- **Tecnologia:** React 19 + Vite, React Router e Axios
- **Papel no sistema:** apenas interface. Regras de negócio, banco (MySQL) e IA/OpenCL ficam no backend Python.
- **Funciona sem o backend:** o modo *mock* simula a API no navegador, então dá para desenvolver e demonstrar desde a Sprint 1.

---

## Como rodar

Pré-requisito: Node.js 20 ou mais recente.

```bash
npm install
cp .env.example .env      # no Windows: copy .env.example .env
npm run dev
```

Abra http://localhost:5173.

### Contas de demonstração (modo mock)

| Perfil   | E-mail               | Senha  |
|----------|----------------------|--------|
| Adotante | ana@email.com        | 123456 |
| ONG      | ong@patinhas.org     | 123456 |
| Admin    | admin@adotapet.com   | 123456 |

Na tela de login há botões para preencher essas contas automaticamente. A faixa escura no topo tem o botão **"Restaurar dados de exemplo"**, que apaga tudo o que foi alterado e volta ao estado inicial.

---

## Ligando no backend Python

1. No `.env`, troque `VITE_USE_MOCK=true` para `VITE_USE_MOCK=false`.
2. Suba o backend na porta **8000**. O `vite.config.js` já redireciona `/api` para `http://localhost:8000`, sem problema de CORS em desenvolvimento.
3. O backend precisa seguir o contrato descrito em **[docs/CONTRATO_API.md](CONTRATO_API.md)**: endpoints, formato do JSON, estados da solicitação e respostas da IA.

Cada função em `src/api/*.js` tem as duas versões lado a lado: a real (Axios) e a simulada (`src/api/mock/handlers.js`). Assim fica fácil ver o que o backend precisa devolver.

---

## Estrutura

```
src/
  api/
    client.js          # Axios: baseURL, token JWT, tratamento de erros
    auth.js            # login, cadastro, perfil
    animais.js         # animais, fotos, favoritos
    adocoes.js         # formulário, solicitações, acompanhamento
    ia.js              # compatibilidade, recomendações, classificação de imagem, desempenho
    admin.js           # usuários, ONGs, estatísticas
    notificacoes.js
    mock/              # API simulada (localStorage) + regras de negócio de exemplo
  components/          # Layout, AnimalCard, ScoreCompatibilidade, TimelineStatus, Modal...
  context/             # AuthContext (usuário logado), Favoritos, Toast
  hooks/               # useAsync (chamadas à API), useFormulario (validação)
  routes/              # RotaProtegida (bloqueia rota por perfil)
  pages/
    publico/           # Home, Login, Cadastro, Animais, Detalhe, Perfil...
    adotante/          # Favoritos, Formulário, Minhas solicitações, Recomendados
    ong/               # Painel, Animais, Cadastro de animal, Solicitações, Pós-adoção
    admin/             # Dashboard, ONGs, Usuários, Animais, Histórico
  styles/global.css    # tokens de cor e todo o CSS
```

---

## Telas × requisitos

| Requisito | Tela / rota |
|---|---|
| RF01 Cadastro de usuários | `/cadastro` |
| RF02 Login | `/login` (+ `/recuperar-senha`) |
| RF03 Cadastro de ONGs | `/cadastro?tipo=ong` (entra como "pendente") |
| RF04–RF06 Cadastro de animais, fotos e informações | `/ong/animais/novo` e `/ong/animais/:id/editar` |
| RF07 Visualização | `/animais` e `/animais/:id` |
| RF08 Busca e filtros | `/animais` (filtros ficam na URL) |
| RF09 Favoritos | coração nos cards + `/favoritos` |
| RF10 Solicitação de adoção | botão "Solicitar adoção" em `/animais/:id` |
| RF11 Formulário de avaliação | `/formulario` |
| RF12 Análise pela ONG | `/ong/solicitacoes` e `/ong/solicitacoes/:id` |
| RF13 Aprovação/recusa | ações em `/ong/solicitacoes/:id` |
| RF14 Acompanhamento pelo adotante | `/minhas-solicitacoes` (linha do tempo) |
| RF15 Status do animal | seletor em `/ong/animais` + automático ao aprovar/concluir |
| RF16 Histórico | `/minhas-solicitacoes`, `/ong/solicitacoes` (aba Todas), `/admin/historico` |
| RF17–RF19 Gestão (admin) | `/admin/usuarios`, `/admin/ongs`, `/admin/animais` |
| RF20–RF21 Compatibilidade (IA) | score com fatores no detalhe do animal e na análise da ONG |
| RF22 Recomendação | `/recomendados` |
| RF23 Classificação por imagem | cartão "A IA sugere a partir da foto" no cadastro de animal |
| Acompanhamento pós-adoção | `/ong/acompanhamentos` |
| Notificações | sino no topo |
| Relatórios + comparativo OpenCL | `/admin` |

### Regras de negócio refletidas no front

- **RN01:** animal adotado não recebe solicitações.
- **RN02:** ao aprovar, o animal vai para "em processo" e as outras solicitações para ele são encerradas. A tela avisa antes.
- **RN03:** só solicita quem preencheu o formulário. O botão fica desabilitado até isso acontecer.
- **RN04:** ONG só publica animais depois de aprovada pelo admin.
- **RN05:** uma solicitação ativa por animal por usuário.

> O front valida para dar uma boa experiência, mas **quem garante as regras é o backend**. Ele precisa validar tudo de novo.

---

## Sobre a IA no front

O front **não calcula nada de IA** e só exibe o que o backend devolve. O arquivo `src/api/mock/compatibilidade.js` é uma **simulação** com pesos fixos, feita para as telas funcionarem antes do modelo ficar pronto. Ela também serve de referência para o formato da resposta (score + fatores). Os números do comparativo CPU × OpenCL no dashboard também são de exemplo e devem ser trocados pelas medições reais do backend.

---

## Build para produção

```bash
npm run build     # gera a pasta dist/
npm run preview   # testa o build localmente
```

Se o servidor onde o site for publicado não redirecionar todas as rotas para o `index.html`, use `VITE_HASH_ROUTER=true` no `.env`. As URLs passam a ficar no formato `/#/animais`.
