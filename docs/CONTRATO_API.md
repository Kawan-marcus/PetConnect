# Contrato da API (front ↔ backend)

Este documento define o que o front espera do backend Python. Qualquer mudança aqui precisa ser combinada entre as duas partes.

- **Base:** `/api` (em desenvolvimento, o Vite redireciona para `http://localhost:8000`)
- **Formato:** JSON, com nomes de campos em *camelCase*, como abaixo.
- **Autenticação:** JWT no cabeçalho `Authorization: Bearer <token>`.
- **Erros:** status HTTP adequado (400, 401, 403, 404, 409...) e corpo `{ "detail": "mensagem legível" }`. O front mostra essa mensagem ao usuário. Um 401 desloga o usuário automaticamente.
- **Datas:** ISO 8601 (`2026-09-24T21:15:00Z`).

---

## Entidades

```jsonc
// Usuario (nunca devolver a senha)
{ "id": 2, "nome": "Ana Souza", "email": "ana@email.com", "perfil": "adotante" /* adotante | ong | admin */,
  "telefone": "(62) 91234-5678", "cidade": "Goiânia - GO", "ativo": true, "ongId": null, "criadoEm": "..." }

// Ong
{ "id": 1, "nome": "Patinhas Felizes", "cnpj": "12.345.678/0001-90", "email": "...", "telefone": "...",
  "cidade": "Goiânia - GO", "descricao": "...", "status": "pendente" /* pendente | aprovada | suspensa */, "criadoEm": "..." }

// Animal
{ "id": 1, "ongId": 1, "nome": "Thor", "especie": "cao" /* cao | gato */, "raca": "Vira-lata",
  "idadeMeses": 30, "sexo": "M" /* M | F */, "porte": "grande" /* pequeno | medio | grande */,
  "energia": "alta" /* baixa | media | alta */, "convivenciaCriancas": true, "convivenciaAnimais": true,
  "castrado": true, "vacinado": true, "descricao": "...", "fotos": ["https://.../1.jpg"],
  "status": "disponivel" /* disponivel | em_processo | adotado */, "criadoEm": "...",
  "ong": { /* Ong. Incluir nas listagens públicas e no detalhe */ } }

// FormularioAvaliacao (um por adotante)
{ "tipoMoradia": "casa" /* casa | apartamento */, "temQuintal": true, "telaProtecao": false,
  "pessoasCasa": 3, "temCriancas": true, "outrosAnimais": false, "horasSozinho": 5,
  "experiencia": "alguma" /* nenhuma | alguma | muita */, "nivelAtividade": "medio" /* baixo | medio | alto */,
  "motivacao": "texto", "atualizadoEm": "..." }

// Solicitacao
{ "id": 4, "animalId": 1, "usuarioId": 2, "ongId": 1, "status": "em_analise", "score": 74,
  "mensagem": "texto opcional do adotante", "motivoRecusa": null, "criadoEm": "...",
  "historico": [ { "status": "pendente", "data": "...", "obs": "" }, { "status": "em_analise", "data": "...", "obs": "" } ],
  "animal": { /* Animal */ }, "usuario": { /* Usuario */ }, "ong": { /* Ong */ } }

// Acompanhamento
{ "id": 1, "solicitacaoId": 1, "animalId": 5, "tipo": "visita" /* visita | contato | foto */, "data": "...", "observacao": "..." }

// Notificacao
{ "id": 1, "texto": "Sua solicitação para Paçoca foi aprovada!", "link": "/minhas-solicitacoes", "lida": false, "data": "..." }
```

### Máquina de estados da solicitação

```
pendente ──► em_analise ──► aprovada ──► concluida
   │             │
   ├─────────────┴──► recusada      (ONG, motivo obrigatório)
   ├─────────────┴──► cancelada     (adotante)
   └─────────────┴──► encerrada     (automático: outra solicitação do mesmo animal foi aprovada, RN02)
```

Cada transição adiciona um item em `historico` e gera uma notificação para o adotante.

---

## Endpoints

