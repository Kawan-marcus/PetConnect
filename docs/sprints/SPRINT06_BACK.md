# Sprint 06: back-end

Este arquivo registra o que o back-end entregou na Sprint 06. O texto pode ser copiado para o PDF da equipe.

---

## 1. Correções apontadas na Pré-Banca

> **[PREENCHER pela equipe]** Observações sobre o back-end, a ação tomada e o que ficou pendente.

| Observação da Pré-Banca | Ação realizada | Situação |
|---|---|---|
| [PREENCHER] | [PREENCHER] | Resolvido / Pendente (prazo) |

---

## 2. Terceiro módulo: inteligência de compatibilidade

Até a Sprint 05, o score era uma fórmula com pesos fixos escolhidos pela equipe (`simulacao-python-v1`). Na Sprint 06 ele passou a vir de um **modelo treinado**, calculado em **paralelo com OpenCL**. O código fica em `backend/app/ia/`.

### 2.1 Como o score é calculado

1. **Codificação** (`codificacao.py`): o formulário do adotante vira 9 números e o animal vira 6. Exemplos: porte pequeno/médio/grande = 0/1/2, apartamento = 1.
2. **Fatores** (`fatores.py`): 6 fatores de 0 a 1:
   - espaço da moradia × porte;
   - energia × estilo de vida;
   - horas sozinho × tolerância do animal;
   - crianças;
   - outros animais;
   - experiência × exigência do animal.
3. **Modelo treinado** (`modelo.py`, `treinar.py`): **regressão logística (scikit-learn)**. As entradas são os 6 fatores mais o pior fator; a saída é a **probabilidade de a adoção dar certo**. O score mostrado é essa probabilidade × 100. O "peso" de cada fator na tela é a importância que o modelo aprendeu.

### 2.2 Treino

- **Dados:**
  - casos reais do sistema, pela view `vw_dataset_treino` (adoção concluída = 1, solicitação recusada = 0);
  - um histórico **simulado** de 20.000 casos, porque ainda há poucas adoções reais. A simulação usa critérios das ONGs e ruído aleatório. Os casos podem ser guardados em `amostra_treino`.
- **Separação:** 80% para treino e 20% para teste.
- **Resultado** (versão `compat-logreg-v1`, 4.000 casos de teste):

| Métrica | Valor |
|---|---|
| Acurácia | 76,8% |
| Precisão | 78,7% |
| Recall | 83,1% |
| F1 | 80,8% |
| AUC | 0,841 |
| AUC da regra antiga, nos mesmos casos | 0,835 |

- **Importância aprendida:**

| Fator | Importância |
|---|---|
| Tempo sozinho | 24% |
| Crianças | 20% |
| Espaço | 20% |
| Outros animais | 14% |
| Energia | 13% |
| Experiência | 9% |

- Cada treino gera uma versão nova (`compat-logreg-v2`, `v3`…), registrada em `modelo_ia` com as métricas. Só uma versão fica ativa, garantido pelo banco.

> Sobre a comparação de AUC: o modelo treinado é melhor que a regra antiga, mas por pouco, porque o histórico ainda é simulado. A vantagem do modelo é que ele **se ajusta sozinho** quando houver mais adoções reais: basta treinar de novo.

### 2.3 Processamento paralelo (OpenCL)

- **`opencl.py`:** um **kernel OpenCL em C** calcula fatores + modelo para cada par adotante × animal. Cada par é uma thread na GPU, então milhares de animais são avaliados ao mesmo tempo.
- **Três versões que calculam o mesmo score:**
  - sequencial, em Python puro, um par por vez;
  - NumPy, vetorizado na CPU;
  - OpenCL, em paralelo na GPU.
  
  O benchmark confere que as três dão o mesmo resultado antes de medir.
- **Reserva automática:** se a máquina não tiver OpenCL, a API usa NumPy, com o mesmo resultado. Isso é controlado pela variável `IA_MOTOR` no `.env`.
- **`benchmark.py`:** mede os tempos e grava em `medicao_desempenho`. O painel do admin mostra o comparativo. As tarefas medidas são:
  - 1 adotante × todos os animais (tela Recomendados);
  - N adotantes × todos os animais.
