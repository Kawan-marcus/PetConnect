-- =============================================================================
--  PetConnect — Script 07: consultas de verificação da Sprint 06 (evidências)
--  Rode cada bloco separadamente no MySQL Workbench e tire print do resultado.
--  Os testes que gravam dados ficam dentro de transações com ROLLBACK:
--  o banco volta exatamente como estava.
-- =============================================================================

USE petconnect;

-- -----------------------------------------------------------------------------
-- 1) Estrutura nova da Sprint 06
-- -----------------------------------------------------------------------------
SELECT table_name AS objeto, table_type AS tipo, table_comment AS descricao
FROM information_schema.tables
WHERE table_schema = 'petconnect'
  AND table_name IN ('modelo_ia', 'amostra_treino', 'log_acao',
                     'vw_features_animal', 'vw_features_adotante', 'vw_dataset_treino',
                     'vw_ultima_analise', 'vw_ranking_compatibilidade', 'vw_integracao_adocao',
                     'vw_eficacia_ia', 'vw_desempenho_resumo', 'vw_log_detalhado')
ORDER BY table_type, table_name;

SELECT trigger_name AS gatilho, event_manipulation AS evento, event_object_table AS tabela
FROM information_schema.triggers
WHERE trigger_schema = 'petconnect'
ORDER BY event_object_table;

-- -----------------------------------------------------------------------------
-- 2) Módulo 3: versão do modelo de IA em uso
-- -----------------------------------------------------------------------------
SELECT tipo, versao, algoritmo, amostras_treino, metricas, ativo, treinado_em
FROM modelo_ia
ORDER BY tipo, criado_em;

-- -----------------------------------------------------------------------------
-- 3) Módulo 3: variáveis já em número, prontas para o modelo e o OpenCL
-- -----------------------------------------------------------------------------
SELECT * FROM vw_features_animal   ORDER BY animal_id LIMIT 12;
SELECT * FROM vw_features_adotante ORDER BY usuario_id;

-- Dataset de treino: casos reais do sistema (concluída = 1, recusada = 0) + amostras
SELECT origem, rotulo, COUNT(*) AS casos
FROM vw_dataset_treino
GROUP BY origem, rotulo
ORDER BY origem, rotulo;

-- -----------------------------------------------------------------------------
-- 4) Eficácia da IA: score médio por resultado da solicitação
-- -----------------------------------------------------------------------------
SELECT * FROM vw_eficacia_ia ORDER BY score_medio DESC;

-- -----------------------------------------------------------------------------
-- 5) INTEGRAÇÃO ENTRE OS MÓDULOS (fluxo completo, desfeito no final)
--    Simula o que o backend faz quando Carlos pede a Nina e a ONG aprova:
--    módulo 3 calcula → módulo 2 registra o pedido → módulo 1 muda o animal.
-- -----------------------------------------------------------------------------
START TRANSACTION;

-- Módulo 3: o modelo calcula a compatibilidade de Carlos (id 3) com alguns animais
INSERT INTO analise_compatibilidade (usuario_id, animal_id, score, fatores, modelo, tempo_ms) VALUES
  (3, 8,  86, JSON_ARRAY(JSON_OBJECT('chave', 'espaco', 'valor', 1.0), JSON_OBJECT('chave', 'energia', 'valor', 0.58)), 'simulacao-python-v1', 0.42),
  (3, 6,  91, JSON_ARRAY(JSON_OBJECT('chave', 'espaco', 'valor', 1.0), JSON_OBJECT('chave', 'energia', 'valor', 1.0)),  'simulacao-python-v1', 0.40),
  (3, 11, 47, JSON_ARRAY(JSON_OBJECT('chave', 'espaco', 'valor', 0.4), JSON_OBJECT('chave', 'energia', 'valor', 0.16)), 'simulacao-python-v1', 0.39);
SET @analise_nina = (SELECT MAX(id) FROM analise_compatibilidade WHERE usuario_id = 3 AND animal_id = 8);

-- Ranking das recomendações de Carlos (posição 1 = mais compatível)
SELECT posicao, animal, especie, porte, ong, score, modelo
FROM vw_ranking_compatibilidade
WHERE usuario_id = 3
ORDER BY posicao;

-- Módulo 2: Carlos envia a solicitação; o score e a análise vão junto
SET @app_usuario_id = 3;
INSERT INTO solicitacao (animal_id, usuario_id, status, score, analise_id, mensagem)
VALUES (8, 3, 'pendente', 86, @analise_nina, 'Tenho casa com quintal e trabalho de casa.');
SET @sol = LAST_INSERT_ID();
INSERT INTO historico_solicitacao (solicitacao_id, status, observacao, alterado_por) VALUES (@sol, 'pendente', '', 3);

