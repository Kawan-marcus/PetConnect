-- =============================================================================
--  PetConnect — Plataforma de Adoção de Animais
--  Script 01: criação do banco e das tabelas
--  Requer MySQL 8.0.16+ (ou MariaDB 10.5+), por causa das restrições CHECK.
--
--  Ordem de execução: 01_schema.sql → 02_views.sql → 03_seed.sql
--  ATENÇÃO: este script APAGA o banco "petconnect" se ele já existir.
-- =============================================================================

DROP DATABASE IF EXISTS petconnect;
CREATE DATABASE petconnect
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;   -- aceita acentos e emojis; buscas ignoram maiúsculas/acentos
                                -- (funciona no MySQL 8 e no MariaDB do XAMPP)

USE petconnect;

-- -----------------------------------------------------------------------------
-- ONG: instituição que cadastra os animais.
-- Nasce "pendente" e só publica animais depois de aprovada pelo admin (RN04).
-- -----------------------------------------------------------------------------
CREATE TABLE ong (
  id             INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  nome           VARCHAR(120)    NOT NULL,
  cnpj           CHAR(18)        NOT NULL COMMENT 'Formato 00.000.000/0000-00',
  email          VARCHAR(160)    NOT NULL,
  telefone       VARCHAR(20)     NOT NULL,
  cidade         VARCHAR(100)    NOT NULL,
  descricao      TEXT            NULL,
  status         ENUM('pendente','aprovada','suspensa') NOT NULL DEFAULT 'pendente',
  criado_em      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ong_cnpj (cnpj),
  KEY ix_ong_status (status)
) ENGINE=InnoDB COMMENT='ONGs e protetores cadastrados';

-- -----------------------------------------------------------------------------
-- USUARIO: toda pessoa que faz login. O perfil define as permissões.
-- Usuários do perfil "ong" pertencem a uma ONG (ong_id obrigatório);
-- adotantes e administradores não têm ONG.
-- -----------------------------------------------------------------------------
CREATE TABLE usuario (
  id             INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  nome           VARCHAR(120)    NOT NULL,
  email          VARCHAR(160)    NOT NULL,
  senha_hash     CHAR(60)        NOT NULL COMMENT 'bcrypt — nunca guardar a senha em texto',
  perfil         ENUM('adotante','ong','admin') NOT NULL DEFAULT 'adotante',
  telefone       VARCHAR(20)     NULL,
  cidade         VARCHAR(100)    NULL,
  ativo          BOOLEAN         NOT NULL DEFAULT TRUE COMMENT 'Admin desativa em vez de apagar',
  ong_id         INT UNSIGNED    NULL,
  criado_em      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuario_email (email),
  KEY ix_usuario_perfil (perfil),
  CONSTRAINT fk_usuario_ong FOREIGN KEY (ong_id) REFERENCES ong (id),
  CONSTRAINT ck_usuario_perfil_ong CHECK (
    (perfil = 'ong' AND ong_id IS NOT NULL) OR (perfil <> 'ong' AND ong_id IS NULL)
  )
) ENGINE=InnoDB COMMENT='Usuários do sistema (adotante, ONG, admin)';

