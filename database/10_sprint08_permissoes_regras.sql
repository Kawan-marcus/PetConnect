-- =============================================================================
--  PetConnect — Script 10: Sprint 08 (permissões e revisão das regras de negócio)
--
--  1. PERMISSÕES NO BANCO (menor privilégio):
--     • petconnect_app       → backend: só SELECT, INSERT, UPDATE e DELETE;
--     • petconnect_relatorio → somente leitura das views de relatório, para
--       conferir os relatórios (ou ligar uma ferramenta de BI) sem risco de
--       alterar dados nem ver senhas.
--  2. LOG IMUTÁVEL: ninguém altera nem apaga registros de log_acao (auditoria).
--  3. REGRAS DE NEGÓCIO TAMBÉM NO BANCO (defesa em profundidade). O backend já
--     valida tudo; os triggers garantem a regra mesmo se alguém gravar direto no
--     banco ou se uma rota esquecer uma validação:
--       RN01  não há solicitação para animal adotado, excluído ou de ONG não aprovada;
--       RN03  só pede adoção quem é adotante ativo e preencheu o formulário;
--       RN04  só ONG aprovada cadastra animal;
--       RN06  "adotado" só depois de uma adoção concluída; animal com adoção aprovada
--             não volta a "disponível";
--       RN07  a solicitação segue o fluxo de status (máquina de estados) e nasce pendente;
--       RN08  animal com solicitação em aberto não pode ser excluído.
--     O erro é SQLSTATE 45000 com mensagem em português; o backend pode devolver
--     409 com essa mensagem.
--
--  Geração de dados em lote (@massa_dados = 1, scripts 05 e 09) fica liberada.
--  Pode ser executado mais de uma vez. Ordem: 01 → 02 → 03 → 05 → 08 → 09 → 10.
--  Execute como root no Workbench (raio ⚡).
-- =============================================================================

USE petconnect;

-- =============================================================================
--  1. USUÁRIOS DO BANCO E O QUE CADA UM PODE FAZER
--  (GRANT direto ao usuário: funciona igual no MySQL 8 e no MariaDB do XAMPP)
-- =============================================================================

-- Backend (petconnect_app, criado conforme o backend/README.md): só lê e grava
-- dados. Não cria nem altera tabelas, triggers ou usuários. Se ele ainda não
-- existir, crie com:
--   CREATE USER 'petconnect_app'@'localhost' IDENTIFIED BY 'sua_senha';
--   GRANT SELECT, INSERT, UPDATE, DELETE ON petconnect.* TO 'petconnect_app'@'localhost';
-- Nunca use ALL PRIVILEGES nem o root no .env do backend.

-- Relatórios: usuário SOMENTE LEITURA, que enxerga apenas as views de consulta
-- (nada de senha, token ou tabela bruta). Troque a senha antes de usar.
CREATE USER IF NOT EXISTS 'petconnect_relatorio'@'localhost' IDENTIFIED BY 'relatorio123';
GRANT SELECT ON petconnect.vw_rel_solicitacoes    TO 'petconnect_relatorio'@'localhost';
GRANT SELECT ON petconnect.vw_rel_adocoes         TO 'petconnect_relatorio'@'localhost';
GRANT SELECT ON petconnect.vw_rel_desempenho_ong  TO 'petconnect_relatorio'@'localhost';
GRANT SELECT ON petconnect.vw_rel_animais_espera  TO 'petconnect_relatorio'@'localhost';
GRANT SELECT ON petconnect.vw_rel_compatibilidade TO 'petconnect_relatorio'@'localhost';
GRANT SELECT ON petconnect.vw_rel_cadastros_mes   TO 'petconnect_relatorio'@'localhost';
GRANT SELECT ON petconnect.vw_log_resumo_diario   TO 'petconnect_relatorio'@'localhost';
GRANT SELECT ON petconnect.vw_animal_publico      TO 'petconnect_relatorio'@'localhost';

