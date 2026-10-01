-- =============================================================================
--  PetConnect — Script 04: consultas de verificação (evidências para o PDF)
--  Rode cada bloco separadamente no MySQL Workbench e tire print do resultado.
--  Nada aqui altera os dados de forma permanente: os testes usam ROLLBACK.
-- =============================================================================

USE petconnect;

-- 1) Banco conectado: tabelas criadas e quantidade de registros
SELECT table_name AS tabela, table_rows AS linhas_aprox
FROM information_schema.tables
WHERE table_schema = 'petconnect' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2) Usuários e perfis (controle de acesso)
SELECT u.id, u.nome, u.email, u.perfil, o.nome AS ong, u.ativo
FROM usuario u
LEFT JOIN ong o ON o.id = u.ong_id
ORDER BY u.perfil, u.nome;

-- 3) Login: a senha é guardada como hash bcrypt, nunca em texto puro
SELECT email, perfil, LEFT(senha_hash, 7) AS algoritmo_e_custo, CHAR_LENGTH(senha_hash) AS tamanho_hash
FROM usuario;

-- 4) Animais que aparecem para o público (só ONGs aprovadas, sem adotados)
SELECT id, nome, especie, raca, faixa_etaria, porte, status, ong_nome, foto_capa
FROM vw_animal_publico
ORDER BY criado_em DESC;

-- 5) Filtro da tela /animais: gatos de porte pequeno
SELECT id, nome, raca, idade_meses
FROM vw_animal_publico
WHERE especie = 'gato' AND porte = 'pequeno';

-- 6) Solicitações com a linha do tempo
SELECT s.id, s.animal_nome, s.adotante_nome, s.ong_nome, s.status, s.score,
       h.status AS etapa, h.criado_em AS quando, h.observacao
FROM vw_solicitacao_detalhe s
JOIN historico_solicitacao h ON h.solicitacao_id = s.id
ORDER BY s.id, h.criado_em;

-- 7) Dashboard do admin
SELECT * FROM vw_estatisticas_totais;
SELECT * FROM vw_adocoes_por_ong;
SELECT * FROM vw_adocoes_por_mes;

-- =============================================================================
--  CRUD principal (Animal) — demonstração dentro de uma transação
-- =============================================================================
START TRANSACTION;

-- CREATE
INSERT INTO animal (ong_id, nome, especie, raca, idade_meses, sexo, porte, energia,
  convivencia_criancas, convivencia_animais, castrado, vacinado, descricao)
VALUES (1, 'Teste', 'cao', 'SRD', 12, 'M', 'medio', 'media', TRUE, TRUE, TRUE, TRUE,
  'Animal criado para testar o CRUD do banco.');
SET @novo = LAST_INSERT_ID();
INSERT INTO foto_animal (animal_id, url, ordem) VALUES (@novo, '/animais/1-1.svg', 0);

-- READ
SELECT id, nome, status, foto_capa FROM vw_animal_publico WHERE id = @novo;

-- UPDATE
UPDATE animal SET nome = 'Teste Atualizado', status = 'em_processo' WHERE id = @novo;
SELECT id, nome, status FROM animal WHERE id = @novo;

-- DELETE (exclusão lógica: some das listas, mas o histórico é preservado)
UPDATE animal SET excluido_em = NOW() WHERE id = @novo;
SELECT COUNT(*) AS continua_visivel FROM vw_animal_publico WHERE id = @novo;   -- esperado: 0

ROLLBACK;

-- =============================================================================
--  Regras de negócio garantidas pelo banco
--  Cada comando abaixo DEVE FALHAR. O erro é a evidência de que a regra funciona.
-- =============================================================================

-- RN05: Ana (id 2) já tem solicitação ativa para o Thor (id 1).
--   Esperado: Error 1062 Duplicate entry ... for key 'uq_solicitacao_ativa_rn05'
INSERT INTO solicitacao (animal_id, usuario_id, status) VALUES (1, 2, 'pendente');

-- RN02: Paçoca (id 3) já tem uma solicitação aprovada; aprovar outra é bloqueado.
--   Esperado: Error 1062 Duplicate entry ... for key 'uq_solicitacao_vencedora_rn02'
INSERT INTO solicitacao (animal_id, usuario_id, status) VALUES (3, 3, 'aprovada');

-- Perfil ONG sem ONG vinculada
--   Esperado: Error 3819 Check constraint 'ck_usuario_perfil_ong' is violated
INSERT INTO usuario (nome, email, senha_hash, perfil)
VALUES ('Sem ONG', 'semong@email.com', REPEAT('x', 60), 'ong');

-- E-mail duplicado no cadastro
--   Esperado: Error 1062 Duplicate entry 'ana@email.com' for key 'uq_usuario_email'
INSERT INTO usuario (nome, email, senha_hash, perfil)
VALUES ('Outra Ana', 'ana@email.com', REPEAT('x', 60), 'adotante');

-- Recusa sem motivo
--   Esperado: Error 3819 Check constraint 'ck_solicitacao_recusa' is violated
UPDATE solicitacao SET status = 'recusada' WHERE id = 3;
