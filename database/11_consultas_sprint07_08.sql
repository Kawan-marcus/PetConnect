-- =============================================================================
--  PetConnect — Script 11: consultas de evidência das Sprints 07 e 08
--  Rode depois do 10. Cada bloco gera uma tabela para print no documento.
--  Não altera dados: os testes de regra rodam numa transação desfeita no final.
-- =============================================================================

USE petconnect;

-- -----------------------------------------------------------------------------
-- SPRINT 07 — DASHBOARD: indicadores gerais (mesmos números do painel do admin)
-- -----------------------------------------------------------------------------
SELECT
  (SELECT COUNT(*) FROM vw_animal_publico)                                      AS animais_disponiveis_no_site,
  (SELECT COUNT(*) FROM vw_rel_solicitacoes)                                    AS solicitacoes,
  (SELECT COUNT(*) FROM vw_rel_solicitacoes WHERE status IN ('pendente','em_analise')) AS em_aberto,
  (SELECT COUNT(*) FROM vw_rel_adocoes)                                         AS adocoes_concluidas,
  (SELECT ROUND(AVG(dias_ate_adocao), 1) FROM vw_rel_adocoes)                   AS dias_medios_ate_adocao,
  (SELECT COUNT(*) FROM usuario WHERE perfil = 'adotante')                      AS adotantes,
  (SELECT COUNT(*) FROM ong WHERE status = 'aprovada')                          AS ongs_aprovadas;

-- Tendência mensal (gráfico de linhas do dashboard)
SELECT mes,
       COUNT(*)                                  AS solicitacoes,
       SUM(status IN ('aprovada', 'concluida'))  AS aprovadas,
       SUM(status = 'recusada')                  AS recusadas
FROM vw_rel_solicitacoes
GROUP BY mes
ORDER BY mes;

-- -----------------------------------------------------------------------------
-- SPRINT 07 — RELATÓRIOS
-- -----------------------------------------------------------------------------
SELECT * FROM vw_rel_desempenho_ong ORDER BY solicitacoes DESC;
SELECT * FROM vw_rel_compatibilidade ORDER BY score_medio DESC;
SELECT animal, especie, ong, dias_na_plataforma, faixa_espera, solicitacoes_recebidas
FROM vw_rel_animais_espera ORDER BY dias_na_plataforma DESC LIMIT 10;
SELECT animal, ong, adotante, concluida_em, dias_ate_adocao, acompanhamentos
FROM vw_rel_adocoes ORDER BY concluida_em DESC LIMIT 10;

-- -----------------------------------------------------------------------------
-- SPRINT 07 — FILTROS (período, categoria, situação, usuário)
-- -----------------------------------------------------------------------------
-- Período + ONG: relatório consolidado dos últimos 90 dias de todas as ONGs
SET @ate = CURDATE();
SET @de  = CURDATE() - INTERVAL 90 DAY;
CALL sp_relatorio_periodo(@de, @ate, NULL);

-- Categoria (espécie) + situação (status)
SELECT especie, status, COUNT(*) AS quantidade
FROM vw_rel_solicitacoes
WHERE data BETWEEN @de AND @ate
GROUP BY especie, status
ORDER BY especie, status;

-- Usuário: tudo o que um adotante pediu
SELECT solicitacao_id, data, animal, ong, status, score
FROM vw_rel_solicitacoes
WHERE adotante_email = 'ana@email.com'
ORDER BY criado_em DESC;

-- -----------------------------------------------------------------------------
-- SPRINT 07 — PESQUISA
-- -----------------------------------------------------------------------------
CALL sp_pesquisar('thor');
CALL sp_pesquisar('patinhas');

-- -----------------------------------------------------------------------------
-- SPRINT 07 — LOGS / HISTÓRICO DE OPERAÇÕES
-- -----------------------------------------------------------------------------
SELECT l.criado_em, COALESCE(u.nome, 'sistema') AS quem, l.acao, l.entidade, l.entidade_id, l.detalhes
FROM log_acao l
LEFT JOIN usuario u ON u.id = l.usuario_id
ORDER BY l.criado_em DESC, l.id DESC
LIMIT 20;

SELECT acao, COUNT(*) AS vezes, MIN(criado_em) AS primeira, MAX(criado_em) AS ultima
FROM log_acao GROUP BY acao ORDER BY vezes DESC;

-- -----------------------------------------------------------------------------
-- SPRINT 08 — PERMISSÕES
-- -----------------------------------------------------------------------------
SELECT * FROM vw_matriz_permissoes;
SHOW GRANTS FOR 'petconnect_relatorio'@'localhost';
-- Para testar: conecte como petconnect_relatorio (senha relatorio123) e rode
--   SELECT * FROM petconnect.vw_rel_adocoes;   → funciona
--   SELECT * FROM petconnect.usuario;          → ERRO 1142 (SELECT command denied)
--   DELETE FROM petconnect.vw_rel_adocoes;     → ERRO 1142 (DELETE command denied)

