-- =============================================================================
--  PetConnect — Script 05: Sprint 06 (módulo 3, integração e logs)
--
--  O que este script faz:
--   1. Tabelas novas: modelo_ia (versões do modelo de IA), amostra_treino
--      (dados de treino do modelo) e log_acao (registro de ações/logs).
--   2. Liga a solicitação à análise da IA que gerou o score (solicitacao.analise_id).
--   3. Índices para as consultas do módulo 3 (recomendação em lote).
--   4. Views do módulo 3: variáveis já codificadas em números para o modelo/OpenCL,
--      dataset de treino, ranking de compatibilidade, integração entre os módulos,
--      eficácia da IA e resumo do desempenho sequencial × OpenCL.
--   5. Triggers que gravam o log automaticamente quando um status muda.
--   6. Procedures para gerar e apagar a massa de dados do teste de desempenho.
--
--  Pode ser executado num banco que JÁ TEM DADOS: não apaga nada e pode ser
--  rodado mais de uma vez sem erro.
--  Ordem: 01_schema → 02_views → 03_seed → 05_sprint06_modulo3 (este)
--  Requer MySQL 8.0.16+ (ou MariaDB 10.5+). No Workbench, execute o arquivo
--  inteiro com o raio ⚡ (não use "executar só a linha atual").
-- =============================================================================

USE petconnect;

-- -----------------------------------------------------------------------------
-- Procedimentos auxiliares: criam coluna/índice/chave estrangeira só se ainda
-- não existirem. Assim o script pode ser executado de novo sem dar erro.
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_aux_adicionar_coluna;
DROP PROCEDURE IF EXISTS sp_aux_adicionar_indice;
DROP PROCEDURE IF EXISTS sp_aux_adicionar_fk;

DELIMITER $$

CREATE PROCEDURE sp_aux_adicionar_coluna(IN p_tabela VARCHAR(64), IN p_coluna VARCHAR(64), IN p_definicao TEXT)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = DATABASE() AND table_name = p_tabela AND column_name = p_coluna) THEN
    SET @sql_aux = CONCAT('ALTER TABLE `', p_tabela, '` ADD COLUMN `', p_coluna, '` ', p_definicao);
    PREPARE comando FROM @sql_aux;
    EXECUTE comando;
    DEALLOCATE PREPARE comando;
  END IF;
END$$

CREATE PROCEDURE sp_aux_adicionar_indice(IN p_tabela VARCHAR(64), IN p_indice VARCHAR(64), IN p_colunas TEXT)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.statistics
                 WHERE table_schema = DATABASE() AND table_name = p_tabela AND index_name = p_indice) THEN
    SET @sql_aux = CONCAT('ALTER TABLE `', p_tabela, '` ADD INDEX `', p_indice, '` (', p_colunas, ')');
    PREPARE comando FROM @sql_aux;
    EXECUTE comando;
    DEALLOCATE PREPARE comando;
  END IF;
END$$

CREATE PROCEDURE sp_aux_adicionar_fk(IN p_tabela VARCHAR(64), IN p_nome VARCHAR(64), IN p_definicao TEXT)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE table_schema = DATABASE() AND table_name = p_tabela
                   AND constraint_name = p_nome AND constraint_type = 'FOREIGN KEY') THEN
    SET @sql_aux = CONCAT('ALTER TABLE `', p_tabela, '` ADD CONSTRAINT `', p_nome, '` ', p_definicao);
    PREPARE comando FROM @sql_aux;
    EXECUTE comando;
    DEALLOCATE PREPARE comando;
  END IF;
END$$

DELIMITER ;

-- =============================================================================
--  1. TABELAS NOVAS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- MODELO_IA: cada versão do modelo usada pelo sistema, com as métricas do treino.
-- Só pode existir UM modelo ativo por tipo (coluna gerada + UNIQUE, mesma técnica
-- da RN02). Trocar a fórmula fixa pelo modelo treinado = cadastrar a versão nova
-- e marcar como ativa; as análises antigas continuam apontando para a versão delas.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS modelo_ia (
  id               INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  tipo             ENUM('compatibilidade','visao') NOT NULL,
  versao           VARCHAR(40)      NOT NULL COMMENT 'Mesmo texto gravado em analise_compatibilidade.modelo',
  algoritmo        VARCHAR(120)     NOT NULL COMMENT 'Ex.: regra ponderada, árvore de decisão, regressão logística',
  descricao        TEXT             NULL,
  amostras_treino  INT UNSIGNED     NULL COMMENT 'Quantas amostras foram usadas no treino (NULL = sem treino)',
  metricas         JSON             NULL COMMENT 'Ex.: {"acuracia": 0.91, "precisao": 0.89, "f1": 0.90}',
  parametros       JSON             NULL COMMENT 'Pesos, hiperparâmetros etc.',
  ativo            BOOLEAN          NOT NULL DEFAULT FALSE,
  ativo_unico      TINYINT GENERATED ALWAYS AS (IF(ativo, 1, NULL)) STORED,
  treinado_em      DATETIME         NULL,
  criado_em        DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_modelo_versao (versao),
  UNIQUE KEY uq_modelo_ativo_por_tipo (tipo, ativo_unico)
) ENGINE=InnoDB COMMENT='Versões dos modelos de IA e métricas do treino';

