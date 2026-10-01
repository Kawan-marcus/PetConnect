-- =============================================================================
--  PetConnect — Script 03: dados de exemplo
--  Os mesmos dados do modo demonstração do front, para as telas mostrarem
--  exatamente o que a equipe já conhece.
--
--  Todas as contas usam a senha 123456 (hash bcrypt, custo 10).
--    admin@adotapet.com   → admin
--    ana@email.com        → adotante      carlos@email.com → adotante
--    ong@patinhas.org     → ONG Patinhas Felizes
--    ong@laranimal.org    → ONG Lar Animal
--  As datas são relativas a NOW(), então os dados sempre parecem recentes.
-- =============================================================================

USE petconnect;
SET NAMES utf8mb4;

-- ONGs (a 3ª está aguardando aprovação do admin)
INSERT INTO ong (id, nome, cnpj, email, telefone, cidade, descricao, status, criado_em) VALUES
  (1, 'Patinhas Felizes', '12.345.678/0001-90', 'contato@patinhas.org', '(62) 99999-1111', 'Goiânia - GO', 'Resgate e reabilitação de cães e gatos desde 2015.', 'aprovada', NOW() - INTERVAL 200 DAY),
  (2, 'Lar Animal', '98.765.432/0001-10', 'ola@laranimal.org', '(62) 98888-2222', 'Anápolis - GO', 'Abrigo com foco em gatos e animais idosos.', 'aprovada', NOW() - INTERVAL 150 DAY),
  (3, 'Amigos de Quatro Patas', '11.222.333/0001-44', 'amigos4patas@email.com', '(62) 97777-3333', 'Aparecida de Goiânia - GO', 'Grupo de voluntários recém-formado.', 'pendente', NOW() - INTERVAL 2 DAY);

-- Usuários (senha de todos: 123456)
INSERT INTO usuario (id, nome, email, senha_hash, perfil, telefone, cidade, ativo, ong_id, criado_em) VALUES
  (1, 'Administrador', 'admin@adotapet.com', '$2b$10$8l8Dvxy6F8DdHT.j1ZvfnOVxNtB9EK9Ou5sqQhcxRtFqoanP0b2yW', 'admin', NULL, 'Goiânia - GO', TRUE, NULL, NOW() - INTERVAL 300 DAY),
  (2, 'Ana Souza', 'ana@email.com', '$2b$10$vuk6MyzEP5wPI9NGIe74Au6iYZ0kR7hAvvGBcmVK1Guy0kCdJEvdS', 'adotante', '(62) 91234-5678', 'Goiânia - GO', TRUE, NULL, NOW() - INTERVAL 40 DAY),
  (3, 'Carlos Lima', 'carlos@email.com', '$2b$10$mKYQewjhI2joFbonTMRvmuBec8cX8LJpgUge7Jv2ckMlXhsnHKepq', 'adotante', '(62) 92345-6789', 'Goiânia - GO', TRUE, NULL, NOW() - INTERVAL 25 DAY),
  (4, 'Equipe Patinhas', 'ong@patinhas.org', '$2b$10$gP7ZGhPJWj3CXFwWzk4mJ.cPA25a7xTGc4fKXPK3Kk3ylVUSWFXY2', 'ong', '(62) 99999-1111', 'Goiânia - GO', TRUE, 1, NOW() - INTERVAL 200 DAY),
  (5, 'Equipe Lar Animal', 'ong@laranimal.org', '$2b$10$UACKWtIHJfgLWXrS3BBWk.VTpk03iWw.VFu1nWnrXOZ9jF8HrXHXO', 'ong', '(62) 98888-2222', 'Anápolis - GO', TRUE, 2, NOW() - INTERVAL 150 DAY),
  (6, 'Marina Alves', 'marina@email.com', '$2b$10$L8vh9Rul.m8fo39ojWkp3uhqkDmj2j2W28i1PihLr2uv/chYeNW82', 'adotante', '(62) 93456-7890', 'Anápolis - GO', TRUE, NULL, NOW() - INTERVAL 12 DAY),
  (7, 'Voluntários 4 Patas', 'amigos4patas@email.com', '$2b$10$K877SU.gx0kbX4Sbbp1NT.YiNfKcjqDPO.KlLVsYWc2Ej.VavMzmy', 'ong', '(62) 97777-3333', 'Aparecida de Goiânia - GO', TRUE, 3, NOW() - INTERVAL 2 DAY);