-- =============================================================================
--  2. LOG IMUTÁVEL
-- =============================================================================
DROP TRIGGER IF EXISTS trg_log_imutavel_update;
DROP TRIGGER IF EXISTS trg_log_imutavel_delete;

DELIMITER $$

CREATE TRIGGER trg_log_imutavel_update
BEFORE UPDATE ON log_acao
FOR EACH ROW
BEGIN
  IF COALESCE(@massa_dados, 0) = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'O histórico de operações não pode ser alterado.';
  END IF;
END$$

CREATE TRIGGER trg_log_imutavel_delete
BEFORE DELETE ON log_acao
FOR EACH ROW
BEGIN
  IF COALESCE(@massa_dados, 0) = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'O histórico de operações não pode ser apagado.';
  END IF;
END$$

DELIMITER ;

-- =============================================================================
--  3. REGRAS DE NEGÓCIO NO BANCO
-- =============================================================================
DROP TRIGGER IF EXISTS trg_rn_solicitacao_nova;
DROP TRIGGER IF EXISTS trg_rn_solicitacao_fluxo;
DROP TRIGGER IF EXISTS trg_rn_animal_novo;
DROP TRIGGER IF EXISTS trg_rn_animal_alteracao;

DELIMITER $$

-- RN01 + RN03 + RN07: quem pode pedir adoção e de qual animal
CREATE TRIGGER trg_rn_solicitacao_nova
BEFORE INSERT ON solicitacao
FOR EACH ROW
BEGIN
  IF COALESCE(@massa_dados, 0) = 0 THEN
    IF NEW.status <> 'pendente' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Toda solicitação começa como pendente (RN07).';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM usuario u WHERE u.id = NEW.usuario_id AND u.perfil = 'adotante' AND u.ativo = 1) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Só adotantes com conta ativa podem pedir adoção (RN03).';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM formulario_avaliacao f WHERE f.usuario_id = NEW.usuario_id) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Preencha o formulário de avaliação antes de pedir adoção (RN03).';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM animal a JOIN ong o ON o.id = a.ong_id
                   WHERE a.id = NEW.animal_id AND a.excluido_em IS NULL
                     AND a.status <> 'adotado' AND o.status = 'aprovada') THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Este animal não está disponível para adoção (RN01).';
    END IF;
  END IF;
END$$

-- RN07: máquina de estados da solicitação
--   pendente   → em_analise, aprovada, recusada, cancelada, encerrada
--   em_analise → aprovada, recusada, cancelada, encerrada
--   aprovada   → concluida
--   recusada, concluida, cancelada, encerrada → finais (não mudam mais)
CREATE TRIGGER trg_rn_solicitacao_fluxo
BEFORE UPDATE ON solicitacao
FOR EACH ROW
BEGIN
  IF COALESCE(@massa_dados, 0) = 0 AND NOT (OLD.status <=> NEW.status) THEN
    IF NOT (
         (OLD.status = 'pendente'   AND NEW.status IN ('em_analise', 'aprovada', 'recusada', 'cancelada', 'encerrada'))
      OR (OLD.status = 'em_analise' AND NEW.status IN ('aprovada', 'recusada', 'cancelada', 'encerrada'))
      OR (OLD.status = 'aprovada'   AND NEW.status = 'concluida')
    ) THEN
      SET @rn_msg = CONCAT('Mudança de status não permitida: ', OLD.status, ' → ', NEW.status, ' (RN07).');
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = @rn_msg;
    END IF;
  END IF;
END$$

-- RN04: só ONG aprovada cadastra animal; animal nasce disponível
CREATE TRIGGER trg_rn_animal_novo
BEFORE INSERT ON animal
FOR EACH ROW
BEGIN
  IF COALESCE(@massa_dados, 0) = 0 THEN
    IF NOT EXISTS (SELECT 1 FROM ong o WHERE o.id = NEW.ong_id AND o.status = 'aprovada') THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Só ONGs aprovadas pelo administrador podem cadastrar animais (RN04).';
    END IF;
    IF NEW.status <> 'disponivel' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Todo animal é cadastrado como disponível (RN06).';
    END IF;
  END IF;