-- -----------------------------------------------------------------------------
-- AMOSTRA_TREINO: exemplos rotulados para treinar o modelo de compatibilidade.
-- Mesmas colunas da view vw_dataset_treino (variáveis já em número).
-- origem 'sintetico' = gerada por script; 'importado' = vinda de outra base.
-- Os casos reais do próprio sistema entram pela view (solicitações concluídas/recusadas).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS amostra_treino (
  id                    INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  origem                ENUM('sintetico','importado') NOT NULL DEFAULT 'sintetico',
  -- adotante
  apartamento           TINYINT UNSIGNED  NOT NULL COMMENT '1 = apartamento, 0 = casa',
  tem_quintal           TINYINT UNSIGNED  NOT NULL,
  tela_protecao         TINYINT UNSIGNED  NOT NULL,
  pessoas_casa          TINYINT UNSIGNED  NOT NULL,
  tem_criancas          TINYINT UNSIGNED  NOT NULL,
  outros_animais        TINYINT UNSIGNED  NOT NULL,
  horas_sozinho         TINYINT UNSIGNED  NOT NULL,
  experiencia_cod       TINYINT UNSIGNED  NOT NULL COMMENT '0 nenhuma, 1 alguma, 2 muita',
  atividade_cod         TINYINT UNSIGNED  NOT NULL COMMENT '0 baixo, 1 medio, 2 alto',
  -- animal
  gato                  TINYINT UNSIGNED  NOT NULL COMMENT '1 = gato, 0 = cão',
  porte_cod             TINYINT UNSIGNED  NOT NULL COMMENT '0 pequeno, 1 medio, 2 grande',
  energia_cod           TINYINT UNSIGNED  NOT NULL COMMENT '0 baixa, 1 media, 2 alta',
  idade_meses           SMALLINT UNSIGNED NOT NULL,
  convive_criancas      TINYINT UNSIGNED  NOT NULL,
  convive_animais       TINYINT UNSIGNED  NOT NULL,
  -- resposta
  rotulo                TINYINT UNSIGNED  NOT NULL COMMENT '1 = adoção deu certo, 0 = não deu certo',
  criado_em             DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_amostra_origem (origem),
  CONSTRAINT ck_amostra_rotulo CHECK (rotulo IN (0, 1)),
  CONSTRAINT ck_amostra_horas  CHECK (horas_sozinho BETWEEN 0 AND 24),
  CONSTRAINT ck_amostra_codigos CHECK (experiencia_cod <= 2 AND atividade_cod <= 2 AND porte_cod <= 2 AND energia_cod <= 2)
) ENGINE=InnoDB COMMENT='Amostras rotuladas para treinar o modelo de compatibilidade';

