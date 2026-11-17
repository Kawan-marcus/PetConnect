# Documentação da API — PetConnect

API REST em **FastAPI** (Python). Base: `http://localhost:8000/api`. Todas as respostas são JSON.

- **Documentação interativa:** com o back ligado, abra `http://localhost:8000/docs` (Swagger) ou `/redoc`. Dá para testar cada rota pelo navegador.
- **Especificação OpenAPI:** [`openapi.json`](openapi.json) (importa no Postman ou Insomnia).
- **Contrato front ↔ back:** [`CONTRATO_API.md`](CONTRATO_API.md).

## Autenticação

1. `POST /api/auth/login` com `{"email": "...", "senha": "..."}` devolve um **token JWT**.
2. Envie o token em todas as rotas protegidas no cabeçalho `Authorization: Bearer <token>`.
3. A cada requisição o back confere se a conta ainda está ativa; conta desativada recebe 401.

```bash
curl -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" \
     -d '{"email":"ana@email.com","senha":"123456"}'
curl http://localhost:8000/api/auth/me -H "Authorization: Bearer SEU_TOKEN"
```

## Respostas de erro

Todo erro vem como `{"detail": "mensagem em português"}`.

| Código | Quando |
|---|---|
| 400 | dado inválido (ex.: CNPJ inválido, idade fora do limite) |
| 401 | sem token, token inválido/vencido ou conta desativada |
| 403 | perfil sem permissão (ex.: adotante em rota de admin; ONG ainda não aprovada cadastrando animal) |
| 404 | registro não existe ou pertence a outro dono |
| 409 | regra de negócio (ex.: pedido duplicado, animal já adotado, status fora do fluxo; também quando um trigger do banco barra a operação) |
| 422 | formato inválido (campo faltando, tipo errado, parâmetro fora do intervalo) |

## Paginação

Listas aceitam `?limit=` (1 a 1000) e `&offset=`. Sem `limit`, vem a lista inteira.

## Resumo das rotas

| Método | Rota | Quem pode | Descrição |
|---|---|---|---|
| POST | `/api/auth/login` | público | Entrar (devolve o token JWT) |
| GET | `/api/auth/me` | logado | Dados do usuário logado |
| PUT | `/api/auth/me` | logado | Atualizar nome, telefone, cidade ou senha |
| POST | `/api/auth/cadastro/adotante` | público | Criar conta de adotante |
| POST | `/api/auth/cadastro/ong` | público | Criar conta de ONG (fica pendente de aprovação) |
| POST | `/api/auth/recuperar-senha` | público | Pedir código para redefinir a senha |
| POST | `/api/auth/redefinir-senha` | público | Redefinir a senha com o código |
| GET | `/api/animais` | público | Catálogo de animais disponíveis, com filtros e busca |
| GET | `/api/animais/{animal_id}` | público | Detalhe de um animal |
| PUT | `/api/animais/{animal_id}` | ong (dona do animal) | Editar animal (ONG dona) |
| DELETE | `/api/animais/{animal_id}` | ong (dona do animal) | Remover anúncio (sem pedidos em aberto) |
| PATCH | `/api/animais/{animal_id}/status` | ong (dona do animal) | Voltar o animal para disponível |
| GET | `/api/formulario` | adotante | Ler o formulário de avaliação do adotante |
| PUT | `/api/formulario` | adotante | Salvar o formulário de avaliação |
| GET | `/api/favoritos` | adotante | Animais favoritos |
| GET | `/api/favoritos/ids` | adotante | Só os ids dos favoritos (para os corações) |
| POST | `/api/favoritos/{animal_id}` | adotante | Favoritar ou desfavoritar |
| GET | `/api/ong/animais` | ong | Animais da ONG logada |
| POST | `/api/ong/animais` | ong | Cadastrar animal (ONG aprovada) |
| GET | `/api/ong/solicitacoes` | ong | Pedidos recebidos pela ONG |
| GET | `/api/ong/adocoes` | ong | Adoções concluídas e acompanhamentos |
| POST | `/api/uploads/fotos` | ong | Enviar foto de animal |
| GET | `/api/ia/compatibilidade/{animal_id}` | adotante | Compatibilidade adotante × animal |
| GET | `/api/ia/recomendacoes` | adotante | Animais recomendados para o adotante |
| GET | `/api/ia/modelo` | logado | Informações do modelo de IA em uso |
| POST | `/api/ia/classificar-imagem` | ong | Sugerir espécie, raça e porte pela foto (ONG) |
| PATCH | `/api/ia/classificacoes/{classificacao_id}` | ong | Registrar se a ONG aplicou a sugestão da foto |
| POST | `/api/solicitacoes` | adotante | Pedir adoção |
| GET | `/api/solicitacoes/minhas` | adotante | Pedidos do adotante logado |
| POST | `/api/solicitacoes/{solicitacao_id}/cancelar` | adotante | Cancelar pedido (adotante) |
| POST | `/api/solicitacoes/{solicitacao_id}/analisar` | ong | Colocar pedido em análise (ONG) |
| POST | `/api/solicitacoes/{solicitacao_id}/recusar` | ong | Recusar pedido com motivo |
| POST | `/api/solicitacoes/{solicitacao_id}/aprovar` | ong | Aprovar pedido; encerra os outros do mesmo animal |
| POST | `/api/solicitacoes/{solicitacao_id}/concluir` | ong | Concluir adoção; animal fica adotado |
| GET | `/api/solicitacoes/{solicitacao_id}` | logado | Detalhe e linha do tempo de um pedido |
| POST | `/api/solicitacoes/{solicitacao_id}/acompanhamentos` | ong | Registrar acompanhamento pós-adoção |
| GET | `/api/notificacoes` | logado | Notificações do usuário |
| POST | `/api/notificacoes/marcar-lidas` | logado | Marcar todas as notificações como lidas |
| GET | `/api/admin/usuarios` | admin | Listar usuários (filtro por perfil e busca) |
| PATCH | `/api/admin/usuarios/{alvo_id}` | admin | Ativar ou desativar conta |
| GET | `/api/admin/ongs` | admin | Listar ONGs |
| PATCH | `/api/admin/ongs/{ong_id}/status` | admin | Aprovar, suspender ou voltar ONG para análise |
| GET | `/api/admin/animais` | admin | Todos os animais da plataforma |
| DELETE | `/api/admin/animais/{animal_id}` | admin | Remover anúncio de qualquer ONG |
| GET | `/api/admin/solicitacoes` | admin | Todos os pedidos, com histórico |
| GET | `/api/admin/estatisticas` | admin | Números do dashboard |
| GET | `/api/admin/desempenho` | admin | Medições sequencial × OpenCL |
| GET | `/api/admin/logs` | admin | Histórico de operações (logs) |
| GET | `/api` | público | Informações da API |
| GET | `/api/health/db` | público | Teste de conexão com o banco |