- **Volume:** com a massa de dados do script `06_massa_dados.sql` (10.000 animais fictícios, que não aparecem no site).

Tempos medidos na máquina de desenvolvimento, **sem GPU** (3.012 animais):

| Tarefa | Sequencial (Python) | NumPy (CPU) |
|---|---|---|
| 1 adotante × 3.012 animais | 13,0 ms | 0,6 ms |
| 10 adotantes × 3.012 animais | 129,0 ms | 4,7 ms |

> **[PREENCHER]** Rode `python -m app.ia.benchmark --registrar` num computador com placa de vídeo e cole aqui a tabela com a coluna OpenCL e o print do painel do admin.

---

## 3. Integração entre os módulos

| Onde | O que mudou |
|---|---|
| `GET /api/ia/recomendacoes` | Calcula o score contra **todos** os animais disponíveis em lote (OpenCL ou NumPy), devolve o tempo real (`tempoMs`), o motor usado e grava as análises dos recomendados em `analise_compatibilidade`. Também deixou de mostrar animais excluídos (antes eles apareciam). |
| `POST /api/solicitacoes` | O módulo 2 usa o módulo 3: o score vem do modelo treinado, a análise é gravada e a solicitação guarda o `analise_id` (rastreia qual versão do modelo deu aquele score). |
| `GET /api/solicitacoes/:id` | A ONG vê a compatibilidade calculada pelo modelo atual. |
| `GET /api/ia/modelo` (nova) | Mostra a versão do modelo, as métricas do treino, a importância dos fatores e se está rodando em OpenCL ou NumPy. |
| `modelo_ia` | A versão em uso é registrada automaticamente no banco na primeira análise. |

**Fluxo testado de ponta a ponta** (API + banco MySQL-compatível):
1. Ana vê os recomendados (10 animais processados).
2. Carlos solicita a Nina; a solicitação fica com score e `analise_id`.
3. A ONG analisa e aprova; a Nina vai para "em processo".
4. O admin aprova uma ONG.
5. Tudo aparece em `vw_integracao_adocao` e nos logs.

---

## 4. Logs

- **Login** (`app/logs.py`): `auth.login`, `auth.login_falhou` e `auth.login_conta_inativa` são gravados em `log_acao` com o IP. A senha nunca é registrada.
- **Mudanças de status:** são gravadas pelos triggers do banco. As rotas agora informam **quem** fez (`definir_usuario_logado`). Exemplo real do teste:

| Ação | Quem |
|---|---|
| `solicitacao.pendente` | Carlos Lima |
| `solicitacao.em_analise` | Equipe Patinhas |
| `solicitacao.aprovada` | Equipe Patinhas |
| `animal.status` | Equipe Patinhas |
| `ong.aprovada` | Administrador |

- A conexão com o banco zera esse "usuário logado" a cada requisição, para um pedido nunca herdar o usuário de outro.
- Os logs também saem no terminal do uvicorn.

---

## 5. Como rodar (Windows, pasta `backend`, venv ativado)

```bash
pip install -r requirements.txt                 # agora inclui numpy e scikit-learn
pip install -r requirements-opencl.txt          # opcional: OpenCL (precisa do driver da placa de vídeo)
python -m app.ia.treinar --registrar            # treina e registra o modelo
python -m app.ia.benchmark --registrar          # mede sequencial × OpenCL e grava no banco
uvicorn app.main:app --reload --port 8000
```

Antes, o banco precisa ter os scripts `05_sprint06_modulo3.sql` e `06_massa_dados.sql` (este é para o benchmark).

## 6. Dificuldades e próximos passos

- **Dificuldade:** garantir que as versões sequencial, NumPy e OpenCL deem exatamente o mesmo resultado. Foi resolvido escrevendo o kernel com as mesmas contas e conferindo automaticamente no benchmark.
- **Dificuldade:** o OpenCL não existe em todas as máquinas. Foi resolvido com a reserva automática em NumPy.
- **Próximos passos:**
  - medir com GPU e registrar os tempos;
  - treinar de novo quando houver adoções reais;
  - classificação de espécie e porte pela foto (`POST /api/ia/classificar-imagem`). O front já está preparado.