-- -----------------------------------------------------------------------------
-- LOG_ACAO: registro das ações importantes do sistema (exigido no PDF: "logs").
-- Preenchido de dois jeitos:
--   - automaticamente pelos triggers abaixo (mudanças de status);
--   - pelo backend, para eventos que o banco não enxerga (login, login falho...).
-- usuario_id = quem fez a ação (NULL = sistema/automático).
-- Sem CASCADE: se o usuário for apagado, o log continua (usuario_id vira NULL).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS log_acao (
  id            BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  usuario_id    INT UNSIGNED     NULL,
  acao          VARCHAR(60)      NOT NULL COMMENT 'Ex.: solicitacao.aprovada, animal.status, auth.login',
  entidade      VARCHAR(40)      NOT NULL COMMENT 'Tabela afetada: solicitacao, animal, ong, usuario...',
  entidade_id   BIGINT UNSIGNED  NULL,
  detalhes      JSON             NULL,
  origem        ENUM('trigger','backend') NOT NULL DEFAULT 'backend',
  ip            VARCHAR(45)      NULL COMMENT 'IPv4 ou IPv6 (preenchido pelo backend)',
  criado_em     DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_log_data (criado_em),
  KEY ix_log_entidade (entidade, entidade_id),
  KEY ix_log_usuario (usuario_id, criado_em),
  KEY ix_log_acao (acao),
  CONSTRAINT fk_log_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Logs de auditoria do sistema';

-- =============================================================================
--  2. INTEGRAÇÃO: a solicitação guarda qual análise da IA gerou o score dela
-- =============================================================================
CALL sp_aux_adicionar_coluna('solicitacao', 'analise_id',
  'BIGINT UNSIGNED NULL COMMENT ''Análise da IA usada no score (analise_compatibilidade.id)'' AFTER score');
CALL sp_aux_adicionar_fk('solicitacao', 'fk_solicitacao_analise',
  'FOREIGN KEY (analise_id) REFERENCES analise_compatibilidade (id) ON DELETE SET NULL');

-- =============================================================================
--  3. ÍNDICES para o módulo 3
-- =============================================================================
-- Recomendação em lote: "todos os animais públicos" (não excluídos, disponíveis, por ONG)
CALL sp_aux_adicionar_indice('animal', 'ix_animal_publico', 'excluido_em, status, ong_id');
-- Concorrência por animal na análise da ONG e RN02
CALL sp_aux_adicionar_indice('solicitacao', 'ix_solicitacao_animal_status', 'animal_id, status');
-- Última análise de um animal e histórico por versão do modelo
CALL sp_aux_adicionar_indice('analise_compatibilidade', 'ix_analise_animal', 'animal_id, calculado_em');
CALL sp_aux_adicionar_indice('analise_compatibilidade', 'ix_analise_modelo', 'modelo, calculado_em');

-- =============================================================================
--  4. DADOS INICIAIS DO MÓDULO 3
-- =============================================================================
-- O cálculo atual do backend (fórmula com pesos fixos) é registrado como a versão
-- ativa. Quando o modelo treinado ficar pronto, o backend cadastra a nova versão
-- (ver docs/sprints/SPRINT06_BANCO.md) e esta deixa de ser a ativa.
INSERT INTO modelo_ia (tipo, versao, algoritmo, descricao, amostras_treino, metricas, parametros, ativo, treinado_em)
SELECT 'compatibilidade', 'simulacao-python-v1', 'Regra ponderada (pesos fixos)',
       'Primeira versão: soma ponderada de 6 fatores (espaço, energia, rotina, crianças, outros animais, experiência). Sem treino.',
       NULL, NULL,
       JSON_OBJECT('espaco', 0.22, 'energia', 0.20, 'rotina', 0.18, 'criancas', 0.15, 'animais', 0.13, 'experiencia', 0.12),
       TRUE, NULL
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM modelo_ia m1 WHERE m1.versao = 'simulacao-python-v1')
  AND NOT EXISTS (SELECT 1 FROM modelo_ia m2 WHERE m2.tipo = 'compatibilidade' AND m2.ativo);

-- =============================================================================
--  5. VIEWS DO MÓDULO 3
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Variáveis do ANIMAL já convertidas em número (entrada do modelo e do OpenCL).
-- O backend lê esta view e monta os vetores NumPy direto, sem converter texto.
-- publico = 1 se aparece na plataforma (não excluído, não adotado, ONG aprovada).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_features_animal AS
SELECT
  a.id                                              AS animal_id,
  a.ong_id,
  IF(a.especie = 'gato', 1, 0)                      AS gato,
  CASE a.porte   WHEN 'pequeno' THEN 0 WHEN 'medio' THEN 1 ELSE 2 END AS porte_cod,
  CASE a.energia WHEN 'baixa'   THEN 0 WHEN 'media' THEN 1 ELSE 2 END AS energia_cod,
  a.idade_meses,
  IF(a.convivencia_criancas, 1, 0)                  AS convive_criancas,
  IF(a.convivencia_animais, 1, 0)                   AS convive_animais,
  a.status,
  IF(a.status = 'disponivel' AND o.status = 'aprovada', 1, 0) AS publico
FROM animal a
JOIN ong o ON o.id = a.ong_id
WHERE a.excluido_em IS NULL;