-- A ONG Patinhas (usuário 4) analisa e aprova (RN02: animal passa para "em processo")
SET @app_usuario_id = 4;
UPDATE solicitacao SET status = 'em_analise' WHERE id = @sol;
INSERT INTO historico_solicitacao (solicitacao_id, status, observacao, alterado_por) VALUES (@sol, 'em_analise', '', 4);
UPDATE solicitacao SET status = 'aprovada' WHERE id = @sol;
INSERT INTO historico_solicitacao (solicitacao_id, status, observacao, alterado_por) VALUES (@sol, 'aprovada', 'Visita agendada.', 4);
UPDATE animal SET status = 'em_processo' WHERE id = 8;   -- módulo 1

-- Resultado: uma linha juntando os três módulos
SELECT * FROM vw_integracao_adocao WHERE solicitacao_id = @sol;

-- Logs gerados automaticamente pelos triggers durante o fluxo
SELECT criado_em, acao, entidade, entidade_id, usuario, perfil, detalhes
FROM vw_log_detalhado
WHERE (entidade = 'solicitacao' AND entidade_id = @sol) OR (entidade = 'animal' AND entidade_id = 8)
ORDER BY id;

ROLLBACK;
SET @app_usuario_id = NULL;

-- -----------------------------------------------------------------------------
-- 6) Troca do modelo: só UM modelo ativo por tipo (desfeito no final)
-- -----------------------------------------------------------------------------
START TRANSACTION;
-- Do jeito certo: desativa a versão antiga e ativa a nova
UPDATE modelo_ia SET ativo = FALSE WHERE tipo = 'compatibilidade' AND ativo;
INSERT INTO modelo_ia (tipo, versao, algoritmo, amostras_treino, metricas, ativo, treinado_em)
VALUES ('compatibilidade', 'compat-arvore-v2', 'Árvore de decisão (scikit-learn)', 5000,
        JSON_OBJECT('acuracia', 0.0, 'observacao', 'exemplo de formato: o backend grava os valores reais'), TRUE, NOW());
SELECT versao, algoritmo, ativo FROM modelo_ia WHERE tipo = 'compatibilidade';
ROLLBACK;

-- Esperado: ERRO 1062 Duplicate entry ... for key 'uq_modelo_ativo_por_tipo'
-- (não dá para deixar dois modelos ativos ao mesmo tempo)
INSERT INTO modelo_ia (tipo, versao, algoritmo, ativo)
VALUES ('compatibilidade', 'teste-segundo-ativo', 'teste', TRUE);

-- -----------------------------------------------------------------------------
-- 7) Desempenho sequencial × OpenCL
--    Fica vazio até o módulo de processamento gravar as medições reais.
-- -----------------------------------------------------------------------------
SELECT * FROM vw_desempenho_resumo;

-- Esperado: ERRO 3819 Check constraint 'ck_medicao_tempos' is violated (tempo zero não é medição válida)
INSERT INTO medicao_desempenho (tarefa, tamanho_entrada, sequencial_ms, opencl_ms, dispositivo)
VALUES ('teste inválido', 10, 100, 0, 'teste');

-- -----------------------------------------------------------------------------
-- 8) Massa de dados: gera, confere que não aparece no site e apaga
-- -----------------------------------------------------------------------------
SELECT COUNT(*) AS visiveis_no_site_antes FROM vw_animal_publico;
CALL sp_gerar_massa_dados(1000, 50);
SELECT COUNT(*) AS visiveis_no_site_depois FROM vw_animal_publico;            -- igual ao "antes"
SELECT COUNT(*) AS linhas_para_processamento FROM vw_features_animal;         -- 1000 a mais
SELECT COUNT(*) AS logs_gerados_pela_massa FROM log_acao
WHERE entidade = 'animal'
  AND entidade_id IN (SELECT a.id FROM animal a JOIN ong o ON o.id = a.ong_id WHERE o.cnpj = '99.999.999/0001-99');  -- esperado: 0
CALL sp_limpar_massa_dados();

-- -----------------------------------------------------------------------------
-- 9) Logs do sistema (últimas ações)
-- -----------------------------------------------------------------------------
SELECT criado_em, acao, entidade, entidade_id, usuario, origem
FROM vw_log_detalhado
ORDER BY id DESC
LIMIT 20;
