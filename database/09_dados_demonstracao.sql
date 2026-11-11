-- =============================================================================
--  PetConnect — Script 09: histórico de demonstração (Sprint 07)
--
--  Para que serve: o dashboard e os relatórios da Sprint 07 mostram tendências
--  por mês, taxa de aprovação, tempo até a adoção e histórico de operações.
--  Com só os 5 pedidos do seed os gráficos ficam vazios. Este script cria
--  alguns meses de uso "passado" numa base de desenvolvimento ou apresentação:
--    • adotantes de demonstração (e-mail @demo.petconnect, senha 123456);
--    • animais nas ONGs APROVADAS, com fotos, e marcados "(dados de demonstração)";
--    • solicitações com toda a linha do tempo (pendente → em análise → aprovada →
--      concluída, recusas com motivo, cancelamentos e encerramentos automáticos);
--    • acompanhamentos pós-adoção e os logs de cada operação NA DATA EM QUE ELA
--      ACONTECEU (por isso os triggers ficam desligados com @massa_dados = 1).
--
--  Os sorteios usam CRC32 do id (e não RAND), então funcionam igual no MySQL,
--  no MariaDB e em qualquer ordem de execução; a distribuição fica parecida
--  a cada geração (cerca de 45% de adoções concluídas e 20% de recusas). Todas as regras de negócio são
--  respeitadas (um vencedor por animal, recusa com motivo, adotado só depois
--  de concluída, encerradas quando outro pedido foi aprovado).
--  Os scores são simulados: maiores nas aprovadas, menores nas recusadas.
--
--  NÃO use em produção. Para apagar tudo:  CALL sp_limpar_historico_demo();
--  Ordem: 01 → 02 → 03 → 05 → 08 → 09 (este)
-- =============================================================================

USE petconnect;

DROP PROCEDURE IF EXISTS sp_gerar_historico_demo;
DROP PROCEDURE IF EXISTS sp_limpar_historico_demo;

DELIMITER $$