-- -----------------------------------------------------------------------------
-- Variáveis do ADOTANTE (formulário de avaliação) convertidas em número.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_features_adotante AS
SELECT
  f.usuario_id,
  IF(f.tipo_moradia = 'apartamento', 1, 0)          AS apartamento,
  IF(f.tem_quintal, 1, 0)                           AS tem_quintal,
  IF(f.tela_protecao, 1, 0)                         AS tela_protecao,
  f.pessoas_casa,
  IF(f.tem_criancas, 1, 0)                          AS tem_criancas,
  IF(f.outros_animais, 1, 0)                        AS outros_animais,
  f.horas_sozinho,
  CASE f.experiencia     WHEN 'nenhuma' THEN 0 WHEN 'alguma' THEN 1 ELSE 2 END AS experiencia_cod,
  CASE f.nivel_atividade WHEN 'baixo'   THEN 0 WHEN 'medio'  THEN 1 ELSE 2 END AS atividade_cod
FROM formulario_avaliacao f
JOIN usuario u ON u.id = f.usuario_id
WHERE u.ativo;

-- -----------------------------------------------------------------------------
-- DATASET DE TREINO: une os casos reais do sistema com as amostras da tabela.
-- Caso real: solicitação finalizada → concluida = 1 (deu certo), recusada = 0.
-- (Canceladas e encerradas ficam de fora: não dizem nada sobre compatibilidade.)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_dataset_treino AS
SELECT
  'sistema' AS origem, s.id AS referencia_id,
  ad.apartamento, ad.tem_quintal, ad.tela_protecao, ad.pessoas_casa, ad.tem_criancas, ad.outros_animais,
  ad.horas_sozinho, ad.experiencia_cod, ad.atividade_cod,
  an.gato, an.porte_cod, an.energia_cod, an.idade_meses, an.convive_criancas, an.convive_animais,
  IF(s.status = 'concluida', 1, 0) AS rotulo
FROM solicitacao s
JOIN vw_features_adotante ad ON ad.usuario_id = s.usuario_id
JOIN (  -- inclui animais já excluídos: o caso continua valendo para o treino
  SELECT a.id AS animal_id, IF(a.especie = 'gato', 1, 0) AS gato,
         CASE a.porte WHEN 'pequeno' THEN 0 WHEN 'medio' THEN 1 ELSE 2 END AS porte_cod,
         CASE a.energia WHEN 'baixa' THEN 0 WHEN 'media' THEN 1 ELSE 2 END AS energia_cod,
         a.idade_meses, IF(a.convivencia_criancas, 1, 0) AS convive_criancas, IF(a.convivencia_animais, 1, 0) AS convive_animais
  FROM animal a
) an ON an.animal_id = s.animal_id
WHERE s.status IN ('concluida', 'recusada')
UNION ALL
SELECT
  t.origem, t.id,
  t.apartamento, t.tem_quintal, t.tela_protecao, t.pessoas_casa, t.tem_criancas, t.outros_animais,
  t.horas_sozinho, t.experiencia_cod, t.atividade_cod,
  t.gato, t.porte_cod, t.energia_cod, t.idade_meses, t.convive_criancas, t.convive_animais,
  t.rotulo
FROM amostra_treino t;

-- -----------------------------------------------------------------------------
-- Última análise de cada par adotante × animal (cache das recomendações).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_ultima_analise AS
SELECT id, usuario_id, animal_id, score, fatores, modelo, tempo_ms, calculado_em
FROM (
  SELECT ac.*,
         ROW_NUMBER() OVER (PARTITION BY ac.usuario_id, ac.animal_id ORDER BY ac.calculado_em DESC, ac.id DESC) AS ordem
  FROM analise_compatibilidade ac
) ult
WHERE ordem = 1;

-- -----------------------------------------------------------------------------
-- RANKING de compatibilidade por adotante, só com animais que estão na plataforma.
-- posicao 1 = animal mais compatível com aquele adotante.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_ranking_compatibilidade AS
SELECT
  ua.usuario_id,
  u.nome                    AS adotante,
  ua.animal_id,
  a.nome                    AS animal,
  a.especie,
  a.porte,
  o.nome                    AS ong,
  ua.score,
  ua.modelo,
  ua.calculado_em,
  ROW_NUMBER() OVER (PARTITION BY ua.usuario_id ORDER BY ua.score DESC, ua.calculado_em DESC) AS posicao
FROM vw_ultima_analise ua
JOIN usuario u ON u.id = ua.usuario_id
JOIN animal  a ON a.id = ua.animal_id
JOIN ong     o ON o.id = a.ong_id
WHERE a.excluido_em IS NULL AND a.status = 'disponivel' AND o.status = 'aprovada';