## Autenticação e perfil

### POST `/api/auth/login`

**Quem pode:** público

Corpo (application/json):

| Campo | Tipo | Obrigatório |
|---|---|---|
| `email` | string | sim |
| `senha` | string | sim |


### GET `/api/auth/me`

**Quem pode:** logado

Exemplo: `GET /api/auth/me`

```json
{
  "id": 2,
  "nome": "Ana Souza",
  "email": "ana@email.com",
  "perfil": "adotante",
  "telefone": "(62) 91234-5678",
  "cidade": "Goiânia - GO",
  "criadoEm": "2026-10-06T18:31:50",
  "ongId": null,
  "ong": null
}
```

### PUT `/api/auth/me`

**Quem pode:** logado

Corpo (application/json):

| Campo | Tipo | Obrigatório |
|---|---|---|
| `nome` | string | sim |
| `telefone` | string | não |
| `cidade` | string | não |
| `senha` | string | não |


### POST `/api/auth/cadastro/adotante`

**Quem pode:** público

Corpo (application/json):

| Campo | Tipo | Obrigatório |
|---|---|---|
| `nome` | string | sim |
| `email` | string | sim |
| `senha` | string | sim |
| `telefone` | string | não |
| `cidade` | string | não |


### POST `/api/auth/cadastro/ong`

**Quem pode:** público

Corpo (application/json):

| Campo | Tipo | Obrigatório |
|---|---|---|
| `nomeOng` | string | sim |
| `nomeResponsavel` | string | sim |
| `cnpj` | string | sim |
| `descricao` | string | não |
| `email` | string | sim |
| `telefone` | string | sim |
| `cidade` | string | sim |
| `senha` | string | sim |


### POST `/api/auth/recuperar-senha`

**Quem pode:** público

Corpo (application/json):

| Campo | Tipo | Obrigatório |
|---|---|---|
| `email` | string | sim |


### POST `/api/auth/redefinir-senha`

**Quem pode:** público

Corpo (application/json):

| Campo | Tipo | Obrigatório |
|---|---|---|
| `token` | string | sim |
| `novaSenha` | string | sim |


## Animais (catálogo e gestão)

### GET `/api/animais`

**Quem pode:** público

| Parâmetro | Onde | Tipo | Obrigatório |
|---|---|---|---|
| `especie` | consulta | string | não |
| `porte` | consulta | string | não |
| `sexo` | consulta | string | não |
| `idade` | consulta | string | não |
| `busca` | consulta | string | não |
| `ordenar` | consulta | string | não |
| `limit` | consulta | integer | não |
| `offset` | consulta | integer | não |

Exemplo: `GET /api/animais?especie=cao&limit=2`

```json
[
  {
    "id": 12,
    "ongId": 2,
    "nome": "Belinha",
    "especie": "cao",
    "raca": "Poodle",
    "idadeMeses": 110,
    "sexo": "F",
    "porte": "pequeno",
    "energia": "baixa",
    "convivenciaCriancas": true,
    "convivenciaAnimais": true,
    "castrado": true,
    "vacinado": true,
    "descricao": "Senhorinha doce que só quer um sofá e carinho.",
    "fotos": [
      "/animais/12-1.svg",
      "/animais/12-2.svg",
      "/animais/12-3.svg"
    ],
    "status": "disponivel",
    "criadoEm": "2026-10-30T18:31:50",
    "ong": {
      "id": 2,
      "nome": "Lar Animal",
      "cnpj": "98.765.432/0001-10",
      "email": "ola@laranimal.org",
      "telefone": "(62) 98888-2222",
      "cidade": "Anápolis - GO",
      "descricao": "Abrigo com foco em gatos e animais idosos.",
      "status": "aprovada",
      "criadoEm": "2026-06-18T18:31:50"
    }
  }
]
```

