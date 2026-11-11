-- =============================================================================
--  PetConnect — Script 08: Sprint 07 (dashboard, relatórios, pesquisas e logs)
--
--  O que este script faz:
--   1. Índices para filtrar por período (data), situação, ONG e perfil.
--   2. Views de RELATÓRIO, uma linha por registro, prontas para filtrar e
--      exportar: solicitações, adoções, desempenho por ONG, animais à espera,
--      compatibilidade por faixa e cadastros por mês.
--   3. Procedures: relatório consolidado de um período e pesquisa geral.
--   4. Mais operações no log: formulário, acompanhamento e edição de animal.
--
--  Não apaga dados e pode ser executado mais de uma vez.
--  Ordem: 01 → 02 → 03 → 05 → 08 (este). Execute como root no Workbench (raio ⚡).
-- =============================================================================

USE petconnect;

-- -----------------------------------------------------------------------------
-- Auxiliar: cria um índice só se ele ainda não existir (removido no final).
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_aux_adicionar_indice;
DELIMITER $$
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
DELIMITER ;

-- =============================================================================
--  1. ÍNDICES PARA FILTROS E PESQUISA
-- =============================================================================
CALL sp_aux_adicionar_indice('solicitacao', 'ix_solicitacao_criado', 'criado_em');
CALL sp_aux_adicionar_indice('historico_solicitacao', 'ix_historico_status_data', 'status, criado_em');
CALL sp_aux_adicionar_indice('animal', 'ix_animal_criado', 'criado_em');
CALL sp_aux_adicionar_indice('usuario', 'ix_usuario_criado', 'perfil, criado_em');
CALL sp_aux_adicionar_indice('usuario', 'ix_usuario_nome', 'nome');
CALL sp_aux_adicionar_indice('ong', 'ix_ong_nome', 'nome');
CALL sp_aux_adicionar_indice('animal', 'ix_animal_nome', 'nome');

DROP PROCEDURE IF EXISTS sp_aux_adicionar_indice;

-- =============================================================================
--  2. VIEWS DE RELATÓRIO
--  Todas trazem colunas de data (data, mes) e de agrupamento (ONG, situação,
--  espécie) para o filtro ser um simples WHERE.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Relatório de SOLICITAÇÕES: uma linha por pedido de adoção.
-- dias_em_aberto: há quantos dias o pedido espera decisão (só os abertos).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_rel_solicitacoes AS
SELECT
  s.id                                         AS solicitacao_id,
  s.criado_em,
  DATE(s.criado_em)                            AS data,
  DATE_FORMAT(s.criado_em, '%Y-%m')            AS mes,
  a.id                                         AS animal_id,
  a.nome                                       AS animal,
  a.especie,
  a.porte,
  o.id                                         AS ong_id,
  o.nome                                       AS ong,
  u.id                                         AS adotante_id,
  u.nome                                       AS adotante,
  u.email                                      AS adotante_email,
  s.status,
  s.score,
  CASE WHEN s.score IS NULL THEN NULL WHEN s.score >= 75 THEN 'alta'
       WHEN s.score >= 50 THEN 'moderada' ELSE 'baixa' END AS faixa_compatibilidade,
  s.motivo_recusa,
  hc.concluida_em,
  DATEDIFF(hc.concluida_em, s.criado_em)       AS dias_ate_adocao,
  IF(s.status IN ('pendente', 'em_analise'), DATEDIFF(NOW(), s.criado_em), NULL) AS dias_em_aberto
FROM solicitacao s
JOIN animal  a ON a.id = s.animal_id
JOIN ong     o ON o.id = a.ong_id
JOIN usuario u ON u.id = s.usuario_id
LEFT JOIN (SELECT h.solicitacao_id, MAX(h.criado_em) AS concluida_em
           FROM historico_solicitacao h
           WHERE h.status = 'concluida'
           GROUP BY h.solicitacao_id) hc ON hc.solicitacao_id = s.id;