-- -----------------------------------------------------------------------------
-- SPRINT 08 — REVISÃO DAS REGRAS: cada tentativa proibida é barrada pelo banco
-- sp_testar_regras() tenta cada operação, guarda a mensagem de erro e desfaz tudo.
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_testar_regras;
DELIMITER $$
CREATE PROCEDURE sp_testar_regras()
BEGIN
  DECLARE v_adotado INT UNSIGNED;
  DECLARE v_aberto  INT UNSIGNED;
  DECLARE v_final   INT UNSIGNED;
  DECLARE v_disp    INT UNSIGNED;

  DROP TEMPORARY TABLE IF EXISTS tmp_teste_regra;
  -- MEMORY: a tabela de resultados não é desfeita pelo ROLLBACK do final
  CREATE TEMPORARY TABLE tmp_teste_regra (regra VARCHAR(10), tentativa VARCHAR(120), resultado VARCHAR(255)) ENGINE = MEMORY;

  SET @massa_dados = NULL;
  SET v_adotado = (SELECT MIN(id) FROM animal WHERE status = 'adotado');
  SET v_aberto  = (SELECT MIN(animal_id) FROM solicitacao WHERE status IN ('pendente', 'em_analise'));
  SET v_final   = (SELECT MIN(id) FROM solicitacao WHERE status = 'recusada');
  SET v_disp    = (SELECT MIN(a.id) FROM animal a JOIN ong o ON o.id = a.ong_id
                   WHERE a.status = 'disponivel' AND a.excluido_em IS NULL AND o.status = 'aprovada'
                     AND NOT EXISTS (SELECT 1 FROM solicitacao s WHERE s.animal_id = a.id AND s.status = 'aprovada'));

  START TRANSACTION;

  BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
      BEGIN GET DIAGNOSTICS CONDITION 1 @msg = MESSAGE_TEXT;
            INSERT INTO tmp_teste_regra VALUES ('RN01', 'Pedir adoção de animal já adotado', CONCAT('BARRADO: ', @msg)); END;
    INSERT INTO solicitacao (animal_id, usuario_id, status) VALUES (v_adotado, 2, 'pendente');
    INSERT INTO tmp_teste_regra VALUES ('RN01', 'Pedir adoção de animal já adotado', 'PERMITIDO (falha!)');
  END;

  BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
      BEGIN GET DIAGNOSTICS CONDITION 1 @msg = MESSAGE_TEXT;
            INSERT INTO tmp_teste_regra VALUES ('RN03', 'ONG pedindo adoção', CONCAT('BARRADO: ', @msg)); END;
    INSERT INTO solicitacao (animal_id, usuario_id, status) VALUES (v_disp, 4, 'pendente');
    INSERT INTO tmp_teste_regra VALUES ('RN03', 'ONG pedindo adoção', 'PERMITIDO (falha!)');
  END;

  BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
      BEGIN GET DIAGNOSTICS CONDITION 1 @msg = MESSAGE_TEXT;
            INSERT INTO tmp_teste_regra VALUES ('RN04', 'Cadastrar animal em ONG pendente', CONCAT('BARRADO: ', @msg)); END;
    INSERT INTO animal (ong_id, nome, especie, idade_meses, sexo, porte, energia, convivencia_criancas,
                        convivencia_animais, castrado, vacinado, descricao)
    VALUES ((SELECT MIN(id) FROM ong WHERE status = 'pendente'), 'Teste', 'cao', 12, 'M', 'medio', 'media', 1, 1, 1, 1, 'Teste de regra');
    INSERT INTO tmp_teste_regra VALUES ('RN04', 'Cadastrar animal em ONG pendente', 'PERMITIDO (falha!)');
  END;

  BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
      BEGIN GET DIAGNOSTICS CONDITION 1 @msg = MESSAGE_TEXT;
            INSERT INTO tmp_teste_regra VALUES ('RN06', 'Marcar "adotado" sem adoção concluída', CONCAT('BARRADO: ', @msg)); END;
    UPDATE animal SET status = 'adotado' WHERE id = v_disp;
    INSERT INTO tmp_teste_regra VALUES ('RN06', 'Marcar "adotado" sem adoção concluída', 'PERMITIDO (falha!)');
  END;

  BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
      BEGIN GET DIAGNOSTICS CONDITION 1 @msg = MESSAGE_TEXT;
            INSERT INTO tmp_teste_regra VALUES ('RN07', 'Reabrir solicitação recusada', CONCAT('BARRADO: ', @msg)); END;
    UPDATE solicitacao SET status = 'pendente' WHERE id = v_final;
    INSERT INTO tmp_teste_regra VALUES ('RN07', 'Reabrir solicitação recusada', 'PERMITIDO (falha!)');
  END;

  BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
      BEGIN GET DIAGNOSTICS CONDITION 1 @msg = MESSAGE_TEXT;
            INSERT INTO tmp_teste_regra VALUES ('RN08', 'Excluir animal com pedido em aberto', CONCAT('BARRADO: ', @msg)); END;
    UPDATE animal SET excluido_em = NOW() WHERE id = v_aberto;
    INSERT INTO tmp_teste_regra VALUES ('RN08', 'Excluir animal com pedido em aberto', 'PERMITIDO (falha!)');
  END;

  BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
      BEGIN GET DIAGNOSTICS CONDITION 1 @msg = MESSAGE_TEXT;
            INSERT INTO tmp_teste_regra VALUES ('LOG', 'Apagar registro do histórico', CONCAT('BARRADO: ', @msg)); END;
    DELETE FROM log_acao WHERE id = (SELECT MIN(id) FROM (SELECT id FROM log_acao) x);
    INSERT INTO tmp_teste_regra VALUES ('LOG', 'Apagar registro do histórico', 'PERMITIDO (falha!)');
  END;

  ROLLBACK;
  SELECT * FROM tmp_teste_regra;
  DROP TEMPORARY TABLE IF EXISTS tmp_teste_regra;
END$$
DELIMITER ;

CALL sp_testar_regras();
DROP PROCEDURE IF EXISTS sp_testar_regras;