### GET `/api/animais/{animal_id}`

**Quem pode:** público

| Parâmetro | Onde | Tipo | Obrigatório |
|---|---|---|---|
| `animal_id` | caminho | integer | sim |

Exemplo: `GET /api/animais/49`

```json
{
  "id": 49,
  "ongId": 1,
  "nome": "Biscoito",
  "especie": "gato",
  "raca": "Persa",
  "idadeMeses": 60,
  "sexo": "M",
  "porte": "pequeno",
  "energia": "alta",
  "convivenciaCriancas": true,
  "convivenciaAnimais": true,
  "castrado": true,
  "vacinado": true,
  "descricao": "Animal resgatado, carinhoso e pronto para uma família. (dados de demonstração)",
  "fotos": [
    "/animais/4-1.svg"
  ],
  "status": "disponivel",
  "criadoEm": "2026-10-31T15:05:51",
  "ong": {
    "id": 1,
    "nome": "Patinhas Felizes",
    "cnpj": "12.345.678/0001-90",
    "email": "contato@patinhas.org",
    "telefone": "(62) 99999-1111",
    "cidade": "Goiânia - GO",
    "descricao": "Resgate e reabilitação de cães e gatos desde 2015.",
    "status": "aprovada",
    "criadoEm": "2026-04-29T18:31:50"
  }
}
```

### PUT `/api/animais/{animal_id}`

**Quem pode:** ong (dona do animal)

| Parâmetro | Onde | Tipo | Obrigatório |
|---|---|---|---|
| `animal_id` | caminho | integer | sim |

Corpo (application/json):

| Campo | Tipo | Obrigatório |
|---|---|---|
| `nome` | string | sim |
| `especie` | string | sim |
| `raca` | string | sim |
| `idadeMeses` | integer | sim |
| `sexo` | string | sim |
| `porte` | string | sim |
| `energia` | string | sim |
| `convivenciaCriancas` | boolean | sim |
| `convivenciaAnimais` | boolean | sim |
| `castrado` | boolean | sim |
| `vacinado` | boolean | sim |
| `descricao` | string | sim |
| `fotos` | array | sim |


### DELETE `/api/animais/{animal_id}`

**Quem pode:** ong (dona do animal)

| Parâmetro | Onde | Tipo | Obrigatório |
|---|---|---|---|
| `animal_id` | caminho | integer | sim |


### PATCH `/api/animais/{animal_id}/status`

**Quem pode:** ong (dona do animal)

| Parâmetro | Onde | Tipo | Obrigatório |
|---|---|---|---|
| `animal_id` | caminho | integer | sim |

Corpo (application/json):

| Campo | Tipo | Obrigatório |
|---|---|---|
| `status` | string | sim |


## Formulário de avaliação

### GET `/api/formulario`

**Quem pode:** adotante

Exemplo: `GET /api/formulario`

```json
{
  "usuarioId": 2,
  "tipoMoradia": "casa",
  "temQuintal": true,
  "telaProtecao": false,
  "pessoasCasa": 3,
  "temCriancas": true,
  "outrosAnimais": false,
  "horasSozinho": 5,
  "experiencia": "alguma",
  "nivelAtividade": "medio",
  "motivacao": "Queremos um companheiro para a família e para as crianças.",
  "criadoEm": "2026-10-26T18:31:50",
  "atualizadoEm": "2026-10-26T18:31:50"
}
```

### PUT `/api/formulario`

**Quem pode:** adotante

Corpo (application/json):

| Campo | Tipo | Obrigatório |
|---|---|---|
| `tipoMoradia` | string | sim |
| `temQuintal` | boolean | sim |
| `telaProtecao` | boolean | sim |
| `pessoasCasa` | integer | sim |
| `temCriancas` | boolean | sim |
| `outrosAnimais` | boolean | sim |
| `horasSozinho` | integer | sim |
| `experiencia` | string | sim |
| `nivelAtividade` | string | sim |
| `motivacao` | string | sim |


## Favoritos

### GET `/api/favoritos`

**Quem pode:** adotante

| Parâmetro | Onde | Tipo | Obrigatório |
|---|---|---|---|
| `limit` | consulta | integer | não |
| `offset` | consulta | integer | não |

Exemplo: `GET /api/favoritos?limit=2`

```json
[
  {
    "id": 1,
    "nome": "Thor",
    "especie": "cao",
    "raca": "Vira-lata",
    "porte": "grande",
    "sexo": "M",
    "idadeMeses": 30,
    "energia": "alta",
    "castrado": true,
    "vacinado": true,
    "convivenciaCriancas": true,
    "convivenciaAnimais": true,
    "descricao": "Brincalhão, adora correr e buscar bolinha. Precisa de espaço e passeios diários.",
    "status": "disponivel",
    "fotos": [
      "/animais/1-1.svg",
      "/animais/1-2.svg",
      "/animais/1-3.svg"
    ],
    "ong": {
      "id": 1,
      "nome": "Patinhas Felizes",
      "cidade": "Goiânia - GO",
      "telefone": "(62) 99999-1111"
    }
  }
]
```

### GET `/api/favoritos/ids`