-- -----------------------------------------------------------------------------
-- Relatório de ADOÇÕES CONCLUÍDAS, com o acompanhamento pós-adoção.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_rel_adocoes AS
SELECT
  r.solicitacao_id,
  r.concluida_em,
  DATE(r.concluida_em)                         AS data,
  DATE_FORMAT(r.concluida_em, '%Y-%m')         AS mes,
  r.animal_id, r.animal, r.especie, r.porte,
  r.ong_id, r.ong,
  r.adotante_id, r.adotante, r.adotante_email,
  r.score,
  r.dias_ate_adocao,
  COALESCE(ac.total, 0)                        AS acompanhamentos,
  ac.ultimo                                    AS ultimo_acompanhamento
FROM vw_rel_solicitacoes r
LEFT JOIN (SELECT solicitacao_id, COUNT(*) AS total, MAX(data) AS ultimo
           FROM acompanhamento GROUP BY solicitacao_id) ac ON ac.solicitacao_id = r.solicitacao_id
WHERE r.status = 'concluida';

-- -----------------------------------------------------------------------------
-- Relatório de DESEMPENHO POR ONG.
-- taxa_aprovacao = aprovadas ou concluídas ÷ pedidos já decididos (%).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_rel_desempenho_ong AS
SELECT
  o.id                                                     AS ong_id,
  o.nome                                                   AS ong,
  o.cidade,
  o.status                                                 AS status_ong,
  COALESCE(an.animais, 0)                                  AS animais,
  COALESCE(an.disponiveis, 0)                              AS disponiveis,
  COALESCE(an.adotados, 0)                                 AS adotados,
  COALESCE(so.solicitacoes, 0)                             AS solicitacoes,
  COALESCE(so.abertas, 0)                                  AS abertas,
  COALESCE(so.aprovadas, 0)                                AS aprovadas,
  COALESCE(so.recusadas, 0)                                AS recusadas,
  COALESCE(so.concluidas, 0)                               AS concluidas,
  ROUND(100 * so.aprovadas / NULLIF(so.aprovadas + so.recusadas, 0), 1) AS taxa_aprovacao,
  so.tempo_medio_adocao_dias,
  so.score_medio
FROM ong o
LEFT JOIN (SELECT a.ong_id,
                  SUM(a.excluido_em IS NULL)                              AS animais,
                  SUM(a.excluido_em IS NULL AND a.status = 'disponivel')  AS disponiveis,
                  SUM(a.status = 'adotado')                               AS adotados
           FROM animal a GROUP BY a.ong_id) an ON an.ong_id = o.id
LEFT JOIN (SELECT r.ong_id,
                  COUNT(*)                                   AS solicitacoes,
                  SUM(r.status IN ('pendente', 'em_analise')) AS abertas,
                  SUM(r.status IN ('aprovada', 'concluida')) AS aprovadas,
                  SUM(r.status = 'recusada')                 AS recusadas,
                  SUM(r.status = 'concluida')                AS concluidas,
                  ROUND(AVG(r.dias_ate_adocao), 1)           AS tempo_medio_adocao_dias,
                  ROUND(AVG(r.score), 1)                     AS score_medio
           FROM vw_rel_solicitacoes r GROUP BY r.ong_id) so ON so.ong_id = o.id;

-- -----------------------------------------------------------------------------
-- Relatório de ANIMAIS À ESPERA: disponíveis há mais tempo primeiro.
-- Ajuda a ONG a decidir quem divulgar (regra: só animais de ONG aprovada).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_rel_animais_espera AS
SELECT
  a.id                                         AS animal_id,
  a.nome                                       AS animal,
  a.especie, a.porte, a.idade_meses,
  o.id                                         AS ong_id,
  o.nome                                       AS ong,
  a.status,
  a.criado_em,
  DATEDIFF(NOW(), a.criado_em)                 AS dias_na_plataforma,
  CASE WHEN DATEDIFF(NOW(), a.criado_em) <= 30 THEN 'até 30 dias'
       WHEN DATEDIFF(NOW(), a.criado_em) <= 90 THEN '31 a 90 dias'
       ELSE 'mais de 90 dias' END              AS faixa_espera,
  COALESCE(sr.total, 0)                        AS solicitacoes_recebidas,
  COALESCE(fv.total, 0)                        AS favoritado_por