### Autenticação

| Método | Rota | Corpo | Resposta |
|---|---|---|---|
| POST | `/auth/login` | `{ email, senha }` | `{ token, usuario }` |
| GET | `/auth/me` | | `Usuario` + `ong` (se perfil = ong) |
| PUT | `/auth/me` | `{ nome, telefone, cidade, novaSenha? }` | `Usuario` |
| POST | `/auth/cadastro/adotante` | `{ nome, email, senha, telefone, cidade }` | `{ token, usuario }` |
| POST | `/auth/cadastro/ong` | `{ nomeOng, cnpj, descricao, nomeResponsavel, email, senha, telefone, cidade }` | `{ token, usuario }` (ONG criada como `pendente`) |
| POST | `/auth/recuperar-senha` | `{ email }` | `{ mensagem }` |

### Animais e favoritos

| Método | Rota | Quem | Observação |
|---|---|---|---|
| GET | `/animais?especie=&porte=&sexo=&idade=&busca=&ordenar=` | público | Só ONGs aprovadas e status ≠ adotado. `idade` = `filhote` (<12 meses), `adulto`, `idoso` (≥96 meses). `ordenar` = `recentes`, `nome`, `idade` |
| GET | `/animais/:id` | público | inclui `ong` |
| GET | `/ong/animais?status=` | ong | animais da ONG logada |
| POST | `/ong/animais` | ong | corpo = Animal sem `id`, `ongId`, `status`, `criadoEm`. 403 se a ONG não estiver aprovada (RN04) |
| PUT | `/animais/:id` | ong dona / admin | |
| PATCH | `/animais/:id/status` | ong dona / admin | `{ status }` |
| DELETE | `/animais/:id` | ong dona / admin | 409 se houver solicitação em andamento |
| POST | `/uploads/fotos` | ong | multipart, campo `arquivo`. Resposta: `{ url }` |
| GET | `/favoritos` | adotante | lista de Animal |
| GET | `/favoritos/ids` | adotante | `[1, 8]` |
| POST | `/favoritos/:animalId` | adotante | alterna. Resposta: `{ favorito: true/false }` |

### Formulário e solicitações

| Método | Rota | Quem | Observação |
|---|---|---|---|
| GET | `/formulario` | adotante | FormularioAvaliacao ou `null` |
| PUT | `/formulario` | adotante | cria ou atualiza |
| POST | `/solicitacoes` | adotante | `{ animalId, mensagem }`. Valida RN01, RN03 e RN05. Calcula e grava o `score` |
| GET | `/solicitacoes/minhas` | adotante | com `animal` e `ong` |
| POST | `/solicitacoes/:id/cancelar` | adotante | só `pendente` ou `em_analise` |
| GET | `/ong/solicitacoes?status=` | ong | com `animal` e `usuario` |
| GET | `/solicitacoes/:id` | dono / ong | inclui também `formulario`, `compatibilidade` (ver IA) e `concorrentes` (nº de outras solicitações abertas para o mesmo animal) |
| POST | `/solicitacoes/:id/analisar` | ong | pendente → em_analise |
| POST | `/solicitacoes/:id/aprovar` | ong | `{ obs }`. Aplica RN02 |
| POST | `/solicitacoes/:id/recusar` | ong | `{ motivo }` (obrigatório) |
| POST | `/solicitacoes/:id/concluir` | ong | aprovada → concluida. Animal passa a `adotado` |
| GET | `/ong/adocoes` | ong | solicitações concluídas + `acompanhamentos[]` |
| POST | `/solicitacoes/:id/acompanhamentos` | ong | `{ tipo, data, observacao }` |

As ações da ONG devolvem a solicitação completa (mesmo formato do `GET /solicitacoes/:id`).

### IA e processamento (núcleo Python + OpenCL)

**GET `/ia/compatibilidade/:animalId`** (adotante logado). Resposta `null` se o adotante ainda não tiver formulário.