**Quem pode:** adotante

Exemplo: `GET /api/favoritos/ids`

```json
[
  1
]
```

### POST `/api/favoritos/{animal_id}`

**Quem pode:** adotante

| Parâmetro | Onde | Tipo | Obrigatório |
|---|---|---|---|
| `animal_id` | caminho | integer | sim |


## Área da ONG

### GET `/api/ong/animais`

**Quem pode:** ong

| Parâmetro | Onde | Tipo | Obrigatório |
|---|---|---|---|
| `status` | consulta | string | não |
| `limit` | consulta | integer | não |
| `offset` | consulta | integer | não |

Exemplo: `GET /api/ong/animais?limit=2`

```json
[
  {
    "id": 49,
    "ongId": 1,
    "nome": "Biscoito",
    "especie": "gato",
    "raca": "Persa",
    "sexo": "M",
    "idadeMeses": 60,
    "porte": "pequeno",
    "energia": "alta",
    "castrado": true,
    "vacinado": true,
    "descricao": "Animal resgatado, carinhoso e pronto para uma família. (dados de demonstração)",
    "status": "disponivel",
    "convivenciaCriancas": true,
    "convivenciaAnimais": true,
    "fotos": [
      "/animais/4-1.svg"
    ],
    "criadoEm": "2026-10-31T15:05:51",
    "atualizadoEm": "2026-11-15T18:31:51"
  }
]
```

### POST `/api/ong/animais`

**Quem pode:** ong

Corpo (application/json):

| Campo | Tipo | Obrigatório |
|---|---|---|
| `nome` | string | sim |
| `especie` | string | sim |
| `raca` | string | sim |
| `idadeMeses` | integer | sim |
| `sexo` | string | sim |
| `porte` | string | sim |
| `energia` | string | sim |
| `convivenciaCriancas` | boolean | sim |
| `convivenciaAnimais` | boolean | sim |
| `castrado` | boolean | sim |
| `vacinado` | boolean | sim |
| `descricao` | string | sim |
| `fotos` | array | sim |


### GET `/api/ong/solicitacoes`

**Quem pode:** ong

| Parâmetro | Onde | Tipo | Obrigatório |
|---|---|---|---|
| `limit` | consulta | integer | não |
| `offset` | consulta | integer | não |

Exemplo: `GET /api/ong/solicitacoes?limit=2`

```json
[
  {
    "id": 4,
    "animalId": 1,
    "usuarioId": 2,
    "status": "em_analise",
    "score": 74,
    "mensagem": null,
    "motivoRecusa": null,
    "criadoEm": "2026-11-12T18:31:50",
    "atualizadoEm": "2026-11-15T18:31:50",
    "animal": {
      "id": 1,
      "nome": "Thor",
      "fotos": [
        "/animais/1-1.svg",
        "/animais/1-2.svg",
        "/animais/1-3.svg"
      ]
    },
    "usuario": {
      "id": 2,
      "nome": "Ana Souza",
      "cidade": "Goiânia - GO"
    }
  }
]
```

### GET `/api/ong/adocoes`

**Quem pode:** ong

| Parâmetro | Onde | Tipo | Obrigatório |
|---|---|---|---|
| `limit` | consulta | integer | não |
| `offset` | consulta | integer | não |

Exemplo: `GET /api/ong/adocoes?limit=2`

```json
[
  {
    "id": 1,
    "animalId": 5,
    "usuarioId": 3,
    "status": "concluida",
    "score": 71,
    "mensagem": null,
    "motivoRecusa": null,
    "criadoEm": "2026-10-16T18:31:50",
    "atualizadoEm": "2026-11-15T18:31:50",
    "animal": {
      "id": 5,
      "nome": "Bento",
      "especie": "cao",
      "raca": "Labrador",
      "sexo": "M",
      "idadeMeses": 96,
      "porte": "grande",
      "fotos": [
        "/animais/5-1.svg",
        "/animais/5-2.svg",
        "/animais/5-3.svg"
      ]
    },
    "usuario": {
      "id": 3,
      "nome": "Carlos Lima",
      "email": "carlos@email.com",
      "telefone": "(62) 92345-6789",
      "cidade": "Goiânia - GO"
    },
    "historico": [
      {
        "status": "concluida",
        "data": "2026-11-15T18:31:50",
        "obs": "Adoção concluída."
      }
    ],
    "acompanhamentos": [
      {
        "id": 2,
        "solicitacaoId": 1,
        "tipo": "contato",
        "data": "2026-11-10T18:31:50",
        "observacao": "Tutor enviou fotos; vacinas em dia.",
        "registradoPor": 4,
        "criadoEm": "2026-11-15T18:31:50"
      },
      {
        "id": 1,
        "solicitacaoId": 1,
        "tipo": "visita",
        "data": "2026-10-31T18:31:50",
        "observacao": "Bento adaptado, dorme na sala e passeia duas vezes por dia.",
        "registradoPor": 4,
        "criadoEm": "2026-11-15T18:31:50"
      }
    ]
  }
]
```

## Upload de fotos

### POST `/api/uploads/fotos`

**Quem pode:** ong

Corpo (multipart/form-data):

| Campo | Tipo | Obrigatório |
|---|---|---|
| `arquivo` | string | sim |