-- Animais (Bento já foi adotado; Paçoca está em processo de adoção)
INSERT INTO animal (id, ong_id, nome, especie, raca, idade_meses, sexo, porte, energia,
  convivencia_criancas, convivencia_animais, castrado, vacinado, descricao, status, criado_em) VALUES
  (1, 1, 'Thor', 'cao', 'Vira-lata', 30, 'M', 'grande', 'alta', TRUE, TRUE, TRUE, TRUE, 'Brincalhão, adora correr e buscar bolinha. Precisa de espaço e passeios diários.', 'disponivel', NOW() - INTERVAL 60 DAY),
  (2, 2, 'Luna', 'gato', 'SRD', 8, 'F', 'pequeno', 'media', TRUE, TRUE, TRUE, TRUE, 'Curiosa e carinhosa, já usa caixinha de areia.', 'disponivel', NOW() - INTERVAL 56 DAY),
  (3, 1, 'Paçoca', 'cao', 'Caramelo', 18, 'M', 'medio', 'media', TRUE, TRUE, TRUE, TRUE, 'O clássico caramelo: dócil, leal e ótimo com crianças.', 'em_processo', NOW() - INTERVAL 52 DAY),
  (4, 2, 'Mia', 'gato', 'Siamês', 48, 'F', 'pequeno', 'baixa', FALSE, TRUE, TRUE, TRUE, 'Calma e independente, prefere ambientes tranquilos sem crianças pequenas.', 'disponivel', NOW() - INTERVAL 48 DAY),
  (5, 1, 'Bento', 'cao', 'Labrador', 96, 'M', 'grande', 'baixa', TRUE, TRUE, TRUE, TRUE, 'Idoso e muito tranquilo, perfeito para quem busca um companheiro calmo.', 'adotado', NOW() - INTERVAL 44 DAY),
  (6, 1, 'Pipoca', 'cao', 'Shih-tzu', 5, 'F', 'pequeno', 'alta', TRUE, TRUE, FALSE, TRUE, 'Filhote cheia de energia, está aprendendo os comandos básicos.', 'disponivel', NOW() - INTERVAL 40 DAY),
  (7, 2, 'Frajola', 'gato', 'SRD', 36, 'M', 'medio', 'media', TRUE, FALSE, TRUE, TRUE, 'Gato de colo, mas não gosta de dividir espaço com outros animais.', 'disponivel', NOW() - INTERVAL 36 DAY),
  (8, 1, 'Nina', 'cao', 'Border Collie', 24, 'F', 'medio', 'alta', TRUE, TRUE, TRUE, TRUE, 'Muito inteligente, precisa de atividades e estímulos todos os dias.', 'disponivel', NOW() - INTERVAL 32 DAY),
  (9, 2, 'Tobias', 'cao', 'Pinscher', 60, 'M', 'pequeno', 'media', FALSE, FALSE, TRUE, TRUE, 'Protetor e apegado ao tutor; ideal para adultos sem outros pets.', 'disponivel', NOW() - INTERVAL 28 DAY),
  (10, 2, 'Amora', 'gato', 'Persa', 14, 'F', 'pequeno', 'baixa', TRUE, TRUE, TRUE, TRUE, 'Tranquila, pelagem longa que precisa de escovação frequente.', 'disponivel', NOW() - INTERVAL 24 DAY),
  (11, 1, 'Zeus', 'cao', 'Pastor Alemão', 42, 'M', 'grande', 'alta', FALSE, TRUE, TRUE, TRUE, 'Leal e ativo, recomendado para adotantes com experiência.', 'disponivel', NOW() - INTERVAL 20 DAY),
  (12, 2, 'Belinha', 'cao', 'Poodle', 110, 'F', 'pequeno', 'baixa', TRUE, TRUE, TRUE, TRUE, 'Senhorinha doce que só quer um sofá e carinho.', 'disponivel', NOW() - INTERVAL 16 DAY);

-- Fotos: arquivos SVG na pasta public/animais do front (servidos pelo Vite em /animais/...)
INSERT INTO foto_animal (animal_id, url, ordem) VALUES
  (1, '/animais/1-1.svg', 0),
  (1, '/animais/1-2.svg', 1),
  (1, '/animais/1-3.svg', 2),
  (2, '/animais/2-1.svg', 0),
  (2, '/animais/2-2.svg', 1),
  (2, '/animais/2-3.svg', 2),
  (3, '/animais/3-1.svg', 0),
  (3, '/animais/3-2.svg', 1),
  (3, '/animais/3-3.svg', 2),
  (4, '/animais/4-1.svg', 0),
  (4, '/animais/4-2.svg', 1),
  (4, '/animais/4-3.svg', 2),
  (5, '/animais/5-1.svg', 0),
  (5, '/animais/5-2.svg', 1),
  (5, '/animais/5-3.svg', 2),
  (6, '/animais/6-1.svg', 0),
  (6, '/animais/6-2.svg', 1),
  (6, '/animais/6-3.svg', 2),
  (7, '/animais/7-1.svg', 0),
  (7, '/animais/7-2.svg', 1),
  (7, '/animais/7-3.svg', 2),
  (8, '/animais/8-1.svg', 0),
  (8, '/animais/8-2.svg', 1),
  (8, '/animais/8-3.svg', 2),
  (9, '/animais/9-1.svg', 0),
  (9, '/animais/9-2.svg', 1),
  (9, '/animais/9-3.svg', 2),
  (10, '/animais/10-1.svg', 0),
  (10, '/animais/10-2.svg', 1),
  (10, '/animais/10-3.svg', 2),
  (11, '/animais/11-1.svg', 0),
  (11, '/animais/11-2.svg', 1),
  (11, '/animais/11-3.svg', 2),
  (12, '/animais/12-1.svg', 0),
  (12, '/animais/12-2.svg', 1),
  (12, '/animais/12-3.svg', 2);