FROM animal a
JOIN ong o ON o.id = a.ong_id
LEFT JOIN (SELECT animal_id, COUNT(*) AS total FROM solicitacao GROUP BY animal_id) sr ON sr.animal_id = a.id
LEFT JOIN (SELECT animal_id, COUNT(*) AS total FROM favorito GROUP BY animal_id) fv ON fv.animal_id = a.id
WHERE a.excluido_em IS NULL AND a.status <> 'adotado' AND o.status = 'aprovada';

-- -----------------------------------------------------------------------------
-- Relatório de COMPATIBILIDADE: o que acontece com os pedidos de cada faixa.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_rel_compatibilidade AS
SELECT
  r.faixa_compatibilidade                                                   AS faixa,
  COUNT(*)                                                                  AS solicitacoes,
  ROUND(AVG(r.score), 1)                                                    AS score_medio,
  SUM(r.status IN ('aprovada', 'concluida'))                                AS aprovadas,
  SUM(r.status = 'recusada')                                                AS recusadas,
  ROUND(100 * SUM(r.status IN ('aprovada', 'concluida'))
        / NULLIF(SUM(r.status IN ('aprovada', 'concluida', 'recusada')), 0), 1) AS taxa_aprovacao
FROM vw_rel_solicitacoes r
WHERE r.faixa_compatibilidade IS NOT NULL
GROUP BY r.faixa_compatibilidade;

-- -----------------------------------------------------------------------------
-- Cadastros por mês e perfil (crescimento da plataforma).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_rel_cadastros_mes AS
SELECT
  DATE_FORMAT(u.criado_em, '%Y-%m')            AS mes,
  u.perfil,
  COUNT(*)                                     AS cadastros,
  SUM(u.ativo)                                 AS ativos
FROM usuario u
GROUP BY DATE_FORMAT(u.criado_em, '%Y-%m'), u.perfil;

-- -----------------------------------------------------------------------------
-- Logs por dia e tipo de operação (gráfico de atividade / auditoria).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_log_resumo_diario AS
SELECT
  DATE(l.criado_em)                            AS data,
  l.acao,
  l.entidade,
  COUNT(*)                                     AS operacoes,
  COUNT(DISTINCT l.usuario_id)                 AS usuarios
FROM log_acao l
GROUP BY DATE(l.criado_em), l.acao, l.entidade;

-- =============================================================================
--  3. PROCEDURES DE RELATÓRIO E PESQUISA
-- =============================================================================
DROP PROCEDURE IF EXISTS sp_relatorio_periodo;
DROP PROCEDURE IF EXISTS sp_pesquisar;

DELIMITER $$