END$$

-- RN06 + RN08: status do animal coerente com as solicitações; exclusão segura
CREATE TRIGGER trg_rn_animal_alteracao
BEFORE UPDATE ON animal
FOR EACH ROW
BEGIN
  IF COALESCE(@massa_dados, 0) = 0 THEN
    IF NEW.status = 'adotado' AND NOT (OLD.status <=> 'adotado')
       AND NOT EXISTS (SELECT 1 FROM solicitacao s WHERE s.animal_id = NEW.id AND s.status = 'concluida') THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'O animal só fica "adotado" quando uma adoção é concluída (RN06).';
    END IF;
    IF OLD.status = 'adotado' AND NOT (NEW.status <=> 'adotado') THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Animal adotado não volta para a lista de adoção (RN06).';
    END IF;
    IF NEW.status = 'disponivel' AND NOT (OLD.status <=> 'disponivel')
       AND EXISTS (SELECT 1 FROM solicitacao s WHERE s.animal_id = NEW.id AND s.status = 'aprovada') THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Há uma adoção aprovada para este animal: conclua ou trate a solicitação antes (RN06).';
    END IF;
    IF OLD.excluido_em IS NULL AND NEW.excluido_em IS NOT NULL
       AND EXISTS (SELECT 1 FROM solicitacao s WHERE s.animal_id = NEW.id
                   AND s.status IN ('pendente', 'em_analise', 'aprovada')) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Animal com solicitação em aberto não pode ser excluído (RN08).';
    END IF;
  END IF;
END$$

DELIMITER ;

-- =============================================================================
--  4. VIEW DE CONFERÊNCIA: quem pode o quê (matriz de permissões da aplicação)
--  Documenta no banco as mesmas regras que o backend e o front aplicam.
-- =============================================================================
CREATE OR REPLACE VIEW vw_matriz_permissoes AS
SELECT 'Ver animais disponíveis'           AS funcionalidade, 'sim' AS visitante, 'sim' AS adotante, 'sim' AS ong, 'sim' AS admin
UNION ALL SELECT 'Favoritar animal',                   'não', 'sim', 'não', 'não'
UNION ALL SELECT 'Preencher formulário de avaliação',  'não', 'sim', 'não', 'não'
UNION ALL SELECT 'Pedir adoção',                       'não', 'sim (com formulário)', 'não', 'não'
UNION ALL SELECT 'Cancelar a própria solicitação',     'não', 'sim (pendente/em análise)', 'não', 'não'
UNION ALL SELECT 'Cadastrar e editar animais',         'não', 'não', 'sim (ONG aprovada, só os seus)', 'não'
UNION ALL SELECT 'Analisar, aprovar e recusar pedidos','não', 'não', 'sim (só dos seus animais)', 'não'
UNION ALL SELECT 'Registrar acompanhamento',           'não', 'não', 'sim (adoções concluídas)', 'não'
UNION ALL SELECT 'Relatórios da própria ONG',          'não', 'não', 'sim', 'sim'
UNION ALL SELECT 'Dashboard e relatórios gerais',      'não', 'não', 'não', 'sim'
UNION ALL SELECT 'Aprovar ou suspender ONGs',          'não', 'não', 'não', 'sim'
UNION ALL SELECT 'Ativar ou desativar contas',         'não', 'não', 'não', 'sim (exceto a própria)'
UNION ALL SELECT 'Excluir anúncio de animal',          'não', 'não', 'sim (sem pedido em aberto)', 'sim (sem pedido em aberto)'
UNION ALL SELECT 'Histórico de operações (logs)',      'não', 'não', 'não', 'sim (somente leitura)';

GRANT SELECT ON petconnect.vw_matriz_permissoes TO 'petconnect_relatorio'@'localhost';

SELECT 'Script 10 (Sprint 08) executado com sucesso.' AS resultado;