-- Formulários de avaliação (Ana tem crianças em casa; Carlos mora em apartamento)
INSERT INTO formulario_avaliacao (usuario_id, tipo_moradia, tem_quintal, tela_protecao, pessoas_casa, tem_criancas,
  outros_animais, horas_sozinho, experiencia, nivel_atividade, motivacao, criado_em, atualizado_em) VALUES
  (2, 'casa', TRUE, FALSE, 3, TRUE, FALSE, 5, 'alguma', 'medio', 'Queremos um companheiro para a família e para as crianças.', NOW() - INTERVAL 20 DAY, NOW() - INTERVAL 20 DAY),
  (3, 'apartamento', FALSE, TRUE, 1, FALSE, TRUE, 9, 'muita', 'baixo', 'Moro sozinho e sempre tive gatos.', NOW() - INTERVAL 10 DAY, NOW() - INTERVAL 10 DAY);

-- Solicitações de adoção (uma em cada etapa do fluxo)
INSERT INTO solicitacao (id, animal_id, usuario_id, status, score, motivo_recusa, criado_em) VALUES
  (1, 5, 3, 'concluida', 71, NULL, NOW() - INTERVAL 30 DAY),
  (2, 3, 2, 'aprovada', 88, NULL, NOW() - INTERVAL 6 DAY),
  (3, 2, 3, 'pendente', 80, NULL, NOW() - INTERVAL 1 DAY),
  (4, 1, 2, 'em_analise', 74, NULL, NOW() - INTERVAL 3 DAY),
  (5, 4, 2, 'recusada', 38, 'A Mia não convive bem com crianças pequenas.', NOW() - INTERVAL 15 DAY);

-- Linha do tempo de cada solicitação
INSERT INTO historico_solicitacao (solicitacao_id, status, observacao, alterado_por, criado_em) VALUES
  (1, 'pendente', NULL, 3, NOW() - INTERVAL 30 DAY),
  (1, 'em_analise', NULL, 4, NOW() - INTERVAL 29 DAY),
  (1, 'aprovada', 'Visita realizada com sucesso.', 4, NOW() - INTERVAL 26 DAY),
  (1, 'concluida', 'Termo de adoção assinado.', 4, NOW() - INTERVAL 22 DAY),
  (2, 'pendente', NULL, 2, NOW() - INTERVAL 6 DAY),
  (2, 'em_analise', NULL, 4, NOW() - INTERVAL 5 DAY),
  (2, 'aprovada', 'Aguardando data para retirada.', 4, NOW() - INTERVAL 2 DAY),
  (3, 'pendente', NULL, 3, NOW() - INTERVAL 1 DAY),
  (4, 'pendente', NULL, 2, NOW() - INTERVAL 3 DAY),
  (4, 'em_analise', NULL, 4, NOW() - INTERVAL 2 DAY),
  (5, 'pendente', NULL, 2, NOW() - INTERVAL 15 DAY),
  (5, 'em_analise', NULL, 5, NOW() - INTERVAL 14 DAY),
  (5, 'recusada', 'A Mia não convive bem com crianças pequenas.', 5, NOW() - INTERVAL 13 DAY);

-- Acompanhamento pós-adoção do Bento
INSERT INTO acompanhamento (solicitacao_id, tipo, data, observacao, registrado_por) VALUES
  (1, 'visita',  NOW() - INTERVAL 15 DAY, 'Bento adaptado, dorme na sala e passeia duas vezes por dia.', 4),
  (1, 'contato', NOW() - INTERVAL 5 DAY,  'Tutor enviou fotos; vacinas em dia.', 4);

-- Favoritos da Ana (Thor e Nina)
INSERT INTO favorito (usuario_id, animal_id) VALUES (2, 1), (2, 8);

-- Notificações
INSERT INTO notificacao (usuario_id, texto, link, lida, criado_em) VALUES
  (2, 'Sua solicitação para Paçoca foi aprovada!', '/minhas-solicitacoes', FALSE, NOW() - INTERVAL 2 DAY),
  (2, 'Sua solicitação para Thor está em análise.', '/minhas-solicitacoes', TRUE, NOW() - INTERVAL 2 DAY),
  (5, 'Nova solicitação de adoção para Luna.', '/ong/solicitacoes/3', FALSE, NOW() - INTERVAL 1 DAY),
  (1, 'Nova ONG aguardando aprovação: Amigos de Quatro Patas.', '/admin/ongs', FALSE, NOW() - INTERVAL 2 DAY);

-- medicao_desempenho fica VAZIA de propósito: ela deve receber as medições reais
-- feitas pelo módulo OpenCL. Exemplo do formato que o backend deve inserir:
-- INSERT INTO medicao_desempenho (tarefa, tamanho_entrada, sequencial_ms, opencl_ms, dispositivo)
-- VALUES ('Score de compatibilidade em lote', 10000, 820.0, 46.0, 'NVIDIA GTX 1650 (OpenCL 3.0)');