## Inteligência artificial

### GET `/api/ia/compatibilidade/{animal_id}`

**Quem pode:** adotante

| Parâmetro | Onde | Tipo | Obrigatório |
|---|---|---|---|
| `animal_id` | caminho | integer | sim |

Exemplo: `GET /api/ia/compatibilidade/49`

```json
{
  "score": 89,
  "fatores": [
    {
      "chave": "espaco",
      "nome": "Espaço da moradia",
      "peso": 0.2,
      "valor": 1.0,
      "descricao": "A moradia comporta bem o porte do animal."
    },
    {
      "chave": "energia",
      "nome": "Nível de energia × estilo de vida",
      "peso": 0.13,
      "valor": 0.58,
      "descricao": "Diferença moderada de ritmo."
    },
    {
      "chave": "rotina",
      "nome": "Tempo que o animal ficaria sozinho",
      "peso": 0.24,
      "valor": 1.0,
      "descricao": "Tempo sozinho dentro do tolerável."
    },
    {
      "chave": "criancas",
      "nome": "Convivência com crianças",
      "peso": 0.2,
      "valor": 1.0,
      "descricao": "Sem conflito com crianças."
    },
    {
      "chave": "animais",
      "nome": "Convivência com outros animais",
      "peso": 0.14,
      "valor": 1.0,
      "descricao": "Sem conflito com outros animais."
    },
    {
      "chave": "experiencia",
      "nome": "Experiência do adotante",
      "peso": 0.09,
      "valor": 1.0,
      "descricao": "Experiência compatível com as necessidades do animal."
    }
  ],
  "modelo": "compat-logreg-v1"
}
```

### GET `/api/ia/recomendacoes`

**Quem pode:** adotante

| Parâmetro | Onde | Tipo | Obrigatório |
|---|---|---|---|
| `limite` | consulta | integer | não |

Exemplo: `GET /api/ia/recomendacoes`

```json
{
  "semFormulario": false,
  "itens": [
    {
      "animal": {
        "id": 60,
        "ongId": 2,
        "nome": "Jade",
        "especie": "gato",
        "raca": "Siamês",
        "porte": "medio",
        "sexo": "F",
        "idadeMeses": 25,
        "energia": "media",
        "castrado": false,
        "vacinado": true,
        "convivenciaCriancas": true,
        "convivenciaAnimais": false,
        "descricao": "Animal resgatado, carinhoso e pronto para uma família. (dados de demonstração)",
        "status": "disponivel",
        "fotos": [
          "/animais/2-1.svg"
        ],
        "ong": {
          "id": 2,
          "nome": "Lar Animal",
          "cidade": "Anápolis - GO",
          "telefone": "(62) 98888-2222"
        }
      },
      "score": 97,
      "fatores": [
        {
          "chave": "espaco",
          "nome": "Espaço da moradia",
          "peso": 0.2,
          "valor": 1.0,
          "descricao": "A moradia comporta bem o porte do animal."
        },
        {
          "chave": "energia",
          "nome": "Nível de energia × estilo de vida",
          "peso": 0.13,
          "valor": 1.0,
          "descricao": "Ritmo do adotante combina com a energia do animal."
        },
        {
          "chave": "rotina",
          "nome": "Tempo que o animal ficaria sozinho",
          "peso": 0.24,
          "valor": 1.0,
          "descricao": "Tempo sozinho dentro do tolerável."
        },
        {
          "chave": "criancas",
          "nome": "Convivência com crianças",
          "peso": 0.2,
          "valor": 1.0,
          "descricao": "Sem conflito com crianças."
        },
        {
          "chave": "animais",
          "nome": "Convivência com outros animais",
          "peso": 0.14,
          "valor": 1.0,
          "descricao": "Sem conflito com outros animais."
        },
        {
          "chave": "experiencia",
          "nome": "Experiência do adotante",
          "peso": 0.09,
          "valor": 1.0,
          "descricao": "Experiência compatível com as necessidades do animal."
        }
      ]
    }
  ],
  "processados": 38,
  "tempoMs": 75.167,
  "modelo": "compat-logreg-v1",
  "motor": "opencl",
  "
  …
```

### GET `/api/ia/modelo`

**Quem pode:** logado

Exemplo: `GET /api/ia/modelo`

```json
{
  "versao": "compat-logreg-v1",
  "tipo": "logistico",
  "algoritmo": "Regressão logística (scikit-learn)",
  "amostrasTreino": 16000,
  "metricas": {
    "acuracia": 0.7675,
    "precisao": 0.7873,
    "recall": 0.8307,
    "f1": 0.8084,
    "auc": 0.8412,
    "auc_regra_antiga": 0.8354,
    "casos_teste": 4000,
    "casos_reais": 0
  },
  "treinadoEm": "2026-10-21T16:03:36",
  "importancia": [
    {
      "chave": "espaco",
      "nome": "Espaço da moradia",
      "peso": 0.2
    },
    {
      "chave": "energia",
      "nome": "Nível de energia × estilo de vida",
      "peso": 0.13
    },
    {
      "chave": "rotina",
      "nome": "Tempo que o animal ficaria sozinho",
      "peso": 0.24
    },
    {
      "chave": "criancas",
      "nome": "Convivência com crianças",
      "peso": 0.2
    },
    {
      "chave": "animais",
      "nome": "Convivência com outros animais",
      "peso": 0.14
    },
    {
      "chave": "experiencia",
      "nome": "Experiência do adotante",
      "peso": 0.09
    }
  ],
  "motor": "opencl",
  "dispositivo": "pthread-Intel(R) Xeon(R) Processor @ 2.10GHz (OpenCL 3.0 PoCL HSTR: pthread-x86_64-unknown-linux-gnu-icelake-client)"
}
```