-- -----------------------------------------------------------------------------
-- INTEGRAÇÃO ENTRE OS MÓDULOS: uma linha por solicitação, juntando
--   módulo 1 (animal e ONG) + módulo 2 (solicitação, histórico, pós-adoção)
--   + módulo 3 (score, análise e versão do modelo da IA).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_integracao_adocao AS
SELECT
  s.id                                   AS solicitacao_id,
  -- Módulo 1: cadastro de animais e ONGs
  a.id                                   AS animal_id,
  a.nome                                 AS animal,
  a.especie,
  a.status                               AS status_animal,
  o.nome                                 AS ong,
  -- Módulo 2: adoção
  u.nome                                 AS adotante,
  s.status                               AS status_solicitacao,
  s.criado_em                            AS solicitada_em,
  (SELECT COUNT(*) FROM historico_solicitacao h WHERE h.solicitacao_id = s.id) AS etapas_historico,
  (SELECT COUNT(*) FROM acompanhamento ac WHERE ac.solicitacao_id = s.id)       AS acompanhamentos,
  -- Módulo 3: inteligência de compatibilidade
  s.score,
  CASE WHEN s.score IS NULL THEN NULL WHEN s.score >= 75 THEN 'alta' WHEN s.score >= 50 THEN 'moderada' ELSE 'baixa' END AS faixa_compatibilidade,
  s.analise_id,
  an.modelo                              AS modelo_ia,
  an.calculado_em                        AS analisada_em
FROM solicitacao s
JOIN animal  a ON a.id = s.animal_id
JOIN ong     o ON o.id = a.ong_id
JOIN usuario u ON u.id = s.usuario_id
LEFT JOIN analise_compatibilidade an ON an.id = s.analise_id;

-- -----------------------------------------------------------------------------
-- EFICÁCIA DA IA: o score ajuda a prever o resultado?
-- Compara o score médio das solicitações por resultado final.
-- Se as aprovadas/concluídas tiverem score maior que as recusadas, a IA está
-- apontando na direção certa (evidência para o documento e para a banca).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_eficacia_ia AS
SELECT
  CASE
    WHEN s.status IN ('aprovada', 'concluida') THEN 'aprovada / concluída'
    WHEN s.status = 'recusada'                 THEN 'recusada'
    WHEN s.status IN ('pendente', 'em_analise') THEN 'em aberto'
    ELSE 'cancelada / encerrada'
  END                                   AS resultado,
  COUNT(*)                              AS solicitacoes,
  ROUND(AVG(s.score), 1)                AS score_medio,
  MIN(s.score)                          AS score_minimo,
  MAX(s.score)                          AS score_maximo,
  SUM(s.score >= 75)                    AS com_alta_compatibilidade
FROM solicitacao s
WHERE s.score IS NOT NULL
GROUP BY 1;

-- -----------------------------------------------------------------------------
-- DESEMPENHO sequencial × OpenCL: média de todas as medições de cada tarefa.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_desempenho_resumo AS
SELECT
  tarefa,
  MAX(tamanho_entrada)                           AS maior_entrada,
  COUNT(*)                                       AS medicoes,
  ROUND(AVG(sequencial_ms), 2)                   AS sequencial_medio_ms,
  ROUND(AVG(opencl_ms), 2)                       AS opencl_medio_ms,
  ROUND(AVG(sequencial_ms) / AVG(opencl_ms), 2)  AS ganho_medio,
  ROUND(MAX(sequencial_ms / opencl_ms), 2)       AS melhor_ganho,
  MAX(dispositivo)                               AS dispositivo,
  MAX(medido_em)                                 AS ultima_medicao
FROM medicao_desempenho
GROUP BY tarefa;

-- -----------------------------------------------------------------------------
-- Logs com o nome de quem fez a ação (tela de auditoria / evidência no PDF).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_log_detalhado AS
SELECT
  l.id, l.criado_em, l.acao, l.entidade, l.entidade_id,
  COALESCE(u.nome, 'Sistema') AS usuario,
  u.perfil,
  l.origem, l.detalhes, l.ip
FROM log_acao l
LEFT JOIN usuario u ON u.id = l.usuario_id;