```json
{
  "score": 78,
  "modelo": "compat-v1",
  "fatores": [
    { "chave": "espaco",      "nome": "Espaço da moradia",                    "peso": 0.22, "valor": 1.0,  "descricao": "A moradia comporta bem o porte do animal." },
    { "chave": "energia",     "nome": "Nível de energia × estilo de vida",    "peso": 0.20, "valor": 0.58, "descricao": "Diferença moderada de ritmo." },
    { "chave": "rotina",      "nome": "Tempo que o animal ficaria sozinho",   "peso": 0.18, "valor": 1.0,  "descricao": "..." },
    { "chave": "criancas",    "nome": "Convivência com crianças",             "peso": 0.15, "valor": 1.0,  "descricao": "..." },
    { "chave": "animais",     "nome": "Convivência com outros animais",       "peso": 0.13, "valor": 1.0,  "descricao": "..." },
    { "chave": "experiencia", "nome": "Experiência do adotante",              "peso": 0.12, "valor": 0.85, "descricao": "..." }
  ]
}
```

- `score`: inteiro de 0 a 100.
- `valor`: de 0 a 1.
- `peso`: importância do fator. Se o modelo usado não tiver pesos fixos (ex.: árvore de decisão), mande a importância de cada variável, somando 1.
- A lista de fatores pode mudar; o front exibe o que vier.

**GET `/ia/recomendacoes?limite=6`** (adotante). O backend calcula o score do adotante contra **todos** os animais disponíveis, em lote e com OpenCL, e devolve os melhores:

```json
{ "itens": [ { "animal": { /* Animal com ong */ }, "score": 91, "fatores": [ /* ... */ ] } ],
  "processados": 1240, "tempoMs": 38, "modelo": "compat-v1" }
```
Se não houver formulário: `{ "itens": [], "semFormulario": true }`.

**POST `/ia/classificar-imagem`** (ong). Multipart com o campo `imagem`:

```json
{ "especie": { "valor": "gato", "confianca": 0.97 },
  "raca":    { "valor": "Siamês", "confianca": 0.71, "alternativas": ["SRD", "Persa"] },
  "porte":   { "valor": "pequeno", "confianca": 0.83 },
  "tempoMs": 142, "modelo": "visao-v1" }
```

**GET `/admin/desempenho`** (admin). Medições reais para comparar sequencial × OpenCL:

```json
{ "exemplo": false, "dispositivo": "NVIDIA GTX 1650 (OpenCL 3.0)",
  "medicoes": [ { "tarefa": "Score em lote (1 × 10.000)", "sequencialMs": 820, "openclMs": 46 } ] }
```

### Notificações

| Método | Rota | Resposta |
|---|---|---|
| GET | `/notificacoes` | lista de Notificacao do usuário logado, mais recentes primeiro |
| POST | `/notificacoes/marcar-lidas` | `{ ok: true }` |

### Administração

| Método | Rota | Observação |
|---|---|---|
| GET | `/admin/usuarios?perfil=&busca=` | |
| PATCH | `/admin/usuarios/:id` | `{ ativo }`. O admin não pode desativar a si mesmo |
| GET | `/admin/ongs?status=` | cada ONG com `totalAnimais` e `totalAdocoes` |
| PATCH | `/admin/ongs/:id/status` | `{ status: "aprovada" \| "suspensa" \| "pendente" }` |
| GET | `/admin/animais?status=&especie=` | animais de todas as ONGs, com `ong` |
| GET | `/admin/solicitacoes` | histórico completo |
| GET | `/admin/estatisticas` | ver abaixo |

```json
{ "totais": { "animaisDisponiveis": 9, "emProcesso": 2, "adotados": 1, "adotantes": 3,
              "ongsAprovadas": 2, "ongsPendentes": 1, "solicitacoesAbertas": 2 },
  "tempoMedioAdocaoDias": 8,
  "adocoesPorMes": [ { "mes": "abr", "adocoes": 3 } ],
  "porOng": [ { "ong": "Patinhas Felizes", "animais": 6, "adocoes": 1 } ] }
```