### POST `/api/ia/classificar-imagem`

**Quem pode:** ong

Corpo (multipart/form-data):

| Campo | Tipo | Obrigatório |
|---|---|---|
| `imagem` | string | sim |


### PATCH `/api/ia/classificacoes/{classificacao_id}`

**Quem pode:** ong

| Parâmetro | Onde | Tipo | Obrigatório |
|---|---|---|---|
| `classificacao_id` | caminho | integer | sim |

Corpo (application/json):

| Campo | Tipo | Obrigatório |
|---|---|---|
| `aceita` | boolean | sim |


## Solicitações de adoção

### POST `/api/solicitacoes`

**Quem pode:** adotante

Corpo (application/json):

| Campo | Tipo | Obrigatório |
|---|---|---|
| `animalId` | integer | sim |
| `mensagem` | string | não |


### GET `/api/solicitacoes/minhas`

**Quem pode:** adotante

| Parâmetro | Onde | Tipo | Obrigatório |
|---|---|---|---|
| `limit` | consulta | integer | não |
| `offset` | consulta | integer | não |

Exemplo: `GET /api/solicitacoes/minhas?limit=2`

```json
[
  {
    "id": 4,
    "animalId": 1,
    "usuarioId": 2,
    "status": "em_analise",
    "score": 74,
    "mensagem": null,
    "motivoRecusa": null,
    "criadoEm": "2026-11-12T18:31:50",
    "atualizadoEm": "2026-11-15T18:31:50",
    "animal": {
      "id": 1,
      "nome": "Thor",
      "especie": "cao",
      "raca": "Vira-lata",
      "status": "disponivel",
      "fotos": [
        "/animais/1-1.svg",
        "/animais/1-2.svg",
        "/animais/1-3.svg"
      ]
    },
    "ong": {
      "id": 1,
      "nome": "Patinhas Felizes",
      "cidade": "Goiânia - GO",
      "telefone": "(62) 99999-1111"
    },
    "historico": [
      {
        "status": "pendente",
        "data": "2026-11-12T18:31:50",
        "obs": ""
      },
      {
        "status": "em_analise",
        "data": "2026-11-13T18:31:50",
        "obs": ""
      }
    ]
  }
]
```

### POST `/api/solicitacoes/{solicitacao_id}/cancelar`

**Quem pode:** adotante

| Parâmetro | Onde | Tipo | Obrigatório |
|---|---|---|---|
| `solicitacao_id` | caminho | integer | sim |


### POST `/api/solicitacoes/{solicitacao_id}/analisar`

**Quem pode:** ong

| Parâmetro | Onde | Tipo | Obrigatório |
|---|---|---|---|
| `solicitacao_id` | caminho | integer | sim |


### POST `/api/solicitacoes/{solicitacao_id}/recusar`

**Quem pode:** ong

| Parâmetro | Onde | Tipo | Obrigatório |
|---|---|---|---|
| `solicitacao_id` | caminho | integer | sim |

Corpo (application/json):

| Campo | Tipo | Obrigatório |
|---|---|---|
| `motivo` | string | sim |


### POST `/api/solicitacoes/{solicitacao_id}/aprovar`

**Quem pode:** ong

| Parâmetro | Onde | Tipo | Obrigatório |
|---|---|---|---|
| `solicitacao_id` | caminho | integer | sim |

Corpo (application/json):

| Campo | Tipo | Obrigatório |
|---|---|---|
| `obs` | string | não |


### POST `/api/solicitacoes/{solicitacao_id}/concluir`

**Quem pode:** ong

| Parâmetro | Onde | Tipo | Obrigatório |
|---|---|---|---|
| `solicitacao_id` | caminho | integer | sim |

Corpo (application/json):

| Campo | Tipo | Obrigatório |
|---|---|---|
| `obs` | string | não |


### GET `/api/solicitacoes/{solicitacao_id}`

**Quem pode:** logado

| Parâmetro | Onde | Tipo | Obrigatório |
|---|---|---|---|
| `solicitacao_id` | caminho | integer | sim |

Exemplo: `GET /api/solicitacoes/4`