-- -----------------------------------------------------------------------------
-- Relatório consolidado de um período (datas inclusivas). p_ong NULL = todas.
--   CALL sp_relatorio_periodo('2026-08-01', '2026-10-31', NULL);
-- Devolve 2 tabelas: os indicadores do período e o detalhamento por ONG.
-- -----------------------------------------------------------------------------
CREATE PROCEDURE sp_relatorio_periodo(IN p_inicio DATE, IN p_fim DATE, IN p_ong INT)
BEGIN
  DECLARE v_adocoes INT DEFAULT 0;
  DECLARE v_tempo DECIMAL(10,1);

  IF p_inicio IS NULL OR p_fim IS NULL OR p_inicio > p_fim THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Período inválido: a data inicial deve ser anterior ou igual à final.';
  END IF;

  SET @rel_inicio = p_inicio;
  SET @rel_fim = p_fim;
  SET @rel_ong = p_ong;
  SET v_adocoes = (SELECT COUNT(*) FROM vw_rel_adocoes ad
                   WHERE ad.data BETWEEN @rel_inicio AND @rel_fim AND (@rel_ong IS NULL OR ad.ong_id = @rel_ong));
  SET v_tempo   = (SELECT ROUND(AVG(ad.dias_ate_adocao), 1) FROM vw_rel_adocoes ad
                   WHERE ad.data BETWEEN @rel_inicio AND @rel_fim AND (@rel_ong IS NULL OR ad.ong_id = @rel_ong));

  -- 1) Indicadores do período
  SELECT
    @rel_inicio                                                    AS de,
    @rel_fim                                                       AS ate,
    t.solicitacoes_recebidas, t.em_aberto, t.aprovadas, t.recusadas, t.canceladas,
    ROUND(100 * t.aprovadas / NULLIF(t.aprovadas + t.recusadas, 0), 1) AS taxa_aprovacao,
    t.score_medio,
    v_adocoes                                                      AS adocoes_concluidas,
    v_tempo                                                        AS tempo_medio_adocao_dias
  FROM (SELECT COUNT(*)                                    AS solicitacoes_recebidas,
               COALESCE(SUM(r.status IN ('pendente', 'em_analise')), 0) AS em_aberto,
               COALESCE(SUM(r.status IN ('aprovada', 'concluida')), 0)  AS aprovadas,
               COALESCE(SUM(r.status = 'recusada'), 0)     AS recusadas,
               COALESCE(SUM(r.status = 'cancelada'), 0)    AS canceladas,
               ROUND(AVG(r.score), 1)                      AS score_medio
        FROM vw_rel_solicitacoes r
        WHERE r.data BETWEEN @rel_inicio AND @rel_fim
          AND (@rel_ong IS NULL OR r.ong_id = @rel_ong)) t;

  -- 2) Detalhamento por ONG
  SELECT
    r.ong,
    COUNT(*)                                                       AS solicitacoes,
    SUM(r.status IN ('aprovada', 'concluida'))                     AS aprovadas,
    SUM(r.status = 'recusada')                                     AS recusadas,
    SUM(r.status = 'concluida')                                    AS concluidas,
    ROUND(AVG(r.score), 1)                                         AS score_medio
  FROM vw_rel_solicitacoes r
  WHERE r.data BETWEEN @rel_inicio AND @rel_fim
    AND (@rel_ong IS NULL OR r.ong_id = @rel_ong)
  GROUP BY r.ong
  ORDER BY solicitacoes DESC;
END$$

-- -----------------------------------------------------------------------------
-- Pesquisa geral: um termo procurado em animais, pessoas, ONGs e solicitações.
--   CALL sp_pesquisar('thor');
-- Pessoas aparecem sem senha; animais excluídos ficam de fora.
-- -----------------------------------------------------------------------------
CREATE PROCEDURE sp_pesquisar(IN p_termo VARCHAR(100))
BEGIN
  IF p_termo IS NULL OR (CHAR_LENGTH(LTRIM(RTRIM(p_termo))) < 2 AND LTRIM(RTRIM(p_termo)) NOT REGEXP '^[0-9]+$') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Digite pelo menos 2 caracteres (ou o número da solicitação).';
  END IF;
  SET @pesq_exato = LTRIM(RTRIM(p_termo));
  SET @pesq_termo = CONCAT('%', LTRIM(RTRIM(p_termo)), '%');

  SELECT 'animal' AS tipo, a.id, a.nome AS titulo,
         CONCAT(a.raca, ' · ', o.nome, ' · ', a.status) AS detalhe
  FROM animal a JOIN ong o ON o.id = a.ong_id
  WHERE a.excluido_em IS NULL AND (a.nome LIKE @pesq_termo OR a.raca LIKE @pesq_termo)
  UNION ALL
  SELECT 'pessoa', u.id, u.nome, CONCAT(u.email, ' · ', u.perfil)
  FROM usuario u
  WHERE u.nome LIKE @pesq_termo OR u.email LIKE @pesq_termo
  UNION ALL
  SELECT 'ong', o.id, o.nome, CONCAT(o.cidade, ' · ', o.status)
  FROM ong o
  WHERE o.nome LIKE @pesq_termo OR o.cidade LIKE @pesq_termo OR o.cnpj LIKE @pesq_termo
  UNION ALL
  SELECT 'solicitacao', r.solicitacao_id, CONCAT('#', r.solicitacao_id, ' ', r.animal),
         CONCAT(r.adotante, ' · ', r.ong, ' · ', r.status)
  FROM vw_rel_solicitacoes r
  WHERE CAST(r.solicitacao_id AS CHAR) = @pesq_exato OR r.adotante LIKE @pesq_termo OR r.animal LIKE @pesq_termo
  ORDER BY tipo, titulo
  LIMIT 100;
END$$

DELIMITER ;