-- -----------------------------------------------------------------------------
-- TOKEN_RECUPERACAO_SENHA: link "esqueci minha senha".
-- Guarda só o hash do token enviado por e-mail.
-- -----------------------------------------------------------------------------
CREATE TABLE token_recuperacao_senha (
  id             INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  usuario_id     INT UNSIGNED    NOT NULL,
  token_hash     CHAR(64)        NOT NULL COMMENT 'SHA-256 do token',
  expira_em      DATETIME        NOT NULL,
  usado_em       DATETIME        NULL,
  criado_em      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_token_hash (token_hash),
  CONSTRAINT fk_token_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- ANIMAL: entidade principal (CRUD da Sprint 3).
-- Exclusão lógica: "excluido_em" preenchido = removido da plataforma.
-- Assim o histórico de solicitações e adoções (RF16) não se perde.
-- -----------------------------------------------------------------------------
CREATE TABLE animal (
  id                    INT UNSIGNED       NOT NULL AUTO_INCREMENT,
  ong_id                INT UNSIGNED       NOT NULL,
  nome                  VARCHAR(80)        NOT NULL,
  especie               ENUM('cao','gato') NOT NULL,
  raca                  VARCHAR(80)        NOT NULL DEFAULT 'SRD',
  idade_meses           SMALLINT UNSIGNED  NOT NULL,
  sexo                  ENUM('M','F')      NOT NULL,
  porte                 ENUM('pequeno','medio','grande') NOT NULL,
  energia               ENUM('baixa','media','alta')     NOT NULL,
  convivencia_criancas  BOOLEAN            NOT NULL,
  convivencia_animais   BOOLEAN            NOT NULL,
  castrado              BOOLEAN            NOT NULL,
  vacinado              BOOLEAN            NOT NULL,
  descricao             TEXT               NOT NULL,
  status                ENUM('disponivel','em_processo','adotado') NOT NULL DEFAULT 'disponivel',
  criado_em             DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em         DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  excluido_em           DATETIME           NULL COMMENT 'Exclusão lógica',
  PRIMARY KEY (id),
  KEY ix_animal_ong (ong_id),
  KEY ix_animal_busca (status, especie, porte),
  FULLTEXT KEY ft_animal_texto (nome, raca, descricao),
  CONSTRAINT fk_animal_ong FOREIGN KEY (ong_id) REFERENCES ong (id),
  CONSTRAINT ck_animal_idade CHECK (idade_meses BETWEEN 1 AND 360)
) ENGINE=InnoDB COMMENT='Animais disponíveis para adoção';

-- -----------------------------------------------------------------------------
-- FOTO_ANIMAL: várias fotos por animal (RF05). Ordem 0 = capa.
-- O arquivo fica no servidor/armazenamento; o banco guarda só o endereço.
-- -----------------------------------------------------------------------------
CREATE TABLE foto_animal (
  id             INT UNSIGNED       NOT NULL AUTO_INCREMENT,
  animal_id      INT UNSIGNED       NOT NULL,
  url            VARCHAR(500)       NOT NULL,
  ordem          TINYINT UNSIGNED   NOT NULL DEFAULT 0,
  criado_em      DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_foto_ordem (animal_id, ordem),
  CONSTRAINT fk_foto_animal FOREIGN KEY (animal_id) REFERENCES animal (id) ON DELETE CASCADE,
  CONSTRAINT ck_foto_ordem CHECK (ordem < 6)
) ENGINE=InnoDB COMMENT='Fotos dos animais (até 6 por animal)';

-- -----------------------------------------------------------------------------
-- FAVORITO: animais salvos pelo adotante (RF09). Relação N:N usuario × animal.
-- -----------------------------------------------------------------------------
CREATE TABLE favorito (
  usuario_id     INT UNSIGNED    NOT NULL,
  animal_id      INT UNSIGNED    NOT NULL,
  criado_em      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id, animal_id),
  KEY ix_favorito_animal (animal_id),
  CONSTRAINT fk_favorito_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id) ON DELETE CASCADE,
  CONSTRAINT fk_favorito_animal  FOREIGN KEY (animal_id)  REFERENCES animal (id)  ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- FORMULARIO_AVALIACAO: um por adotante (RF11). Relação 1:1 com usuario.
-- Estas colunas são as variáveis de entrada do modelo de compatibilidade.
-- -----------------------------------------------------------------------------
CREATE TABLE formulario_avaliacao (
  usuario_id       INT UNSIGNED      NOT NULL,
  tipo_moradia     ENUM('casa','apartamento')        NOT NULL,
  tem_quintal      BOOLEAN           NOT NULL,
  tela_protecao    BOOLEAN           NOT NULL,
  pessoas_casa     TINYINT UNSIGNED  NOT NULL,
  tem_criancas     BOOLEAN           NOT NULL,
  outros_animais   BOOLEAN           NOT NULL,
  horas_sozinho    TINYINT UNSIGNED  NOT NULL,
  experiencia      ENUM('nenhuma','alguma','muita')  NOT NULL,
  nivel_atividade  ENUM('baixo','medio','alto')      NOT NULL,
  motivacao        TEXT              NOT NULL,
  criado_em        DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em    DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id),
  CONSTRAINT fk_formulario_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id) ON DELETE CASCADE,
  CONSTRAINT ck_formulario_pessoas CHECK (pessoas_casa BETWEEN 1 AND 20),
  CONSTRAINT ck_formulario_horas   CHECK (horas_sozinho BETWEEN 0 AND 24),
  CONSTRAINT ck_formulario_motivo  CHECK (CHAR_LENGTH(motivacao) >= 20)
) ENGINE=InnoDB COMMENT='Formulário de avaliação do adotante';

