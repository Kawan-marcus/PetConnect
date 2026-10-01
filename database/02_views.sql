-- =============================================================================
--  PetConnect — Script 02: views (consultas prontas usadas pelo backend)
--  Executar depois do 01_schema.sql.
-- =============================================================================

USE petconnect;

-- -----------------------------------------------------------------------------
-- Animais visíveis ao público (tela /animais): não excluídos, não adotados,
-- de ONGs aprovadas (RN04). Já traz a foto de capa e os dados da ONG.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_animal_publico AS
SELECT
  a.id, a.ong_id, a.nome, a.especie, a.raca, a.idade_meses, a.sexo, a.porte, a.energia,
  a.convivencia_criancas, a.convivencia_animais, a.castrado, a.vacinado,
  a.descricao, a.status, a.criado_em,
  CASE
    WHEN a.idade_meses < 12 THEN 'filhote'
    WHEN a.idade_meses < 96 THEN 'adulto'
    ELSE 'idoso'
  END                                 AS faixa_etaria,
  (SELECT f.url FROM foto_animal f
    WHERE f.animal_id = a.id ORDER BY f.ordem LIMIT 1) AS foto_capa,
  o.nome     AS ong_nome,
  o.cidade   AS ong_cidade,
  o.telefone AS ong_telefone
FROM animal a
JOIN ong o ON o.id = a.ong_id
WHERE a.excluido_em IS NULL
  AND a.status <> 'adotado'
  AND o.status = 'aprovada';

-- -----------------------------------------------------------------------------
-- Solicitação com nomes do animal, do adotante e da ONG (listas e histórico).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_solicitacao_detalhe AS
SELECT
  s.id, s.status, s.score, s.mensagem, s.motivo_recusa, s.criado_em, s.atualizado_em,
  s.animal_id,  a.nome  AS animal_nome,
  s.usuario_id, u.nome  AS adotante_nome, u.email AS adotante_email,
  u.telefone AS adotante_telefone, u.cidade AS adotante_cidade,
  a.ong_id,     o.nome  AS ong_nome
FROM solicitacao s
JOIN animal  a ON a.id = s.animal_id
JOIN usuario u ON u.id = s.usuario_id
JOIN ong     o ON o.id = a.ong_id;

-- -----------------------------------------------------------------------------
-- Data em que cada adoção foi concluída (último registro "concluida").
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_adocao_concluida AS
SELECT
  s.id          AS solicitacao_id,
  s.animal_id,
  s.usuario_id,
  a.ong_id,
  s.criado_em   AS solicitada_em,
  MAX(h.criado_em) AS concluida_em,
  DATEDIFF(MAX(h.criado_em), s.criado_em) AS dias_ate_adocao
FROM solicitacao s
JOIN animal a ON a.id = s.animal_id
JOIN historico_solicitacao h ON h.solicitacao_id = s.id AND h.status = 'concluida'
WHERE s.status = 'concluida'
GROUP BY s.id, s.animal_id, s.usuario_id, a.ong_id, s.criado_em;

-- -----------------------------------------------------------------------------
-- Dashboard do admin (GET /admin/estatisticas)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_estatisticas_totais AS
SELECT
  (SELECT COUNT(*) FROM animal  WHERE excluido_em IS NULL AND status = 'disponivel')  AS animais_disponiveis,
  (SELECT COUNT(*) FROM animal  WHERE excluido_em IS NULL AND status = 'em_processo') AS em_processo,
  (SELECT COUNT(*) FROM animal  WHERE status = 'adotado')                              AS adotados,
  (SELECT COUNT(*) FROM usuario WHERE perfil = 'adotante')                             AS adotantes,
  (SELECT COUNT(*) FROM ong     WHERE status = 'aprovada')                             AS ongs_aprovadas,
  (SELECT COUNT(*) FROM ong     WHERE status = 'pendente')                             AS ongs_pendentes,
  (SELECT COUNT(*) FROM solicitacao WHERE status IN ('pendente','em_analise'))         AS solicitacoes_abertas,
  (SELECT ROUND(AVG(dias_ate_adocao)) FROM vw_adocao_concluida)                        AS tempo_medio_adocao_dias;

CREATE OR REPLACE VIEW vw_adocoes_por_mes AS
SELECT
  DATE_FORMAT(concluida_em, '%Y-%m') AS mes,
  COUNT(*)                           AS adocoes
FROM vw_adocao_concluida
GROUP BY DATE_FORMAT(concluida_em, '%Y-%m');

CREATE OR REPLACE VIEW vw_adocoes_por_ong AS
SELECT
  o.id   AS ong_id,
  o.nome AS ong,
  o.status,
  (SELECT COUNT(*) FROM animal a WHERE a.ong_id = o.id AND a.excluido_em IS NULL) AS animais,
  (SELECT COUNT(*) FROM vw_adocao_concluida c WHERE c.ong_id = o.id)              AS adocoes
FROM ong o;
