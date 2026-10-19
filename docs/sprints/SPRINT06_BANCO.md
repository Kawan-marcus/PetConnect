# Sprint 06: banco de dados

Este arquivo registra o que o banco de dados entregou na Sprint 06. O texto pode ser copiado para o PDF da equipe.
Scripts novos em `database/`: `05_sprint06_modulo3.sql`, `06_massa_dados.sql` e `07_consultas_sprint06.sql`.

---

## 1. Correções apontadas na Pré-Banca

> **[PREENCHER pela equipe]** Liste as observações da Pré-Banca sobre o banco/modelagem, a ação tomada e o que ficou pendente.

| Observação da Pré-Banca | Ação realizada | Situação |
|---|---|---|
| [PREENCHER] | [PREENCHER] | Resolvido / Pendente (prazo) |

---

## 2. Terceiro módulo: o que o banco oferece para a IA de compatibilidade

| Recurso | Para que serve |
|---|---|
| **`modelo_ia`** (tabela nova) | Registra cada versão do modelo: algoritmo, quantidade de amostras de treino, métricas (acurácia etc.) e se está ativa. **Só uma versão ativa por tipo**, garantido pelo banco (mesma técnica da RN02). Hoje a ativa é `simulacao-python-v1` (fórmula com pesos fixos). |
| **`amostra_treino`** (tabela nova) | Exemplos rotulados (adotante × animal → deu certo ou não) para treinar o modelo. |
| **`vw_dataset_treino`** | Dataset pronto: junta os casos reais do sistema (adoção concluída = 1, recusada = 0) com as amostras da tabela. |
| **`vw_features_animal` / `vw_features_adotante`** | As variáveis já convertidas em números (porte 0/1/2, energia 0/1/2, apartamento 0/1…). O processamento lê e monta os vetores NumPy/OpenCL direto, sem tratar texto. |
| **`vw_ultima_analise` / `vw_ranking_compatibilidade`** | Usa `analise_compatibilidade` como cache: a última análise de cada par e o ranking de animais por adotante. |
| **`vw_eficacia_ia`** | Mostra se a IA acerta: compara o score médio das solicitações aprovadas/concluídas com o das recusadas. Nos dados de exemplo: **79,5** contra **38**. |
| **`vw_desempenho_resumo`** | Médias sequencial × OpenCL por tarefa, a partir de `medicao_desempenho`. |
| **`sp_gerar_massa_dados(animais, adotantes)`** | Cria milhares de registros fictícios para o teste de desempenho. Com só 12 animais o paralelismo não aparece. A massa fica numa ONG pendente, então **não aparece no site** (RN04). `sp_limpar_massa_dados()` apaga tudo. Testado com 10.000 animais e 200 adotantes. |

---

## 3. Integração entre os módulos

- **`solicitacao.analise_id`** (coluna nova): a solicitação (módulo 2) passa a apontar para a análise da IA (módulo 3) que gerou o score dela. Dá para saber qual modelo calculou cada score.
- **`vw_integracao_adocao`**: uma linha por solicitação juntando os três módulos:
  - módulo 1: animal, status do animal e ONG;
  - módulo 2: adotante, status, etapas do histórico e acompanhamentos;
  - módulo 3: score, faixa de compatibilidade, análise e versão do modelo.
- **Fluxo testado** (bloco 5 do `07_consultas_sprint06.sql`, desfeito com ROLLBACK):
  1. A IA calcula a compatibilidade.
  2. O ranking mostra Pipoca (91), Nina (86) e Zeus (47).
  3. Carlos solicita a Nina, levando o score e a análise junto.
  4. A ONG analisa e aprova.
  5. A Nina passa para "em processo".
  6. A view mostra tudo numa linha, e os logs registram cada etapa com quem fez.

---

## 4. Logs (exigência do PDF: "software completo")

**`log_acao`** (tabela nova) + **6 triggers** que gravam automaticamente:

| Evento | Ação gravada | Quem fez |
|---|---|---|
| Nova etapa da solicitação | `solicitacao.pendente`, `.em_analise`, `.aprovada`, `.recusada`, `.concluida`… | `historico_solicitacao.alterado_por` |
| Animal cadastrado / status mudou / excluído | `animal.cadastrado`, `animal.status` (de → para), `animal.excluido` | `@app_usuario_id` |
| ONG aprovada ou suspensa | `ong.aprovada`, `ong.suspensa` | `@app_usuario_id` |
| Conta criada / ativada / desativada | `usuario.cadastro`, `usuario.ativado`, `usuario.desativado` | o próprio usuário / `@app_usuario_id` |

A view `vw_log_detalhado` mostra os logs com o nome e o perfil de quem fez a ação.

---

## 5. Ajustes na modelagem (registro e justificativa)

| Ajuste | Justificativa |
|---|---|
| Tabelas novas `modelo_ia`, `amostra_treino`, `log_acao` | Módulo 3 precisa de versão/métricas do modelo e de dados de treino. O PDF exige logs. |
| Coluna `solicitacao.analise_id` (FK opcional, `ON DELETE SET NULL`) | Integra o módulo 2 com o 3 sem duplicar o score nem os fatores. |
| Índices `ix_animal_publico`, `ix_solicitacao_animal_status`, `ix_analise_animal`, `ix_analise_modelo` | Deixam rápidas as consultas em lote da recomendação e a análise da ONG. |
| MER e modelo relacional atualizados | `database/diagramas/*.png`. |