-- -----------------------------------------------------------------------------
-- SOLICITACAO: pedido de adoção (RF10–RF14).
-- Máquina de estados: pendente → em_analise → aprovada → concluida
--                     (ou recusada / cancelada / encerrada)
-- A ONG da solicitação é a ONG do animal (obtida por JOIN, sem duplicar).
--
-- Regras garantidas pelo próprio banco, via colunas geradas + UNIQUE:
--   RN05: um usuário só pode ter UMA solicitação ativa por animal.
--   RN02: um animal só pode ter UMA solicitação aprovada/concluída.
-- (No MySQL, valores NULL não conflitam em UNIQUE; por isso as colunas
--  geradas valem 1 só nos status que precisam ser únicos.)
-- -----------------------------------------------------------------------------
CREATE TABLE solicitacao (
  id             INT UNSIGNED       NOT NULL AUTO_INCREMENT,
  animal_id      INT UNSIGNED       NOT NULL,
  usuario_id     INT UNSIGNED       NOT NULL,
  status         ENUM('pendente','em_analise','aprovada','recusada','concluida','encerrada','cancelada')
                                    NOT NULL DEFAULT 'pendente',
  score          TINYINT UNSIGNED   NULL COMMENT 'Compatibilidade (0–100) no momento do envio',
  mensagem       TEXT               NULL COMMENT 'Mensagem opcional do adotante',
  motivo_recusa  TEXT               NULL,
  criado_em      DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em  DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  ativa          TINYINT GENERATED ALWAYS AS
                   (IF(status IN ('pendente','em_analise','aprovada'), 1, NULL)) STORED,
  vencedora      TINYINT GENERATED ALWAYS AS
                   (IF(status IN ('aprovada','concluida'), 1, NULL)) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_solicitacao_ativa_rn05 (usuario_id, animal_id, ativa),
  UNIQUE KEY uq_solicitacao_vencedora_rn02 (animal_id, vencedora),
  KEY ix_solicitacao_status (status),
  CONSTRAINT fk_solicitacao_animal  FOREIGN KEY (animal_id)  REFERENCES animal (id),
  CONSTRAINT fk_solicitacao_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id),
  CONSTRAINT ck_solicitacao_score CHECK (score IS NULL OR score <= 100),
  CONSTRAINT ck_solicitacao_recusa CHECK (status <> 'recusada' OR motivo_recusa IS NOT NULL)
) ENGINE=InnoDB COMMENT='Solicitações de adoção';

