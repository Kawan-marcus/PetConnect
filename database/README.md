# Banco de dados: PetConnect (MySQL)

Banco da Plataforma de Adoção de Animais, alinhado com o front-end (`docs/CONTRATO_API.md`).

| Arquivo | O que faz |
|---|---|
| `01_schema.sql` | Cria o banco `petconnect` e as 14 tabelas, com chaves, restrições e índices |
| `02_views.sql` | Consultas prontas (animais públicos, dashboard, histórico) |
| `03_seed.sql` | Dados de exemplo: os mesmos do modo demonstração do front |
| `04_consultas_teste.sql` | Consultas de verificação e testes das regras, para as evidências do PDF |
| `diagramas/mer_conceitual.png` | MER (modelo conceitual) |
| `diagramas/modelo_relacional.png` | Modelo relacional (tabelas, PK, FK) |
| `diagramas/*.mmd` | Fonte dos diagramas (Mermaid; o GitHub mostra como imagem) |

**Requisitos:** MySQL 8.0.16+ **ou** MariaDB 10.5+ (a versão do XAMPP atual serve).

---

## Como criar o banco

### Opção 1: MySQL Workbench
1. Abra a conexão local (normalmente `root@localhost`).
2. **File → Open SQL Script** → `01_schema.sql` → clique no raio ⚡ para executar.
3. Repita com `02_views.sql` e depois com `03_seed.sql`, nessa ordem.
4. Clique com o botão direito em **Schemas** → **Refresh All**. O banco `petconnect` aparece.

### Opção 2: XAMPP (phpMyAdmin)
1. Inicie **Apache** e **MySQL** no painel do XAMPP e abra http://localhost/phpmyadmin.
2. Aba **Importar** → escolha `01_schema.sql` → **Importar**.
3. Repita com `02_views.sql` e `03_seed.sql`.

### Opção 3: Terminal
```bash
mysql -u root -p < 01_schema.sql
mysql -u root -p < 02_views.sql
mysql -u root -p < 03_seed.sql
```

> ⚠️ O `01_schema.sql` **apaga e recria** o banco `petconnect`. Use-o para começar do zero, nunca num banco com dados que precisam ser mantidos.

### Contas de exemplo (senha `123456` em todas)
| Perfil | E-mail |
|---|---|
| Admin | admin@adotapet.com |
| Adotante | ana@email.com, carlos@email.com, marina@email.com |
| ONG (aprovada) | ong@patinhas.org, ong@laranimal.org |
| ONG (pendente) | amigos4patas@email.com |

As senhas estão em **bcrypt** (`$2b$10$...`). No backend Python, a conferência no login é feita assim:
```python
import bcrypt
bcrypt.checkpw(senha_digitada.encode(), usuario.senha_hash.encode())   # True/False
# ao cadastrar:
bcrypt.hashpw(senha.encode(), bcrypt.gensalt()).decode()
```

---

## Tabelas

| Tabela | Para que serve | Requisitos |
|---|---|---|
| `usuario` | Login e perfil (adotante, ong, admin) | RF01, RF02, RF17 |
| `ong` | Instituições; status pendente/aprovada/suspensa | RF03, RF18, RN04 |
| `token_recuperacao_senha` | "Esqueci minha senha" | RF02 |
| `animal` | **Entidade principal** (CRUD da Sprint 3) | RF04, RF06, RF07, RF15, RF19 |
| `foto_animal` | Até 6 fotos por animal (ordem 0 = capa) | RF05 |
| `favorito` | Animais salvos pelo adotante (N:N) | RF09 |
| `formulario_avaliacao` | Perfil do adotante: entrada do modelo de IA | RF11 |
| `solicitacao` | Pedido de adoção e seu status | RF10, RF12–RF14 |
| `historico_solicitacao` | Cada mudança de status (linha do tempo) | RF14, RF16 |
| `acompanhamento` | Visitas e contatos pós-adoção | Acompanhamento |
| `notificacao` | Avisos do sino | Notificações |
| `analise_compatibilidade` | Resultado do modelo de compatibilidade (score + fatores) | RF20–RF22 |
| `classificacao_imagem` | Sugestão de espécie/raça/porte pela foto | RF23 |
| `medicao_desempenho` | Tempos sequencial × OpenCL do dashboard | Tópicos Avançados |