```json
{
  "id": 4,
  "animalId": 1,
  "usuarioId": 2,
  "status": "em_analise",
  "score": 74,
  "mensagem": null,
  "motivoRecusa": null,
  "criadoEm": "2026-11-12T18:31:50",
  "atualizadoEm": "2026-11-15T18:31:50",
  "animal": {
    "id": 1,
    "nome": "Thor",
    "especie": "cao",
    "raca": "Vira-lata",
    "sexo": "M",
    "idadeMeses": 30,
    "porte": "grande",
    "energia": "alta",
    "status": "disponivel",
    "fotos": [
      "/animais/1-1.svg",
      "/animais/1-2.svg",
      "/animais/1-3.svg"
    ]
  },
  "usuario": {
    "id": 2,
    "nome": "Ana Souza",
    "email": "ana@email.com",
    "telefone": "(62) 91234-5678",
    "cidade": "Goiânia - GO"
  },
  "formulario": {
    "tipoMoradia": "casa",
    "temQuintal": true,
    "telaProtecao": false,
    "pessoasCasa": 3,
    "temCriancas": true,
    "outrosAnimais": false,
    "horasSozinho": 5,
    "experiencia": "alguma",
    "nivelAtividade": "medio",
    "motivacao": "Queremos um companheiro para a família e para as crianças."
  },
  "compatibilidade": {
    "score": 87,
    "fatores": [
      {
        "chave": "espaco",
        "nome": "Espaço da moradia",
        "peso": 0.2,
        "valor": 1.0,
        "descricao": "A moradia comporta bem o porte do animal."
      },
      {
        "chave": "energia",
        "nome": "Nível de energia × estilo de vida",
        "peso": 0.13,
        "valor": 0.58,
        "descricao": "Diferença moderada de ritmo."
      },
      {
        "chave": "rotina",
        "nome": "Tempo que o animal ficaria sozinho",
        "peso": 0.24,
        "valor": 1.0,
        "descricao": "Tempo sozinho dentro do tolerável."
      },
      {
        "chave": "criancas",
        "nome": "Convivência com crianças",
        "peso": 0.2,
        "valor": 1.0,
        "descricao": "Sem conflito com crianças."
      },
      {
        "chave": "animais",
        "nome": "Convivência com outros animais",
        "peso": 0.14,
        "valor": 1.0,
        "descricao": "Sem conflito com outros animais."
      },
      {
        "chave": "experiencia",
        "nome": "Experiência do adotante",
        "peso": 0.09,
        "valor": 0.85,
        "descricao": "Experiência compatíve
  …
```

### POST `/api/solicitacoes/{solicitacao_id}/acompanhamentos`

**Quem pode:** ong

| Parâmetro | Onde | Tipo | Obrigatório |
|---|---|---|---|
| `solicitacao_id` | caminho | integer | sim |

Corpo (application/json):

| Campo | Tipo | Obrigatório |
|---|---|---|
| `tipo` | string | sim |
| `data` | string | sim |
| `observacao` | string | sim |


## Notificações

### GET `/api/notificacoes`

**Quem pode:** logado

| Parâmetro | Onde | Tipo | Obrigatório |
|---|---|---|---|
| `limit` | consulta | integer | não |
| `offset` | consulta | integer | não |

Exemplo: `GET /api/notificacoes?limit=2`

```json
[
  {
    "id": 1,
    "usuarioId": 2,
    "texto": "Sua solicitação para Paçoca foi aprovada!",
    "link": "/minhas-solicitacoes",
    "lida": true,
    "criadoEm": "2026-11-13T18:31:50",
    "data": "2026-11-13T18:31:50"
  }
]
```

### POST `/api/notificacoes/marcar-lidas`

**Quem pode:** logado


## Administração

### GET `/api/admin/usuarios`

**Quem pode:** admin

| Parâmetro | Onde | Tipo | Obrigatório |
|---|---|---|---|
| `perfil` | consulta | string | não |
| `busca` | consulta | string | não |
| `limit` | consulta | integer | não |
| `offset` | consulta | integer | não |

Exemplo: `GET /api/admin/usuarios?limit=2`

```json
[
  {
    "id": 7,
    "nome": "Voluntários 4 Patas",
    "email": "amigos4patas@email.com",
    "perfil": "ong",
    "telefone": "(62) 97777-3333",
    "cidade": "Aparecida de Goiânia - GO",
    "ativo": true,
    "ongId": 3,
    "criadoEm": "2026-11-13T18:31:50"
  }
]
```

### PATCH `/api/admin/usuarios/{alvo_id}`

**Quem pode:** admin

| Parâmetro | Onde | Tipo | Obrigatório |
|---|---|---|---|
| `alvo_id` | caminho | integer | sim |

Corpo (application/json):

| Campo | Tipo | Obrigatório |
|---|---|---|
| `ativo` | boolean | sim |


### GET `/api/admin/ongs`

**Quem pode:** admin

| Parâmetro | Onde | Tipo | Obrigatório |
|---|---|---|---|
| `status` | consulta | string | não |
| `limit` | consulta | integer | não |
| `offset` | consulta | integer | não |

Exemplo: `GET /api/admin/ongs?limit=2`

```json
[
  {
    "id": 3,
    "nome": "Amigos de Quatro Patas",
    "cnpj": "11.222.333/0001-44",
    "email": "amigos4patas@email.com",
    "telefone": "(62) 97777-3333",
    "cidade": "Aparecida de Goiânia - GO",
    "descricao": "Grupo de voluntários recém-formado.",
    "status": "pendente",
    "criadoEm": "2026-11-13T18:31:50",
    "totalAnimais": 0,
    "totalAdocoes": 0
  }
]
```

### PATCH `/api/admin/ongs/{ong_id}/status`

**Quem pode:** admin

| Parâmetro | Onde | Tipo | Obrigatório |
|---|---|---|---|
| `ong_id` | caminho | integer | sim |

Corpo (application/json):