-- -----------------------------------------------------------------------------
-- HISTORICO_SOLICITACAO: cada mudança de status (linha do tempo da tela).
-- -----------------------------------------------------------------------------
CREATE TABLE historico_solicitacao (
  id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  solicitacao_id  INT UNSIGNED    NOT NULL,
  status          ENUM('pendente','em_analise','aprovada','recusada','concluida','encerrada','cancelada') NOT NULL,
  observacao      TEXT            NULL,
  alterado_por    INT UNSIGNED    NULL COMMENT 'Quem fez a mudança; NULL = automático (RN02)',
  criado_em       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_historico_solicitacao (solicitacao_id, criado_em),
  CONSTRAINT fk_historico_solicitacao FOREIGN KEY (solicitacao_id) REFERENCES solicitacao (id) ON DELETE CASCADE,
  CONSTRAINT fk_historico_usuario     FOREIGN KEY (alterado_por)   REFERENCES usuario (id) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Linha do tempo das solicitações';

-- -----------------------------------------------------------------------------
-- ACOMPANHAMENTO: registros pós-adoção feitos pela ONG.
-- -----------------------------------------------------------------------------
CREATE TABLE acompanhamento (
  id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  solicitacao_id  INT UNSIGNED    NOT NULL COMMENT 'Solicitação concluída (adoção)',
  tipo            ENUM('visita','contato','foto') NOT NULL,
  data            DATETIME        NOT NULL,
  observacao      TEXT            NOT NULL,
  registrado_por  INT UNSIGNED    NULL,
  criado_em       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_acompanhamento_solicitacao (solicitacao_id, data),
  CONSTRAINT fk_acompanhamento_solicitacao FOREIGN KEY (solicitacao_id) REFERENCES solicitacao (id) ON DELETE CASCADE,
  CONSTRAINT fk_acompanhamento_usuario     FOREIGN KEY (registrado_por) REFERENCES usuario (id) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Acompanhamento pós-adoção';

-- -----------------------------------------------------------------------------
-- NOTIFICACAO: avisos do sino no topo da tela.
-- -----------------------------------------------------------------------------
CREATE TABLE notificacao (
  id             INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  usuario_id     INT UNSIGNED    NOT NULL,
  texto          VARCHAR(255)    NOT NULL,
  link           VARCHAR(255)    NULL COMMENT 'Rota do front, ex.: /minhas-solicitacoes',
  lida           BOOLEAN         NOT NULL DEFAULT FALSE,
  criado_em      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_notificacao_usuario (usuario_id, lida, criado_em),
  CONSTRAINT fk_notificacao_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================================================
--  Tabelas do componente de IA / processamento (Tópicos Avançados)
--  Guardam entradas e resultados dos modelos para auditoria, cache e métricas.
-- =============================================================================

-- Cada cálculo de compatibilidade feito pelo modelo (RF20–RF22).
CREATE TABLE analise_compatibilidade (
  id             BIGINT UNSIGNED    NOT NULL AUTO_INCREMENT,
  usuario_id     INT UNSIGNED       NOT NULL,
  animal_id      INT UNSIGNED       NOT NULL,
  score          TINYINT UNSIGNED   NOT NULL,
  fatores        JSON               NOT NULL COMMENT '[{chave, nome, peso, valor, descricao}]',
  modelo         VARCHAR(40)        NOT NULL COMMENT 'Versão do modelo, ex.: compat-v1',
  tempo_ms       DECIMAL(10,3)      NULL,
  calculado_em   DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_analise_par (usuario_id, animal_id, calculado_em),
  CONSTRAINT fk_analise_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id) ON DELETE CASCADE,
  CONSTRAINT fk_analise_animal  FOREIGN KEY (animal_id)  REFERENCES animal (id)  ON DELETE CASCADE,
  CONSTRAINT ck_analise_score CHECK (score <= 100)
) ENGINE=InnoDB COMMENT='Resultados do modelo de compatibilidade';

-- Sugestões do modelo de visão computacional ao enviar a foto (RF23).
CREATE TABLE classificacao_imagem (
  id                 BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  ong_id             INT UNSIGNED     NOT NULL,
  foto_url           VARCHAR(500)     NOT NULL,
  especie_sugerida   ENUM('cao','gato')                NOT NULL,
  especie_confianca  DECIMAL(4,3)     NOT NULL,
  raca_sugerida      VARCHAR(80)      NOT NULL,
  raca_confianca     DECIMAL(4,3)     NOT NULL,
  raca_alternativas  JSON             NULL,
  porte_sugerido     ENUM('pequeno','medio','grande') NOT NULL,
  porte_confianca    DECIMAL(4,3)     NOT NULL,
  aceita             BOOLEAN          NULL COMMENT 'A ONG aplicou a sugestão? NULL = não informado',
  modelo             VARCHAR(40)      NOT NULL,
  tempo_ms           DECIMAL(10,3)    NULL,
  criado_em          DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_classificacao_ong (ong_id),
  CONSTRAINT fk_classificacao_ong FOREIGN KEY (ong_id) REFERENCES ong (id)
) ENGINE=InnoDB COMMENT='Sugestões de espécie/raça/porte a partir da foto';

-- Medições sequencial × OpenCL exibidas no dashboard do admin.
CREATE TABLE medicao_desempenho (
  id               INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  tarefa           VARCHAR(160)     NOT NULL,
  tamanho_entrada  INT UNSIGNED     NOT NULL COMMENT 'Ex.: número de animais ou fotos processados',
  sequencial_ms    DECIMAL(12,3)    NOT NULL,
  opencl_ms        DECIMAL(12,3)    NOT NULL,
  dispositivo      VARCHAR(160)     NOT NULL,
  medido_em        DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_medicao_tarefa (tarefa, medido_em),
  CONSTRAINT ck_medicao_tempos CHECK (sequencial_ms > 0 AND opencl_ms > 0)
) ENGINE=InnoDB COMMENT='Benchmarks do processamento paralelo';
