-- =============================================================================
--  PetConnect — Script 06: massa de dados para o teste de desempenho (OpenCL)
--  Executar depois do 05_sprint06_modulo3.sql.
--
--  Cria animais e adotantes fictícios para o módulo de processamento medir o
--  cálculo de compatibilidade em lote (sequencial × OpenCL).
--  Os animais ficam numa ONG "pendente" e por isso NÃO aparecem no site.
--  Cada execução ACRESCENTA mais dados. Para começar do zero, rode antes:
--      CALL sp_limpar_massa_dados();
-- =============================================================================

USE petconnect;

-- Ajuste os números conforme o teste: (animais, adotantes)
-- 10.000 animais × 200 adotantes leva poucos segundos no MySQL.
CALL sp_gerar_massa_dados(10000, 200);

-- Conferência
SELECT COUNT(*) AS animais_para_o_processamento  FROM vw_features_animal;
SELECT COUNT(*) AS animais_visiveis_no_site       FROM vw_animal_publico;   -- não muda: a massa é invisível
SELECT COUNT(*) AS adotantes_para_o_processamento FROM vw_features_adotante;

-- Distribuição sorteada (para conferir que os dados estão variados)
SELECT gato, porte_cod, energia_cod, COUNT(*) AS quantidade
FROM vw_features_animal
GROUP BY gato, porte_cod, energia_cod
ORDER BY gato, porte_cod, energia_cod;

-- Para apagar toda a massa de dados depois dos testes:
-- CALL sp_limpar_massa_dados();