| Campo | Tipo | Obrigatório |
|---|---|---|
| `status` | string | sim |


### GET `/api/admin/animais`

**Quem pode:** admin

| Parâmetro | Onde | Tipo | Obrigatório |
|---|---|---|---|
| `status` | consulta | string | não |
| `especie` | consulta | string | não |
| `limit` | consulta | integer | não |
| `offset` | consulta | integer | não |

Exemplo: `GET /api/admin/animais?limit=2`

```json
[
  {
    "id": 49,
    "ongId": 1,
    "nome": "Biscoito",
    "especie": "gato",
    "raca": "Persa",
    "idadeMeses": 60,
    "sexo": "M",
    "porte": "pequeno",
    "energia": "alta",
    "status": "disponivel",
    "criadoEm": "2026-10-31T15:05:51",
    "fotos": [
      "/animais/4-1.svg"
    ],
    "ong": {
      "id": 1,
      "nome": "Patinhas Felizes",
      "cidade": "Goiânia - GO"
    }
  }
]
```

### DELETE `/api/admin/animais/{animal_id}`

**Quem pode:** admin

| Parâmetro | Onde | Tipo | Obrigatório |
|---|---|---|---|
| `animal_id` | caminho | integer | sim |


### GET `/api/admin/solicitacoes`

**Quem pode:** admin

| Parâmetro | Onde | Tipo | Obrigatório |
|---|---|---|---|
| `limit` | consulta | integer | não |
| `offset` | consulta | integer | não |

Exemplo: `GET /api/admin/solicitacoes?limit=2`

```json
[
  {
    "id": 3,
    "animalId": 2,
    "usuarioId": 3,
    "ongId": 2,
    "status": "pendente",
    "score": 80,
    "criadoEm": "2026-11-14T18:31:50",
    "animal": {
      "id": 2,
      "nome": "Luna"
    },
    "usuario": {
      "id": 3,
      "nome": "Carlos Lima"
    },
    "ong": {
      "id": 2,
      "nome": "Lar Animal"
    },
    "historico": [
      {
        "status": "pendente",
        "data": "2026-11-14T18:31:50",
        "obs": ""
      }
    ]
  }
]
```

### GET `/api/admin/estatisticas`

**Quem pode:** admin

Exemplo: `GET /api/admin/estatisticas`

```json
{
  "totais": {
    "animaisDisponiveis": 38,
    "emProcesso": 3,
    "adotados": 31,
    "adotantes": 43,
    "ongsAprovadas": 2,
    "ongsPendentes": 1,
    "solicitacoesAbertas": 9
  },
  "tempoMedioAdocaoDias": 14,
  "adocoesPorMes": [
    {
      "mes": "jun",
      "adocoes": 3
    },
    {
      "mes": "jul",
      "adocoes": 4
    },
    {
      "mes": "ago",
      "adocoes": 6
    },
    {
      "mes": "set",
      "adocoes": 7
    },
    {
      "mes": "out",
      "adocoes": 8
    },
    {
      "mes": "nov",
      "adocoes": 3
    }
  ],
  "porOng": [
    {
      "ong": "Lar Animal",
      "animais": 36,
      "adocoes": 12
    },
    {
      "ong": "Patinhas Felizes",
      "animais": 36,
      "adocoes": 19
    }
  ]
}
```

### GET `/api/admin/desempenho`

**Quem pode:** admin

Exemplo: `GET /api/admin/desempenho`

```json
{
  "exemplo": false,
  "dispositivo": "pthread-Intel(R) Xeon(R) Processor @ 2.10GHz (OpenCL 3.0 PoCL HSTR: pthread-x86_64-unknown-linux-gnu-icelake-client)",
  "medicoes": [
    {
      "tarefa": "Score em lote (1 adotante × 10.000 animais) (10.000 itens)",
      "sequencialMs": 55.837,
      "openclMs": 0.581
    },
    {
      "tarefa": "Score em lote (50 adotantes × 10.000 animais) (500.000 itens)",
      "sequencialMs": 2024.0,
      "openclMs": 14.895
    }
  ]
}
```

### GET `/api/admin/logs`

**Quem pode:** admin

| Parâmetro | Onde | Tipo | Obrigatório |
|---|---|---|---|
| `de` | consulta | string | não |
| `ate` | consulta | string | não |
| `entidade` | consulta | string | não |
| `acao` | consulta | string | não |
| `usuario` | consulta | integer | não |
| `limite` | consulta | integer | não |

Exemplo: `GET /api/admin/logs`

```json
[
  {
    "id": 538,
    "criadoEm": "2026-11-15T18:34:09",
    "acao": "auth.login",
    "entidade": "usuario",
    "entidadeId": 1,
    "detalhes": {
      "email": "admin@adotapet.com"
    },
    "origem": "backend",
    "ip": "testclient",
    "usuario": {
      "id": 1,
      "nome": "Administrador",
      "perfil": "admin"
    }
  }
]
```

## Saúde da API

### GET `/api`

**Quem pode:** público

Exemplo: `GET /api`

```json
{
  "mensagem": "Backend do PetConnect funcionando!"
}
```

### GET `/api/health/db`

**Quem pode:** público

Exemplo: `GET /api/health/db`

```json
{
  "status": "conectado",
  "banco": "petconnect"
}
```