-- =============================================================================
--  6. TRIGGERS DE LOG
--  Gravam automaticamente as mudanças importantes, mesmo que o backend esqueça.
--  Quem fez a ação:
--   - solicitações: vem de historico_solicitacao.alterado_por (o backend já grava);
--   - demais tabelas: variável @app_usuario_id, que o backend define na mesma
--     conexão antes do UPDATE (ver docs/sprints/SPRINT06_BANCO.md). Sem ela, fica NULL.
--  @massa_dados = 1 desliga os logs durante a geração da massa de dados de teste.
-- =============================================================================
DROP TRIGGER IF EXISTS trg_log_historico_solicitacao;
DROP TRIGGER IF EXISTS trg_log_animal_cadastro;
DROP TRIGGER IF EXISTS trg_log_animal_alteracao;
DROP TRIGGER IF EXISTS trg_log_ong_status;
DROP TRIGGER IF EXISTS trg_log_usuario_cadastro;
DROP TRIGGER IF EXISTS trg_log_usuario_ativo;

DELIMITER $$

-- Cada etapa da solicitação (pendente, em análise, aprovada, recusada, concluída...)
CREATE TRIGGER trg_log_historico_solicitacao
AFTER INSERT ON historico_solicitacao
FOR EACH ROW
BEGIN
  INSERT INTO log_acao (usuario_id, acao, entidade, entidade_id, detalhes, origem)
  VALUES (NEW.alterado_por, CONCAT('solicitacao.', NEW.status), 'solicitacao', NEW.solicitacao_id,
          JSON_OBJECT('observacao', NEW.observacao), 'trigger');
END$$

CREATE TRIGGER trg_log_animal_cadastro
AFTER INSERT ON animal
FOR EACH ROW
BEGIN
  IF COALESCE(@massa_dados, 0) = 0 THEN
    INSERT INTO log_acao (usuario_id, acao, entidade, entidade_id, detalhes, origem)
    VALUES (@app_usuario_id, 'animal.cadastrado', 'animal', NEW.id,
            JSON_OBJECT('nome', NEW.nome, 'ong_id', NEW.ong_id), 'trigger');
  END IF;
END$$

-- Mudança de status (disponível → em processo → adotado) e exclusão lógica
CREATE TRIGGER trg_log_animal_alteracao
AFTER UPDATE ON animal
FOR EACH ROW
BEGIN
  IF COALESCE(@massa_dados, 0) = 0 THEN
    IF NOT (OLD.status <=> NEW.status) THEN
      INSERT INTO log_acao (usuario_id, acao, entidade, entidade_id, detalhes, origem)
      VALUES (@app_usuario_id, 'animal.status', 'animal', NEW.id,
              JSON_OBJECT('nome', NEW.nome, 'de', CAST(OLD.status AS CHAR), 'para', CAST(NEW.status AS CHAR)), 'trigger');
    END IF;
    IF OLD.excluido_em IS NULL AND NEW.excluido_em IS NOT NULL THEN
      INSERT INTO log_acao (usuario_id, acao, entidade, entidade_id, detalhes, origem)
      VALUES (@app_usuario_id, 'animal.excluido', 'animal', NEW.id, JSON_OBJECT('nome', NEW.nome), 'trigger');
    END IF;
  END IF;
END$$

-- Aprovação / suspensão de ONG pelo admin (RN04)
CREATE TRIGGER trg_log_ong_status
AFTER UPDATE ON ong
FOR EACH ROW
BEGIN
  IF NOT (OLD.status <=> NEW.status) THEN
    INSERT INTO log_acao (usuario_id, acao, entidade, entidade_id, detalhes, origem)
    VALUES (@app_usuario_id, CONCAT('ong.', NEW.status), 'ong', NEW.id,
            JSON_OBJECT('nome', NEW.nome, 'de', CAST(OLD.status AS CHAR), 'para', CAST(NEW.status AS CHAR)), 'trigger');
  END IF;
END$$

CREATE TRIGGER trg_log_usuario_cadastro
AFTER INSERT ON usuario
FOR EACH ROW
BEGIN
  IF COALESCE(@massa_dados, 0) = 0 THEN
    INSERT INTO log_acao (usuario_id, acao, entidade, entidade_id, detalhes, origem)
    VALUES (NEW.id, 'usuario.cadastro', 'usuario', NEW.id, JSON_OBJECT('perfil', CAST(NEW.perfil AS CHAR)), 'trigger');
  END IF;
END$$