-- -----------------------------------------------------------------------------
--   CALL sp_gerar_historico_demo(6, 60, 40);  -- 6 meses, 60 animais, 40 adotantes
-- -----------------------------------------------------------------------------
CREATE PROCEDURE sp_gerar_historico_demo(IN p_meses INT, IN p_animais INT, IN p_adotantes INT)
BEGIN
  DECLARE v_ong1 INT UNSIGNED;
  DECLARE v_ong2 INT UNSIGNED;
  DECLARE v_hash CHAR(60) DEFAULT '$2b$10$vuk6MyzEP5wPI9NGIe74Au6iYZ0kR7hAvvGBcmVK1Guy0kCdJEvdS'; -- senha 123456

  IF p_meses < 1 OR p_meses > 24 OR p_animais < 1 OR p_animais > 2000 OR p_adotantes < 30 OR p_adotantes > 2000 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Use de 1 a 24 meses, até 2000 animais e de 30 a 2000 adotantes.';
  END IF;
  IF (SELECT COUNT(*) FROM usuario WHERE email LIKE '%@demo.petconnect') > 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Já existe histórico de demonstração. Rode CALL sp_limpar_historico_demo(); antes.';
  END IF;

  SET v_ong1 = (SELECT MIN(id) FROM ong WHERE status = 'aprovada');
  SET v_ong2 = (SELECT MAX(id) FROM ong WHERE status = 'aprovada');
  IF v_ong1 IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'É preciso ao menos uma ONG aprovada (rode o 03_seed.sql).';
  END IF;
  SET @demo_dias = p_meses * 30;
  SET @demo_animais = p_animais;
  SET @demo_adotantes = p_adotantes;
  SET @demo_hash = v_hash;
  SET @demo_ong1 = v_ong1;
  SET @demo_ong2 = v_ong2;
  SET @massa_dados = 1;

  -- Sequência 1..N (mesma técnica do script 05)
  DROP TEMPORARY TABLE IF EXISTS tmp_demo_seq;
  CREATE TEMPORARY TABLE tmp_demo_seq (n INT UNSIGNED NOT NULL);
  INSERT INTO tmp_demo_seq (n)
  SELECT n FROM (
    SELECT 1 + d1.d + 10 * d2.d + 100 * d3.d + 1000 * d4.d AS n
    FROM (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
          UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d1
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
          UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d2
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
          UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d3
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
          UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d4
  ) numeros
  WHERE n <= GREATEST(@demo_animais, @demo_adotantes);

  -- ---------------------------------------------------------------------------
  -- 1) Adotantes de demonstração (o formulário vem no passo 6)
  -- ---------------------------------------------------------------------------
  INSERT INTO usuario (nome, email, senha_hash, perfil, telefone, cidade, criado_em)
  SELECT CONCAT(ELT(1 + MOD(n, 20), 'Ana', 'Bruno', 'Camila', 'Diego', 'Elisa', 'Felipe', 'Gabriela', 'Hugo',
                    'Isabela', 'João', 'Larissa', 'Marcos', 'Natália', 'Otávio', 'Paula', 'Rafael',
                    'Sabrina', 'Tiago', 'Vanessa', 'William'), ' ',
                ELT(1 + MOD(n * 7, 15), 'Almeida', 'Barbosa', 'Cardoso', 'Dias', 'Ferreira', 'Gomes', 'Lima',
                    'Martins', 'Nunes', 'Oliveira', 'Pereira', 'Ribeiro', 'Santos', 'Teixeira', 'Vieira')),
         CONCAT('demo', n, '@demo.petconnect'), @demo_hash, 'adotante',
         CONCAT('(62) 9', LPAD(MOD(n * 7919, 10000), 4, '0'), '-', LPAD(MOD(n * 104729, 10000), 4, '0')),
         ELT(1 + MOD(n, 4), 'Goiânia - GO', 'Anápolis - GO', 'Aparecida de Goiânia - GO', 'Trindade - GO'),
         NOW() - INTERVAL (@demo_dias + 30) DAY
  FROM tmp_demo_seq WHERE n <= @demo_adotantes;

  DROP TEMPORARY TABLE IF EXISTS tmp_demo_usuario;
  CREATE TEMPORARY TABLE tmp_demo_usuario (idx INT UNSIGNED NOT NULL, usuario_id INT UNSIGNED NOT NULL);
  INSERT INTO tmp_demo_usuario (idx, usuario_id)
  SELECT ROW_NUMBER() OVER (ORDER BY u.id) - 1, u.id FROM usuario u WHERE u.email LIKE '%@demo.petconnect';

  -- ---------------------------------------------------------------------------
  -- 2) Animais nas ONGs aprovadas, cadastrados ao longo do período
  -- ---------------------------------------------------------------------------
  INSERT INTO animal (ong_id, nome, especie, raca, idade_meses, sexo, porte, energia,
                      convivencia_criancas, convivencia_animais, castrado, vacinado, descricao, criado_em)
  SELECT IF(MOD(n, 2) = 0, @demo_ong1, @demo_ong2),
         ELT(1 + MOD(n * 3, 30), 'Amora', 'Bolinha', 'Caramelo', 'Dengo', 'Estrela', 'Faísca', 'Grão', 'Honey',
             'Iris', 'Jade', 'Kiara', 'Lua', 'Mel', 'Nina', 'Oreo', 'Pipoca', 'Quindim', 'Romeu', 'Sushi',
             'Tobias', 'Uva', 'Vitória', 'Xodó', 'Zeca', 'Biscoito', 'Cacau', 'Pandora', 'Rex', 'Simba', 'Tom'),
         IF(MOD(n, 5) < 3, 'cao', 'gato'),
         IF(MOD(n, 5) < 3, ELT(1 + MOD(n, 4), 'SRD', 'Vira-lata', 'Labrador', 'Poodle'),
                           ELT(1 + MOD(n, 3), 'SRD', 'Siamês', 'Persa')),
         2 + MOD(n * 11, 120),
         IF(MOD(n, 2) = 0, 'M', 'F'),
         IF(MOD(n, 5) < 3, ELT(1 + MOD(n * 7, 3), 'pequeno', 'medio', 'grande'),
                           ELT(1 + MOD(n * 7, 2), 'pequeno', 'medio')),
         ELT(1 + MOD(n * 13, 3), 'baixa', 'media', 'alta'),
         MOD(n * 17, 10) < 7, MOD(n * 19, 10) < 6, MOD(n * 23, 10) < 8, TRUE,
         'Animal resgatado, carinhoso e pronto para uma família. (dados de demonstração)',
         NOW() - INTERVAL (8 + MOD(CRC32(CONCAT(n, 'cad')), @demo_dias - 8)) DAY
             - INTERVAL MOD(n * 37, 600) MINUTE
  FROM tmp_demo_seq WHERE n <= @demo_animais;

  INSERT INTO foto_animal (animal_id, url, ordem)
  SELECT a.id,
         IF(a.especie = 'gato',
            CONCAT('/animais/', ELT(1 + MOD(a.id, 4), '2', '4', '7', '10'), '-1.svg'),
            CONCAT('/animais/', ELT(1 + MOD(a.id, 8), '1', '3', '5', '6', '8', '9', '11', '12'), '-1.svg')),
         0
  FROM animal a
  WHERE a.descricao LIKE '%(dados de demonstração)';

  -- ---------------------------------------------------------------------------
  -- 3) Planejamento por animal: quantos pedidos e o destino do pedido principal
  -- ---------------------------------------------------------------------------
  DROP TEMPORARY TABLE IF EXISTS tmp_demo_animal;
  CREATE TEMPORARY TABLE tmp_demo_animal (
    animal_id INT UNSIGNED NOT NULL, ong_usuario INT UNSIGNED NULL,
    pedidos INT NOT NULL, destino VARCHAR(20) NOT NULL,
    base DATETIME NOT NULL, d_analise DATETIME NOT NULL, d_aprov DATETIME NOT NULL,
    d_concl DATETIME NOT NULL, d_fim DATETIME NOT NULL
  );
  INSERT INTO tmp_demo_animal (animal_id, ong_usuario, pedidos, destino, base, d_analise, d_aprov, d_concl, d_fim)
  SELECT x.id, NULL,
         IF(x.h_ped < 12, 0, 1 + MOD(x.h_ped, 3)),
         CASE WHEN x.h_dest < 45 THEN 'concluida' WHEN x.h_dest < 55 THEN 'aprovada'
              WHEN x.h_dest < 75 THEN 'recusada'  WHEN x.h_dest < 85 THEN 'cancelada'
              WHEN x.h_dest < 93 THEN 'em_analise' ELSE 'pendente' END,
         x.base,
         x.base + INTERVAL (20 + MOD(x.h_ped, 30)) HOUR,
         x.base + INTERVAL (4 + MOD(x.h_dest, 5)) DAY,
         x.base + INTERVAL (4 + MOD(x.h_dest, 5) + 3 + MOD(x.h_ped, 12)) DAY,
         x.base + INTERVAL (2 + MOD(x.h_ped, 4)) DAY
  FROM (SELECT a.id,
               MOD(CRC32(CONCAT(a.id, 'ped')), 100) AS h_ped,
               MOD(CRC32(CONCAT(a.id, 'dest')), 100) AS h_dest,
               a.criado_em + INTERVAL (1 + MOD(CRC32(CONCAT(a.id, 'base')), 6)) DAY AS base
        FROM animal a WHERE a.descricao LIKE '%(dados de demonstração)') x;

  UPDATE tmp_demo_animal t
  SET t.ong_usuario = (SELECT MIN(u.id) FROM usuario u JOIN animal a ON a.ong_id = u.ong_id WHERE a.id = t.animal_id);

  -- O que ainda não deu tempo de acontecer "volta" uma etapa
  UPDATE tmp_demo_animal SET destino = 'aprovada'   WHERE destino = 'concluida' AND d_concl > NOW();
  UPDATE tmp_demo_animal SET destino = 'em_analise' WHERE destino = 'aprovada'  AND d_aprov > NOW();
  UPDATE tmp_demo_animal SET destino = 'em_analise' WHERE destino IN ('recusada', 'cancelada') AND d_fim > NOW();
  UPDATE tmp_demo_animal SET destino = 'pendente'   WHERE destino = 'em_analise' AND d_analise > NOW();
  DELETE FROM tmp_demo_animal WHERE pedidos = 0 OR base > NOW();

  -- ---------------------------------------------------------------------------
  -- 4) Pedidos: o 1º segue o destino; os outros são encerrados (se houve
  --    aprovação, RN02), recusados, cancelados ou continuam abertos
  -- ---------------------------------------------------------------------------
  DROP TEMPORARY TABLE IF EXISTS tmp_demo_sol;
  CREATE TEMPORARY TABLE tmp_demo_sol (
    animal_id INT UNSIGNED NOT NULL, usuario_id INT UNSIGNED NOT NULL, ong_usuario INT UNSIGNED NULL,
    k INT NOT NULL, status VARCHAR(20) NOT NULL, score INT NOT NULL,
    criado_em DATETIME NOT NULL, d_analise DATETIME NOT NULL, d_aprov DATETIME NOT NULL,
    d_concl DATETIME NOT NULL, d_fim DATETIME NOT NULL, motivo VARCHAR(200) NULL
  );
  INSERT INTO tmp_demo_sol (animal_id, usuario_id, ong_usuario, k, status, score, criado_em,
                            d_analise, d_aprov, d_concl, d_fim, motivo)
  SELECT t.animal_id, du.usuario_id, t.ong_usuario, s.n,
         CASE WHEN s.n = 1 THEN t.destino
              WHEN t.destino IN ('aprovada', 'concluida') THEN
                   IF(MOD(CRC32(CONCAT(t.animal_id, '-', s.n)), 100) < 70, 'encerrada', 'cancelada')
              ELSE ELT(1 + MOD(CRC32(CONCAT(t.animal_id, '-', s.n)), 4), 'recusada', 'cancelada', 'em_analise', 'pendente')
         END,
         0,
         t.base + INTERVAL (s.n - 1) DAY + INTERVAL MOD(CRC32(CONCAT(t.animal_id, 'min', s.n)), 600) MINUTE,
         t.d_analise + INTERVAL (s.n - 1) DAY,
         t.d_aprov,
         t.d_concl,
         IF(s.n = 1, t.d_fim, t.base + INTERVAL (s.n) DAY + INTERVAL 5 HOUR),
         NULL
  FROM tmp_demo_animal t
  JOIN tmp_demo_seq s ON s.n <= t.pedidos
  JOIN tmp_demo_usuario du ON du.idx = MOD(t.animal_id * 7 + s.n * 13, @demo_adotantes);

  -- Encerramento automático acontece no momento da aprovação do vencedor
  UPDATE tmp_demo_sol SET d_fim = d_aprov WHERE status = 'encerrada';
  -- Pedidos secundários que ainda "não aconteceram" continuam pendentes
  UPDATE tmp_demo_sol SET status = 'pendente' WHERE k > 1 AND status IN ('recusada', 'cancelada') AND d_fim > NOW();
  UPDATE tmp_demo_sol SET status = 'pendente' WHERE k > 1 AND status = 'em_analise' AND d_analise > NOW();
  DELETE FROM tmp_demo_sol WHERE criado_em > NOW();

  UPDATE tmp_demo_sol
  SET score = CASE WHEN status IN ('aprovada', 'concluida') THEN 70 + MOD(CRC32(CONCAT(animal_id, 's', k)), 27)
                   WHEN status = 'recusada'                THEN 22 + MOD(CRC32(CONCAT(animal_id, 's', k)), 36)
                   ELSE 45 + MOD(CRC32(CONCAT(animal_id, 's', k)), 46) END,
      motivo = IF(status = 'recusada',
                  ELT(1 + MOD(CRC32(CONCAT(animal_id, 'mot', k)), 4),
                      'Moradia sem tela de proteção para o animal.',
                      'O animal precisa de mais espaço e companhia durante o dia.',
                      'Perfil de energia incompatível com a rotina informada.',
                      'Não foi possível concluir a entrevista com o adotante.'), NULL);

  INSERT INTO solicitacao (animal_id, usuario_id, status, score, mensagem, motivo_recusa, criado_em, atualizado_em)
  SELECT animal_id, usuario_id, status, score, 'Tenho muito interesse! (dados de demonstração)', motivo, criado_em,
         CASE status WHEN 'concluida' THEN d_concl WHEN 'aprovada' THEN d_aprov WHEN 'em_analise' THEN d_analise
                     WHEN 'pendente' THEN criado_em ELSE d_fim END
  FROM tmp_demo_sol;

  -- ---------------------------------------------------------------------------
  -- 5) Linha do tempo de cada pedido (historico_solicitacao), etapa por etapa
  -- ---------------------------------------------------------------------------
  INSERT INTO historico_solicitacao (solicitacao_id, status, observacao, alterado_por, criado_em)
  SELECT s.id, 'pendente', 'Solicitação enviada', t.usuario_id, t.criado_em
  FROM tmp_demo_sol t JOIN solicitacao s ON s.animal_id = t.animal_id AND s.usuario_id = t.usuario_id;

  INSERT INTO historico_solicitacao (solicitacao_id, status, observacao, alterado_por, criado_em)
  SELECT s.id, 'em_analise', 'ONG iniciou a análise', t.ong_usuario, t.d_analise
  FROM tmp_demo_sol t JOIN solicitacao s ON s.animal_id = t.animal_id AND s.usuario_id = t.usuario_id
  WHERE t.status IN ('em_analise', 'aprovada', 'concluida')
     OR (t.status = 'recusada' AND MOD(t.score, 2) = 0);

  INSERT INTO historico_solicitacao (solicitacao_id, status, observacao, alterado_por, criado_em)
  SELECT s.id, 'aprovada', 'Adoção aprovada. Combine a entrega com a ONG.', t.ong_usuario, t.d_aprov
  FROM tmp_demo_sol t JOIN solicitacao s ON s.animal_id = t.animal_id AND s.usuario_id = t.usuario_id
  WHERE t.status IN ('aprovada', 'concluida');

  INSERT INTO historico_solicitacao (solicitacao_id, status, observacao, alterado_por, criado_em)
  SELECT s.id, 'concluida', 'Adoção concluída. Bem-vindo à família!', t.ong_usuario, t.d_concl
  FROM tmp_demo_sol t JOIN solicitacao s ON s.animal_id = t.animal_id AND s.usuario_id = t.usuario_id
  WHERE t.status = 'concluida';

  INSERT INTO historico_solicitacao (solicitacao_id, status, observacao, alterado_por, criado_em)
  SELECT s.id, t.status,
         CASE t.status WHEN 'recusada'  THEN t.motivo
                       WHEN 'cancelada' THEN 'Cancelada pelo adotante'
                       ELSE 'Encerrada automaticamente: outro pedido foi aprovado (RN02)' END,
         CASE t.status WHEN 'recusada' THEN t.ong_usuario WHEN 'cancelada' THEN t.usuario_id ELSE NULL END,
         t.d_fim
  FROM tmp_demo_sol t JOIN solicitacao s ON s.animal_id = t.animal_id AND s.usuario_id = t.usuario_id
  WHERE t.status IN ('recusada', 'cancelada', 'encerrada');

  -- Status do animal acompanha o pedido vencedor
  UPDATE animal a
  SET a.status = 'adotado',
      a.atualizado_em = (SELECT t.d_concl FROM tmp_demo_animal t WHERE t.animal_id = a.id)
  WHERE a.id IN (SELECT t.animal_id FROM tmp_demo_animal t WHERE t.destino = 'concluida');
  UPDATE animal a
  SET a.status = 'em_processo',
      a.atualizado_em = (SELECT t.d_aprov FROM tmp_demo_animal t WHERE t.animal_id = a.id)
  WHERE a.id IN (SELECT t.animal_id FROM tmp_demo_animal t WHERE t.destino = 'aprovada');

  -- ---------------------------------------------------------------------------
  -- 6) Acompanhamento pós-adoção (visita após 7 dias, contato após 30)
  -- ---------------------------------------------------------------------------
  INSERT INTO acompanhamento (solicitacao_id, tipo, data, observacao, registrado_por, criado_em)
  SELECT s.id, 'visita', t.d_concl + INTERVAL 7 DAY, 'Visita feita: animal adaptado e bem cuidado.', t.ong_usuario,
         t.d_concl + INTERVAL 7 DAY
  FROM tmp_demo_sol t JOIN solicitacao s ON s.animal_id = t.animal_id AND s.usuario_id = t.usuario_id
  WHERE t.status = 'concluida' AND t.d_concl + INTERVAL 7 DAY <= NOW();

  INSERT INTO acompanhamento (solicitacao_id, tipo, data, observacao, registrado_por, criado_em)
  SELECT s.id, 'contato', t.d_concl + INTERVAL 30 DAY, 'Contato por telefone: tudo certo, vacinas em dia.', t.ong_usuario,
         t.d_concl + INTERVAL 30 DAY
  FROM tmp_demo_sol t JOIN solicitacao s ON s.animal_id = t.animal_id AND s.usuario_id = t.usuario_id
  WHERE t.status = 'concluida' AND t.d_concl + INTERVAL 30 DAY <= NOW();

  -- Cada adotante "se cadastrou" um pouco antes do primeiro pedido
  UPDATE usuario u
  SET u.criado_em = (SELECT MIN(t.criado_em) FROM tmp_demo_sol t WHERE t.usuario_id = u.id) - INTERVAL (1 + MOD(u.id, 20)) DAY
  WHERE u.email LIKE '%@demo.petconnect' AND u.id IN (SELECT t2.usuario_id FROM tmp_demo_sol t2);
  UPDATE usuario u
  SET u.criado_em = NOW() - INTERVAL (1 + MOD(CRC32(CONCAT(u.id, 'u')), @demo_dias)) DAY
  WHERE u.email LIKE '%@demo.petconnect' AND u.criado_em < NOW() - INTERVAL (@demo_dias + 20) DAY;
  -- Formulário de avaliação (RN03), preenchido logo após o cadastro
  INSERT INTO formulario_avaliacao (usuario_id, tipo_moradia, tem_quintal, tela_protecao, pessoas_casa,
                                    tem_criancas, outros_animais, horas_sozinho, experiencia, nivel_atividade, motivacao, criado_em, atualizado_em)
  SELECT u.id,
         IF(MOD(CRC32(CONCAT(u.id, 'm')), 100) < 45, 'apartamento', 'casa'),
         MOD(CRC32(CONCAT(u.id, 'q')), 2), MOD(CRC32(CONCAT(u.id, 't')), 2),
         1 + MOD(CRC32(CONCAT(u.id, 'p')), 5),
         MOD(CRC32(CONCAT(u.id, 'c')), 100) < 40, MOD(CRC32(CONCAT(u.id, 'o')), 100) < 40,
         MOD(CRC32(CONCAT(u.id, 'h')), 11),
         ELT(1 + MOD(CRC32(CONCAT(u.id, 'e')), 3), 'nenhuma', 'alguma', 'muita'),
         ELT(1 + MOD(CRC32(CONCAT(u.id, 'a')), 3), 'baixo', 'medio', 'alto'),
         'Quero dar um lar com carinho e responsabilidade. (dados de demonstração)',
         u.criado_em + INTERVAL 2 HOUR, u.criado_em + INTERVAL 2 HOUR
  FROM usuario u WHERE u.email LIKE '%@demo.petconnect';

  -- ---------------------------------------------------------------------------
  -- 7) Logs com a data real de cada operação (histórico de operações)
  -- ---------------------------------------------------------------------------
  INSERT INTO log_acao (usuario_id, acao, entidade, entidade_id, detalhes, origem, criado_em)
  SELECT u.id, 'usuario.cadastro', 'usuario', u.id, JSON_OBJECT('perfil', 'adotante', 'demonstracao', TRUE), 'trigger', u.criado_em
  FROM usuario u WHERE u.email LIKE '%@demo.petconnect';

  INSERT INTO log_acao (usuario_id, acao, entidade, entidade_id, detalhes, origem, criado_em)
  SELECT f.usuario_id, 'formulario.preenchido', 'formulario', f.usuario_id,
         JSON_OBJECT('moradia', CAST(f.tipo_moradia AS CHAR), 'demonstracao', TRUE), 'trigger', f.criado_em
  FROM formulario_avaliacao f JOIN usuario u ON u.id = f.usuario_id WHERE u.email LIKE '%@demo.petconnect';

  INSERT INTO log_acao (usuario_id, acao, entidade, entidade_id, detalhes, origem, criado_em)
  SELECT (SELECT MIN(u.id) FROM usuario u WHERE u.ong_id = a.ong_id), 'animal.cadastrado', 'animal', a.id,
         JSON_OBJECT('nome', a.nome, 'ong_id', a.ong_id, 'demonstracao', TRUE), 'trigger', a.criado_em
  FROM animal a WHERE a.descricao LIKE '%(dados de demonstração)';

  INSERT INTO log_acao (usuario_id, acao, entidade, entidade_id, detalhes, origem, criado_em)
  SELECT h.alterado_por, CONCAT('solicitacao.', h.status), 'solicitacao', h.solicitacao_id,
         JSON_OBJECT('observacao', h.observacao, 'demonstracao', TRUE), 'trigger', h.criado_em
  FROM historico_solicitacao h
  JOIN solicitacao s ON s.id = h.solicitacao_id
  JOIN usuario u ON u.id = s.usuario_id
  WHERE u.email LIKE '%@demo.petconnect';

  INSERT INTO log_acao (usuario_id, acao, entidade, entidade_id, detalhes, origem, criado_em)
  SELECT t.ong_usuario, 'animal.status', 'animal', a.id,
         JSON_OBJECT('nome', a.nome, 'de', 'disponivel', 'para', 'em_processo', 'demonstracao', TRUE), 'trigger', t.d_aprov
  FROM tmp_demo_animal t JOIN animal a ON a.id = t.animal_id
  WHERE t.destino IN ('aprovada', 'concluida');

  INSERT INTO log_acao (usuario_id, acao, entidade, entidade_id, detalhes, origem, criado_em)
  SELECT t.ong_usuario, 'animal.status', 'animal', a.id,
         JSON_OBJECT('nome', a.nome, 'de', 'em_processo', 'para', 'adotado', 'demonstracao', TRUE), 'trigger', t.d_concl
  FROM tmp_demo_animal t JOIN animal a ON a.id = t.animal_id
  WHERE t.destino = 'concluida';

  INSERT INTO log_acao (usuario_id, acao, entidade, entidade_id, detalhes, origem, criado_em)
  SELECT ac.registrado_por, 'acompanhamento.registrado', 'solicitacao', ac.solicitacao_id,
         JSON_OBJECT('tipo', CAST(ac.tipo AS CHAR), 'demonstracao', TRUE), 'trigger', ac.data
  FROM acompanhamento ac
  JOIN solicitacao s ON s.id = ac.solicitacao_id
  JOIN usuario u ON u.id = s.usuario_id
  WHERE u.email LIKE '%@demo.petconnect';

  SET @massa_dados = NULL;
  DROP TEMPORARY TABLE IF EXISTS tmp_demo_sol;
  DROP TEMPORARY TABLE IF EXISTS tmp_demo_animal;
  DROP TEMPORARY TABLE IF EXISTS tmp_demo_usuario;
  DROP TEMPORARY TABLE IF EXISTS tmp_demo_seq;

  SELECT
    (SELECT COUNT(*) FROM usuario WHERE email LIKE '%@demo.petconnect')                       AS adotantes_demo,
    (SELECT COUNT(*) FROM animal WHERE descricao LIKE '%(dados de demonstração)')            AS animais_demo,
    (SELECT COUNT(*) FROM solicitacao WHERE mensagem LIKE '%(dados de demonstração)')        AS solicitacoes_demo,
    (SELECT COUNT(*) FROM log_acao WHERE JSON_EXTRACT(detalhes, '$.demonstracao') = TRUE)    AS logs_demo;