O script **não apaga dados** e pode ser executado mais de uma vez: ele cria só o que ainda não existe.

---

## 6. Como executar

**Banco já existe** (caso de vocês): no MySQL Workbench, conectado como **root**, abra e execute com o raio ⚡:

1. `05_sprint06_modulo3.sql`. A última linha deve mostrar "Script 05 (Sprint 06) executado com sucesso."
2. *(Opcional, para o teste de desempenho)* `06_massa_dados.sql`.
3. `07_consultas_sprint06.sql`, **bloco por bloco**, tirando print de cada resultado. Dois comandos dão erro **de propósito**: um mostra que não dá para ter dois modelos ativos, o outro que não aceita tempo zero. O erro é a evidência.

**Banco do zero:** `01_schema` → `02_views` → `03_seed` → `05_sprint06_modulo3`.

---

## 7. O que o backend precisa fazer para usar (para a pessoa do back)

**a) Dizer ao banco quem está logado**, dentro do mesmo `with engine.begin()` da alteração. Assim os triggers gravam o autor no log:

```python
with engine.begin() as conexao:
    conexao.execute(text("SET @app_usuario_id = :id"), {"id": usuario_id})
    # ... UPDATE animal / ong / usuario ...
    conexao.execute(text("SET @app_usuario_id = NULL"))  # a conexão volta para o pool limpa
```

**b) Registrar login** (o banco não enxerga):

```python
conexao.execute(text("""
    INSERT INTO log_acao (usuario_id, acao, entidade, entidade_id, origem, ip)
    VALUES (:uid, :acao, 'usuario', :uid, 'backend', :ip)
"""), {"uid": usuario_id, "acao": "auth.login", "ip": request.client.host})
# login com senha errada: acao = 'auth.login_falhou', uid = id do e-mail (ou NULL)
```

**c) Guardar a análise e ligar à solicitação** (em `POST /api/solicitacoes`):

```python
r = calcular_compatibilidade(formulario, animal)
res = conexao.execute(text("""
    INSERT INTO analise_compatibilidade (usuario_id, animal_id, score, fatores, modelo, tempo_ms)
    VALUES (:u, :a, :s, :f, :m, :t)
"""), {"u": usuario_id, "a": animal_id, "s": r["score"], "f": json.dumps(r["fatores"]), "m": r["modelo"], "t": tempo_ms})
analise_id = res.lastrowid
# no INSERT da solicitacao, incluir a coluna analise_id = :analise_id
```

**d) Ler os dados para o OpenCL e gravar a medição:**

```python
animais = conexao.execute(text(
    "SELECT animal_id, gato, porte_cod, energia_cod, idade_meses, convive_criancas, convive_animais FROM vw_features_animal"
)).all()
matriz = np.array([tuple(l)[1:] for l in animais], dtype=np.float32)   # vai direto para o kernel
# depois de medir:
conexao.execute(text("""
    INSERT INTO medicao_desempenho (tarefa, tamanho_entrada, sequencial_ms, opencl_ms, dispositivo)
    VALUES (:t, :n, :seq, :ocl, :disp)
"""), {...})
```

**e) Ao terminar o treino**, cadastrar a versão nova e ativá-la:

```sql
UPDATE modelo_ia SET ativo = FALSE WHERE tipo = 'compatibilidade' AND ativo;
INSERT INTO modelo_ia (tipo, versao, algoritmo, amostras_treino, metricas, ativo, treinado_em)
VALUES ('compatibilidade', 'compat-arvore-v2', 'Árvore de decisão (scikit-learn)', 5000,
        JSON_OBJECT('acuracia', 0.91), TRUE, NOW());   -- usar os números reais do treino
```

O usuário `petconnect_app` do backend já tem permissão para tudo isso (SELECT, INSERT, UPDATE e DELETE).

---

## 8. Prints para o PDF (`07_consultas_sprint06.sql`)

| Bloco | O que mostra |
|---|---|
| 1 | Tabelas, views e triggers novos |
| 2 | Versão do modelo em uso |
| 3 | Variáveis em número + dataset de treino |
| 4 | Eficácia da IA (aprovadas × recusadas) |
| 5 | **Integração**: ranking, `vw_integracao_adocao` e logs do fluxo |
| 6 | Troca de modelo + erro ao tentar dois ativos |
| 7 | Resumo de desempenho + erro de tempo inválido |
| 8 | Massa de dados invisível no site |
| 9 | Últimos logs |

## 9. Dificuldades e próximos passos

- **Dificuldade:** fazer o script rodar num banco que já tem dados sem apagar nada. Foi resolvido com procedimentos que verificam antes de criar coluna, índice ou chave.
- **Dificuldade:** gerar milhares de registros de forma que funcione igual no MySQL e no MariaDB. Foi resolvido com uma sequência de dígitos, sem CTE recursiva.
- **Próximo passo:** o backend usar `analise_id`, `@app_usuario_id` e o log de login (item 7).
- **Próximo passo:** registrar o modelo treinado em `modelo_ia` e gravar as medições reais do OpenCL em `medicao_desempenho`.
