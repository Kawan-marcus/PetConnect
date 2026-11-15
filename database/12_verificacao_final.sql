-- =============================================================================
--  PetConnect — Script 12: verificação final do banco (Sprint 10)
--
--  Confere a estrutura e a CONSISTÊNCIA dos dados com as regras de negócio.
--  Não altera nada. Cada verificação mostra quantos registros estão errados:
--  o esperado é 0 em todas (coluna "situacao" = OK).
--  Rode depois de todos os scripts (01 a 10).
-- =============================================================================

USE petconnect;

-- 1) Estrutura final
SELECT 'Tabelas'     AS objeto, COUNT(*) AS quantidade FROM information_schema.tables
 WHERE table_schema = 'petconnect' AND table_type = 'BASE TABLE'
UNION ALL SELECT 'Views', COUNT(*) FROM information_schema.views WHERE table_schema = 'petconnect'
UNION ALL SELECT 'Chaves estrangeiras', COUNT(*) FROM information_schema.referential_constraints WHERE constraint_schema = 'petconnect'
UNION ALL SELECT 'Triggers', COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'petconnect'
UNION ALL SELECT 'Procedures e funções', COUNT(*) FROM information_schema.routines WHERE routine_schema = 'petconnect';

-- 2) Consistência dos dados com as regras de negócio (esperado: 0 em todas)
SELECT verificacao, problemas, IF(problemas = 0, 'OK', 'VERIFICAR') AS situacao FROM (
  SELECT 'RN02: animal com mais de um pedido vencedor (aprovada/concluída)' AS verificacao,
         (SELECT COUNT(*) FROM (SELECT animal_id FROM solicitacao WHERE status IN ('aprovada', 'concluida')
                                GROUP BY animal_id HAVING COUNT(*) > 1) x) AS problemas
  UNION ALL
  SELECT 'RN06: animal "adotado" sem adoção concluída',
         (SELECT COUNT(*) FROM animal a WHERE a.status = 'adotado'
             AND NOT EXISTS (SELECT 1 FROM solicitacao s WHERE s.animal_id = a.id AND s.status = 'concluida'))
  UNION ALL
  SELECT 'RN06: adoção concluída com animal que não está "adotado"',
         (SELECT COUNT(*) FROM solicitacao s JOIN animal a ON a.id = s.animal_id
           WHERE s.status = 'concluida' AND a.status <> 'adotado')
  UNION ALL
  SELECT 'RN06: animal "em processo" sem pedido aprovado',
         (SELECT COUNT(*) FROM animal a WHERE a.status = 'em_processo'
             AND NOT EXISTS (SELECT 1 FROM solicitacao s WHERE s.animal_id = a.id AND s.status = 'aprovada'))
  UNION ALL
  SELECT 'RN02: pedido aberto em animal que já tem vencedor',
         (SELECT COUNT(*) FROM solicitacao s WHERE s.status IN ('pendente', 'em_analise')
             AND EXISTS (SELECT 1 FROM solicitacao v WHERE v.animal_id = s.animal_id AND v.status IN ('aprovada', 'concluida')))
  UNION ALL
  SELECT 'RN08: pedido em aberto de animal excluído',
         (SELECT COUNT(*) FROM solicitacao s JOIN animal a ON a.id = s.animal_id
           WHERE a.excluido_em IS NOT NULL AND s.status IN ('pendente', 'em_analise', 'aprovada'))
  UNION ALL
  SELECT 'RN07: recusa sem motivo',
         (SELECT COUNT(*) FROM solicitacao WHERE status = 'recusada' AND (motivo_recusa IS NULL OR TRIM(motivo_recusa) = ''))
  UNION ALL
  SELECT 'Histórico: solicitação sem nenhuma etapa registrada',
         (SELECT COUNT(*) FROM solicitacao s WHERE NOT EXISTS (SELECT 1 FROM historico_solicitacao h WHERE h.solicitacao_id = s.id))
  UNION ALL
  SELECT 'RN03: solicitação de adotante sem formulário',
         (SELECT COUNT(*) FROM solicitacao s WHERE NOT EXISTS (SELECT 1 FROM formulario_avaliacao f WHERE f.usuario_id = s.usuario_id))
  UNION ALL
  SELECT 'Perfis: conta de ONG sem ONG ligada',
         (SELECT COUNT(*) FROM usuario WHERE perfil = 'ong' AND ong_id IS NULL)
  UNION ALL
  SELECT 'Perfis: adotante ou admin ligado a uma ONG',
         (SELECT COUNT(*) FROM usuario WHERE perfil <> 'ong' AND ong_id IS NOT NULL)
  UNION ALL
  SELECT 'RN04: animal de ONG não aprovada aparecendo no catálogo',
         (SELECT COUNT(*) FROM vw_animal_publico v JOIN animal a ON a.id = v.id JOIN ong o ON o.id = a.ong_id WHERE o.status <> 'aprovada')
  UNION ALL
  SELECT 'Acompanhamento de adoção que não foi concluída',
         (SELECT COUNT(*) FROM acompanhamento ac JOIN solicitacao s ON s.id = ac.solicitacao_id WHERE s.status <> 'concluida')
  UNION ALL
  SELECT 'Animal sem foto',
         (SELECT COUNT(*) FROM animal a WHERE a.excluido_em IS NULL
             AND NOT EXISTS (SELECT 1 FROM foto_animal f WHERE f.animal_id = a.id))
) verificacoes;

-- 3) Volume de dados por tabela (para o documento)
SELECT 'usuario' AS tabela, COUNT(*) AS registros FROM usuario
UNION ALL SELECT 'ong', COUNT(*) FROM ong
UNION ALL SELECT 'animal', COUNT(*) FROM animal
UNION ALL SELECT 'foto_animal', COUNT(*) FROM foto_animal
UNION ALL SELECT 'formulario_avaliacao', COUNT(*) FROM formulario_avaliacao
UNION ALL SELECT 'solicitacao', COUNT(*) FROM solicitacao
UNION ALL SELECT 'historico_solicitacao', COUNT(*) FROM historico_solicitacao
UNION ALL SELECT 'acompanhamento', COUNT(*) FROM acompanhamento
UNION ALL SELECT 'favorito', COUNT(*) FROM favorito
UNION ALL SELECT 'notificacao', COUNT(*) FROM notificacao
UNION ALL SELECT 'log_acao', COUNT(*) FROM log_acao;