-- Admin ativa ou desativa uma conta
CREATE TRIGGER trg_log_usuario_ativo
AFTER UPDATE ON usuario
FOR EACH ROW
BEGIN
  IF NOT (OLD.ativo <=> NEW.ativo) THEN
    INSERT INTO log_acao (usuario_id, acao, entidade, entidade_id, detalhes, origem)
    VALUES (@app_usuario_id, IF(NEW.ativo, 'usuario.ativado', 'usuario.desativado'), 'usuario', NEW.id,
            JSON_OBJECT('nome', NEW.nome), 'trigger');
  END IF;
END$$

DELIMITER ;

-- =============================================================================
--  7. MASSA DE DADOS PARA O TESTE DE DESEMPENHO (OpenCL)
--  Com só 12 animais o paralelismo não aparece. Estas procedures criam milhares
--  de animais e adotantes fictícios para medir sequencial × OpenCL.
--  Os dados ficam numa ONG "pendente": NÃO aparecem no site (RN04), só nas
--  views vw_features_* que o processamento lê.
--    CALL sp_gerar_massa_dados(10000, 200);   -- 10 mil animais, 200 adotantes
--    CALL sp_limpar_massa_dados();            -- apaga tudo o que foi gerado
-- =============================================================================
DROP PROCEDURE IF EXISTS sp_gerar_massa_dados;
DROP PROCEDURE IF EXISTS sp_limpar_massa_dados;

DELIMITER $$

CREATE PROCEDURE sp_gerar_massa_dados(IN p_animais INT, IN p_adotantes INT)
BEGIN
  DECLARE v_ong INT UNSIGNED;
  DECLARE v_inicio INT;
  DECLARE v_hash CHAR(60) DEFAULT '$2b$10$vuk6MyzEP5wPI9NGIe74Au6iYZ0kR7hAvvGBcmVK1Guy0kCdJEvdS'; -- senha 123456

  IF p_animais < 0 OR p_animais > 200000 OR p_adotantes < 0 OR p_adotantes > 20000 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Use até 200000 animais e 20000 adotantes.';
  END IF;

  SET @massa_dados = 1;

  -- Sequência de números 1..N sem CTE recursiva (funciona igual no MySQL e no MariaDB):
  -- seis tabelas de dígitos 0–9 combinadas geram de 0 a 999.999.
  DROP TEMPORARY TABLE IF EXISTS tmp_seq;
  CREATE TEMPORARY TABLE tmp_seq (n INT UNSIGNED NOT NULL);
  INSERT INTO tmp_seq (n)
  SELECT n FROM (
    SELECT 1 + d1.d + 10 * d2.d + 100 * d3.d + 1000 * d4.d + 10000 * d5.d + 100000 * d6.d AS n
    FROM (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                   UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d1 CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                   UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d2 CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                   UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d3
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                   UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d4 CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                   UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d5 CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                   UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d6
  ) numeros
  WHERE n <= GREATEST(p_animais, p_adotantes);

  -- ONG que agrupa a massa de dados (pendente = invisível no site)
  INSERT INTO ong (nome, cnpj, email, telefone, cidade, descricao, status)
  SELECT 'Massa de dados (teste de desempenho)', '99.999.999/0001-99', 'massa@teste.petconnect',
         '(00) 00000-0000', 'Teste', 'ONG técnica criada pelo script 05. Não aprovar.', 'pendente'
  FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM ong o2 WHERE o2.cnpj = '99.999.999/0001-99');
  SET v_ong = (SELECT id FROM ong WHERE cnpj = '99.999.999/0001-99');

  -- Animais com características sorteadas
  INSERT INTO animal (ong_id, nome, especie, raca, idade_meses, sexo, porte, energia,
                      convivencia_criancas, convivencia_animais, castrado, vacinado, descricao)
  SELECT v_ong,
         CONCAT('Teste ', LPAD(n, 6, '0')),
         IF(RAND() < 0.55, 'cao', 'gato'),
         'SRD',
         1 + FLOOR(RAND() * 180),
         IF(RAND() < 0.5, 'M', 'F'),
         ELT(1 + FLOOR(RAND() * 3), 'pequeno', 'medio', 'grande'),
         ELT(1 + FLOOR(RAND() * 3), 'baixa', 'media', 'alta'),
         RAND() < 0.7, RAND() < 0.6, RAND() < 0.8, TRUE,
         'Animal gerado automaticamente para o teste de desempenho (massa de dados).'
  FROM tmp_seq
  WHERE n <= p_animais;

  -- Gato de porte grande não é realista: vira pequeno (75%) ou médio (25%)
  UPDATE animal
  SET porte = IF(RAND() < 0.75, 'pequeno', 'medio')
  WHERE ong_id = v_ong AND especie = 'gato' AND porte = 'grande';

  -- Uma foto para cada animal novo (reaproveita as ilustrações do front)
  INSERT INTO foto_animal (animal_id, url, ordem)
  SELECT a.id,
         IF(a.especie = 'gato',
            CONCAT('/animais/', ELT(1 + MOD(a.id, 4), '2', '4', '7', '10'), '-1.svg'),
            CONCAT('/animais/', ELT(1 + MOD(a.id, 8), '1', '3', '5', '6', '8', '9', '11', '12'), '-1.svg')),
         0
  FROM animal a
  LEFT JOIN foto_animal f ON f.animal_id = a.id
  WHERE a.ong_id = v_ong AND f.id IS NULL;

  -- Adotantes fictícios (continua a numeração se a procedure for chamada de novo)
  SET v_inicio = (SELECT COUNT(*) FROM usuario WHERE email LIKE 'massa%@teste.petconnect');
  INSERT INTO usuario (nome, email, senha_hash, perfil, cidade)
  SELECT CONCAT('Adotante teste ', v_inicio + n), CONCAT('massa', v_inicio + n, '@teste.petconnect'),
         v_hash, 'adotante', 'Teste'
  FROM tmp_seq
  WHERE n <= p_adotantes;

  -- Formulário de avaliação para cada adotante fictício
  INSERT INTO formulario_avaliacao (usuario_id, tipo_moradia, tem_quintal, tela_protecao, pessoas_casa,
                                    tem_criancas, outros_animais, horas_sozinho, experiencia, nivel_atividade, motivacao)
  SELECT u.id,
         IF(RAND() < 0.45, 'apartamento', 'casa'),
         RAND() < 0.5, RAND() < 0.5,
         1 + FLOOR(RAND() * 5),
         RAND() < 0.4, RAND() < 0.4,
         FLOOR(RAND() * 13),
         ELT(1 + FLOOR(RAND() * 3), 'nenhuma', 'alguma', 'muita'),
         ELT(1 + FLOOR(RAND() * 3), 'baixo', 'medio', 'alto'),
         'Formulário gerado automaticamente para o teste de desempenho.'
  FROM usuario u
  LEFT JOIN formulario_avaliacao f ON f.usuario_id = u.id
  WHERE u.email LIKE 'massa%@teste.petconnect' AND f.usuario_id IS NULL;

  SET @massa_dados = NULL;
  DROP TEMPORARY TABLE IF EXISTS tmp_seq;

  SELECT
    (SELECT COUNT(*) FROM animal  WHERE ong_id = v_ong)                        AS animais_de_teste,
    (SELECT COUNT(*) FROM usuario WHERE email LIKE 'massa%@teste.petconnect')  AS adotantes_de_teste,
    (SELECT COUNT(*) FROM vw_features_animal)                                  AS total_linhas_features_animal,
    (SELECT COUNT(*) FROM vw_features_adotante)                                AS total_linhas_features_adotante;