---

## Decisões de modelagem (use no texto do PDF)

1. **Regras de negócio garantidas também pelo banco.** Além da validação no backend, o próprio MySQL impede dados inválidos:
   - **RN05** (uma solicitação ativa por usuário e animal) e **RN02** (só uma solicitação aprovada por animal): colunas geradas `ativa` e `vencedora` + índices `UNIQUE`. Como o MySQL permite vários `NULL` num índice único, a coluna só vale `1` nos status que precisam ser únicos.
   - Um usuário com perfil `ong` precisa ter `ong_id`, e adotante/admin não podem ter (`CHECK`).
   - Recusa exige motivo; horas sozinho entre 0 e 24; score entre 0 e 100 (`CHECK`).
   - E-mail e CNPJ únicos.
2. **Exclusão lógica de animais** (`excluido_em`). Um animal removido some das listas, mas as solicitações e adoções dele continuam no histórico (RF16). Uma exclusão física quebraria esse histórico.
3. **Sem dados duplicados (3ª forma normal).** A ONG de uma solicitação não é gravada na solicitação: ela vem do animal (`solicitacao → animal → ong`). O mesmo vale para o animal de um acompanhamento.
4. **Histórico separado do status.** `solicitacao.status` guarda o estado atual (consulta rápida); `historico_solicitacao` guarda todas as etapas, com quem mudou e quando.
5. **Fotos em tabela própria.** O banco guarda só o endereço (`url`); o arquivo fica no servidor. Isso evita um banco pesado e permite várias fotos por animal.
6. **Tabelas do componente de IA.** Guardam as entradas e saídas dos modelos (`fatores` em JSON, versão do `modelo`, `tempo_ms`). Isso serve de cache para as recomendações, permite auditar as sugestões e alimenta o comparativo de desempenho com OpenCL.
7. **Senhas com bcrypt**, nunca em texto puro.

---

## Nomes no banco × nomes no front

O banco usa `snake_case` (padrão do MySQL); a API devolve `camelCase` (padrão do JavaScript). O backend faz a conversão. Exemplos:

| Banco | JSON da API / front |
|---|---|
| `idade_meses` | `idadeMeses` |
| `convivencia_criancas` | `convivenciaCriancas` |
| `senha_hash` | *(nunca enviado)* |
| `ong_id` | `ongId` |
| `criado_em` | `criadoEm` |
| `tipo_moradia`, `tem_quintal`, `horas_sozinho`… | `tipoMoradia`, `temQuintal`, `horasSozinho`… |
| `historico_solicitacao.observacao` / `criado_em` | `historico[].obs` / `historico[].data` |
| `notificacao.criado_em` | `data` |
| `foto_animal.url` (ordenado por `ordem`) | `fotos: ["url1", "url2"]` |
| `animal.ong_id` (via JOIN) | `solicitacao.ongId` |

Os valores dos `ENUM` são exatamente os que o front usa (`cao`, `gato`, `pequeno`, `medio`, `em_analise`…).

---

## Conexão no backend (Python)

String de conexão (SQLAlchemy + PyMySQL):
```
mysql+pymysql://root:SUA_SENHA@localhost:3306/petconnect?charset=utf8mb4
```
Guarde usuário e senha num arquivo `.env` do backend, fora do GitHub.

### Fotos de exemplo
As fotos do `03_seed.sql` apontam para `/animais/1-1.svg` etc. Esses arquivos estão na pasta `public/animais/` do front, e o Vite serve essa pasta automaticamente.