-- =============================================================================
--  4. MAIS OPERAÇÕES NO LOG (histórico de operações da Sprint 07)
--  Somam-se aos 6 triggers da Sprint 06.
-- =============================================================================
DROP TRIGGER IF EXISTS trg_log_formulario_novo;
DROP TRIGGER IF EXISTS trg_log_formulario_alterado;
DROP TRIGGER IF EXISTS trg_log_acompanhamento;
DROP TRIGGER IF EXISTS trg_log_animal_alteracao;
DROP TRIGGER IF EXISTS trg_log_historico_solicitacao;

DELIMITER $$

-- Etapas da solicitação (Sprint 06). Agora ignora a geração de dados em lote
-- (@massa_dados = 1): o script 09 grava esses logs com a data histórica certa.
CREATE TRIGGER trg_log_historico_solicitacao
AFTER INSERT ON historico_solicitacao
FOR EACH ROW
BEGIN
  IF COALESCE(@massa_dados, 0) = 0 THEN
    INSERT INTO log_acao (usuario_id, acao, entidade, entidade_id, detalhes, origem)
    VALUES (NEW.alterado_por, CONCAT('solicitacao.', NEW.status), 'solicitacao', NEW.solicitacao_id,
            JSON_OBJECT('observacao', NEW.observacao), 'trigger');
  END IF;
END$$

-- Adotante preencheu o formulário de avaliação (requisito para pedir adoção, RN03)
CREATE TRIGGER trg_log_formulario_novo
AFTER INSERT ON formulario_avaliacao
FOR EACH ROW
BEGIN
  IF COALESCE(@massa_dados, 0) = 0 THEN
    INSERT INTO log_acao (usuario_id, acao, entidade, entidade_id, detalhes, origem)
    VALUES (NEW.usuario_id, 'formulario.preenchido', 'formulario', NEW.usuario_id,
            JSON_OBJECT('moradia', CAST(NEW.tipo_moradia AS CHAR)), 'trigger');
  END IF;
END$$

-- Adotante mudou o formulário (muda o score dos próximos pedidos)
CREATE TRIGGER trg_log_formulario_alterado
AFTER UPDATE ON formulario_avaliacao
FOR EACH ROW
BEGIN
  IF COALESCE(@massa_dados, 0) = 0 THEN
    INSERT INTO log_acao (usuario_id, acao, entidade, entidade_id, detalhes, origem)
    VALUES (NEW.usuario_id, 'formulario.atualizado', 'formulario', NEW.usuario_id, NULL, 'trigger');
  END IF;
END$$

-- ONG registrou visita, contato ou foto pós-adoção
CREATE TRIGGER trg_log_acompanhamento
AFTER INSERT ON acompanhamento
FOR EACH ROW
BEGIN
  IF COALESCE(@massa_dados, 0) = 0 THEN
    INSERT INTO log_acao (usuario_id, acao, entidade, entidade_id, detalhes, origem)
    VALUES (COALESCE(NEW.registrado_por, @app_usuario_id), 'acompanhamento.registrado', 'solicitacao', NEW.solicitacao_id,
            JSON_OBJECT('tipo', CAST(NEW.tipo AS CHAR)), 'trigger');
  END IF;
END$$

-- Animal: status, exclusão (Sprint 06) e, agora, edição dos dados públicos
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
    IF NOT (OLD.nome <=> NEW.nome AND OLD.raca <=> NEW.raca AND OLD.idade_meses <=> NEW.idade_meses
            AND OLD.porte <=> NEW.porte AND OLD.energia <=> NEW.energia AND OLD.descricao <=> NEW.descricao
            AND OLD.convivencia_criancas <=> NEW.convivencia_criancas
            AND OLD.convivencia_animais <=> NEW.convivencia_animais) THEN
      INSERT INTO log_acao (usuario_id, acao, entidade, entidade_id, detalhes, origem)
      VALUES (@app_usuario_id, 'animal.editado', 'animal', NEW.id, JSON_OBJECT('nome', NEW.nome), 'trigger');
    END IF;
  END IF;
END$$

DELIMITER ;

SELECT 'Script 08 (Sprint 07) executado com sucesso.' AS resultado;