END$$

CREATE PROCEDURE sp_limpar_massa_dados()
BEGIN
  DECLARE v_ong INT UNSIGNED DEFAULT NULL;
  SET v_ong = (SELECT id FROM ong WHERE cnpj = '99.999.999/0001-99');
  SET @massa_dados = 1;

  -- Solicitações de teste (se alguém tiver criado) saem antes, por causa das chaves estrangeiras
  DELETE s FROM solicitacao s JOIN animal a ON a.id = s.animal_id WHERE a.ong_id = v_ong;
  DELETE s FROM solicitacao s JOIN usuario u ON u.id = s.usuario_id WHERE u.email LIKE 'massa%@teste.petconnect';
  -- Fotos, favoritos e análises da IA saem junto (ON DELETE CASCADE)
  DELETE FROM animal  WHERE ong_id = v_ong;
  DELETE FROM usuario WHERE email LIKE 'massa%@teste.petconnect';
  DELETE FROM usuario WHERE ong_id = v_ong;
  DELETE FROM ong     WHERE id = v_ong;

  SET @massa_dados = NULL;
  SELECT 'Massa de dados removida.' AS resultado;
END$$

DELIMITER ;

-- Procedimentos auxiliares não são mais necessários
DROP PROCEDURE IF EXISTS sp_aux_adicionar_coluna;
DROP PROCEDURE IF EXISTS sp_aux_adicionar_indice;
DROP PROCEDURE IF EXISTS sp_aux_adicionar_fk;

SELECT 'Script 05 (Sprint 06) executado com sucesso.' AS resultado;