END$$

-- -----------------------------------------------------------------------------
--   CALL sp_limpar_historico_demo();   -- remove tudo o que o 09 criou
-- -----------------------------------------------------------------------------
CREATE PROCEDURE sp_limpar_historico_demo()
BEGIN
  SET @massa_dados = 1;   -- também libera a limpeza dos logs (log imutável, script 10)

  DELETE FROM log_acao WHERE JSON_EXTRACT(detalhes, '$.demonstracao') = TRUE;
  -- histórico e acompanhamento saem junto com a solicitação (ON DELETE CASCADE)
  DELETE s FROM solicitacao s JOIN usuario u ON u.id = s.usuario_id WHERE u.email LIKE '%@demo.petconnect';
  DELETE s FROM solicitacao s JOIN animal a ON a.id = s.animal_id WHERE a.descricao LIKE '%(dados de demonstração)';
  -- fotos, favoritos e análises saem junto com o animal (ON DELETE CASCADE)
  DELETE FROM animal  WHERE descricao LIKE '%(dados de demonstração)';
  -- formulário e notificações saem junto com o usuário (ON DELETE CASCADE)
  DELETE FROM usuario WHERE email LIKE '%@demo.petconnect';

  SET @massa_dados = NULL;
  SELECT 'Histórico de demonstração removido.' AS resultado;
END$$

DELIMITER ;

-- Gera 6 meses de uso: 60 animais e 40 adotantes (leva menos de 1 segundo).
-- Para apagar:  CALL sp_limpar_historico_demo();
CALL sp_gerar_historico_demo(6, 60, 40);

-- Conferência rápida
SELECT mes, COUNT(*) AS solicitacoes, SUM(status = 'concluida') AS concluidas
FROM vw_rel_solicitacoes GROUP BY mes ORDER BY mes;
SELECT * FROM vw_rel_compatibilidade ORDER BY score_medio DESC;
