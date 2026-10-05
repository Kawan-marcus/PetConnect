import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CabecalhoPagina } from '../../components/Layout.jsx';
import Carregando, { Erro } from '../../components/Carregando.jsx';
import { StatusBadge } from '../../components/Badge.jsx';
import ScoreCompatibilidade from '../../components/ScoreCompatibilidade.jsx';
import TimelineStatus from '../../components/TimelineStatus.jsx';
import Modal from '../../components/Modal.jsx';
import Icone from '../../components/Icone.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import {
  obterSolicitacao,
  iniciarAnalise,
  aprovarSolicitacao,
  recusarSolicitacao,
  concluirAdocao,
} from '../../api/adocoes.js';
import { useToast } from '../../context/ToastContext.jsx';
import {
  formatarData,
  formatarIdade,
  PORTES,
} from '../../utils/format.js';

const ROTULOS_FORM = {
  tipoMoradia: [
    'Moradia',
    (v) => (v === 'casa' ? 'Casa' : 'Apartamento'),
  ],

  temQuintal: [
    'Quintal / área externa',
    (v) => (v ? 'Sim' : 'Não'),
  ],

  telaProtecao: [
    'Telas de proteção',
    (v) => (v ? 'Sim' : 'Não'),
  ],

  pessoasCasa: [
    'Pessoas na casa',
    (v) => v,
  ],

  temCriancas: [
    'Crianças',
    (v) => (v ? 'Sim' : 'Não'),
  ],

  outrosAnimais: [
    'Outros animais',
    (v) => (v ? 'Sim' : 'Não'),
  ],

  horasSozinho: [
    'Horas sozinho por dia',
    (v) => `${v} h`,
  ],

  nivelAtividade: [
    'Ritmo',
    (v) =>
      ({
        baixo: 'Tranquilo',
        medio: 'Moderado',
        alto: 'Ativo',
      })[v],
  ],

  experiencia: [
    'Experiência',
    (v) =>
      ({
        nenhuma: 'Primeira vez',
        alguma: 'Já teve animal',
        muita: 'Muita',
      })[v],
  ],
};


/**
 * RF12, RF13, RF21:
 * análise da solicitação com o apoio da IA.
 */
export default function OngSolicitacaoDetalhe() {
  const { id } = useParams();

  const toast = useToast();

  const {
    dados: s,
    carregando,
    erro,
    setDados,
  } = useAsync(
    () => obterSolicitacao(id),
    [id]
  );

  const [acao, setAcao] = useState(null);

  // 'aprovar'
  // 'recusar'
  // 'concluir'

  const [texto, setTexto] = useState('');

  const [enviando, setEnviando] = useState(false);

  const [erroAcao, setErroAcao] = useState(null);


  // =========================================================
  // EXECUTAR AÇÃO
  // =========================================================
  //
  // IMPORTANTE:
  //
  // Antes, o retorno de /aprovar, /recusar ou /concluir
  // era colocado diretamente em "s".
  //
  // Esses endpoints não retornam todos os dados da tela
  // (usuario, animal completo, formulario etc.).
  //
  // Agora:
  //
  // 1. executamos a ação
  // 2. buscamos novamente a solicitação completa
  // 3. atualizamos a tela
  //
  // Isso evita o erro:
  //
  // Cannot read properties of undefined (reading 'nome')
  //
  // =========================================================

  const executar = async (fn, msg) => {
    setErroAcao(null);
    setEnviando(true);

    try {
      // Executa aprovação, recusa, análise ou conclusão
      await fn();

      // Busca novamente todos os dados da solicitação
      const solicitacaoAtualizada =
        await obterSolicitacao(id);

      // Atualiza a página somente com o objeto completo
      setDados(solicitacaoAtualizada);

      toast(msg);

      setAcao(null);

      setTexto('');
    } catch (e) {
      setErroAcao(e);

      if (!acao) {
        toast(e.message, 'erro');
      }
    } finally {
      setEnviando(false);
    }
  };


  // =========================================================
  // CARREGAMENTO
  // =========================================================

  if (carregando) {
    return <Carregando />;
  }


  // =========================================================
  // ERRO
  // =========================================================

  if (erro) {
    return (
      <div className="container pagina">
        <Erro erro={erro} />
      </div>
    );
  }


  // Proteção adicional caso a API não retorne dados
  if (!s) {
    return (
      <div className="container pagina">
        <Erro
          erro={
            new Error(
              'Não foi possível carregar a solicitação.'
            )
          }
        />
      </div>
    );
  }


  // =========================================================
  // STATUS
  // =========================================================

  const aberta = [
    'pendente',
    'em_analise',
  ].includes(s.status);


  // =========================================================
  // CONFIGURAÇÃO DOS MODAIS
  // =========================================================

  const configModal = {
    aprovar: {
      titulo: 'Aprovar solicitação',

      rotulo:
        'Observação para o adotante (opcional)',

      botao: 'Aprovar',

      fn: () =>
        aprovarSolicitacao(
          s.id,
          texto
        ),

      msg:
        'Solicitação aprovada.',
    },


    recusar: {
      titulo: 'Recusar solicitação',

      rotulo:
        'Motivo da recusa (o adotante verá esta mensagem)',

      botao: 'Recusar',

      fn: () =>
        recusarSolicitacao(
          s.id,
          texto
        ),

      msg:
        'Solicitação recusada.',
    },


    concluir: {
      titulo: 'Concluir adoção',

      rotulo:
        'Observações da entrega (opcional)',

      botao:
        'Concluir adoção',

      fn: () =>
        concluirAdocao(
          s.id,
          texto
        ),

      msg:
        `Adoção de ${s.animal?.nome || 'animal'} concluída!`,
    },
  }[acao];


  // =========================================================
  // TELA
  // =========================================================

  return (
    <div className="container pagina">

      <CabecalhoPagina
        voltar="/ong/solicitacoes"

        titulo={`${s.usuario?.nome || 'Adotante'} → ${
          s.animal?.nome || 'Animal'
        }`}

        subtitulo={
          `Solicitação #${s.id} · recebida em ${
            formatarData(
              s.criadoEm,
              true
            )
          }`
        }

        acoes={
          <StatusBadge
            tipo="solicitacao"
            status={s.status}
          />
        }
      />


      {/* ===================================================
          ALERTA DE SOLICITAÇÕES CONCORRENTES
      =================================================== */}

      {aberta && s.concorrentes > 0 && s.animal && (
        <div className="alerta alerta--aviso">

          <Icone nome="alerta" />

          <span>
            Há outras{' '}
            <strong>
              {s.concorrentes}
            </strong>{' '}
            solicitações abertas para{' '}
            {s.animal.nome}.

            {' '}

            Ao aprovar esta, as demais serão
            encerradas automaticamente (RN02).
          </span>

        </div>
      )}


      <div className="detalhe">

        {/* =================================================
            CONTEÚDO PRINCIPAL
        ================================================= */}

        <div className="detalhe__principal">

          <ScoreCompatibilidade
            resultado={s.compatibilidade}
          />


          <section className="card">

            <h2>
              Formulário de avaliação
            </h2>


            {s.formulario ? (
              <>

                <dl className="lista-def">

                  {Object.entries(
                    ROTULOS_FORM
                  ).map(
                    ([k, [rotulo, fmt]]) => (

                      <div key={k}>

                        <dt>
                          {rotulo}
                        </dt>

                        <dd>
                          {fmt(
                            s.formulario[k]
                          )}
                        </dd>

                      </div>

                    )
                  )}

                </dl>


                <h3 className="subtitulo">
                  Motivação
                </h3>


                <blockquote className="citacao">
                  {s.formulario.motivacao}
                </blockquote>

              </>
            ) : (

              <p className="texto-suave">
                O adotante não preencheu o formulário.
              </p>

            )}


            {s.mensagem && (
              <>

                <h3 className="subtitulo">
                  Mensagem enviada com a solicitação
                </h3>


                <blockquote className="citacao">
                  {s.mensagem}
                </blockquote>

              </>
            )}

          </section>

        </div>


        {/* =================================================
            LATERAL
        ================================================= */}

        <aside className="detalhe__lateral">


          {/* =================================================
              AÇÕES
          ================================================= */}

          <section className="card">

            <h2>
              Ações
            </h2>


            {s.status === 'pendente' && (

              <button
                className="btn btn--fantasma btn--bloco"

                disabled={enviando}

                onClick={() =>
                  executar(
                    () =>
                      iniciarAnalise(
                        s.id
                      ),

                    'Solicitação em análise.'
                  )
                }
              >

                <Icone
                  nome="relogio"
                  tamanho={16}
                />

                {' '}

                Marcar como em análise

              </button>

            )}


            {aberta && (

              <div className="pilha">

                <button
                  className="btn btn--sucesso btn--bloco"

                  disabled={enviando}

                  onClick={() =>
                    setAcao(
                      'aprovar'
                    )
                  }
                >

                  <Icone
                    nome="check"
                    tamanho={16}
                  />

                  {' '}

                  Aprovar

                </button>


                <button
                  className="btn btn--perigo-suave btn--bloco"

                  disabled={enviando}

                  onClick={() =>
                    setAcao(
                      'recusar'
                    )
                  }
                >

                  <Icone
                    nome="x"
                    tamanho={16}
                  />

                  {' '}

                  Recusar

                </button>

              </div>

            )}


            {s.status === 'aprovada' && (

              <>

                <p className="texto-suave">

                  Após a entrega do animal e a assinatura
                  do termo, conclua a adoção.

                  {' '}

                  O animal passará para “Adotado”.

                </p>


                <button
                  className="btn btn--primario btn--bloco"

                  disabled={enviando}

                  onClick={() =>
                    setAcao(
                      'concluir'
                    )
                  }
                >

                  Concluir adoção

                </button>

              </>

            )}


            {s.status === 'concluida' && (

              <Link
                to="/ong/acompanhamentos"

                className="btn btn--fantasma btn--bloco"
              >

                Registrar acompanhamento

              </Link>

            )}


            {[
              'recusada',
              'encerrada',
              'cancelada',
            ].includes(s.status) && (

              <p className="texto-suave">
                Esta solicitação está finalizada.
              </p>

            )}

          </section>


          {/* =================================================
              ANDAMENTO
          ================================================= */}

          <section className="card">

            <h2>
              Andamento
            </h2>

            <TimelineStatus
              historico={s.historico || []}
              status={s.status}
            />

          </section>


          {/* =================================================
              ADOTANTE
          ================================================= */}

          {s.usuario && (

            <section className="card">

              <h2>
                Adotante
              </h2>


              <p>
                <strong>
                  {s.usuario.nome}
                </strong>
              </p>


              <p className="texto-suave">
                {s.usuario.email}
              </p>


              <p className="texto-suave">

                {s.usuario.telefone}

                {s.usuario.telefone &&
                  s.usuario.cidade &&
                  ' · '}

                {s.usuario.cidade}

              </p>

            </section>

          )}


          {/* =================================================
              ANIMAL
          ================================================= */}

          {s.animal && (

            <section className="card">

              <h2>
                Animal
              </h2>


              <Link
                to={`/animais/${s.animal.id}`}

                className="celula-animal"
              >

                {s.animal.fotos?.[0] && (

                  <img
                    src={s.animal.fotos[0]}
                    alt=""
                    className="miniatura"
                  />

                )}


                <div>

                  <strong>
                    {s.animal.nome}
                  </strong>


                  <span className="texto-suave bloco">

                    {s.animal.raca}

                    {' · '}

                    {PORTES[s.animal.porte]}

                    {' · '}

                    {formatarIdade(
                      s.animal.idadeMeses
                    )}

                  </span>

                </div>

              </Link>

            </section>

          )}

        </aside>

      </div>


      {/* =====================================================
          MODAL
      ===================================================== */}

      <Modal
        aberto={Boolean(acao)}

        titulo={configModal?.titulo}

        onFechar={() => {
          setAcao(null);
          setErroAcao(null);
        }}

        rodape={
          <>

            <button
              className="btn btn--fantasma"

              disabled={enviando}

              onClick={() =>
                setAcao(null)
              }
            >

              Cancelar

            </button>


            <button
              className={
                `btn ${
                  acao === 'recusar'
                    ? 'btn--perigo'
                    : 'btn--primario'
                }`
              }

              disabled={
                enviando ||
                !configModal ||
                (
                  acao === 'recusar' &&
                  !texto.trim()
                )
              }

              onClick={() => {
                if (configModal) {
                  executar(
                    configModal.fn,
                    configModal.msg
                  );
                }
              }}
            >

              {enviando
                ? 'Salvando…'
                : configModal?.botao}

            </button>

          </>
        }
      >

        <Erro erro={erroAcao} />


        {acao === 'aprovar' && s.animal && (

          <p>

            {s.animal.nome} passará para{' '}

            <strong>
              “Em processo de adoção”
            </strong>

            {' '}e o adotante será notificado.

          </p>

        )}


        <div className="campo">

          <label htmlFor="texto-acao">
            {configModal?.rotulo}
          </label>


          <textarea
            id="texto-acao"
            rows={3}
            value={texto}

            onChange={(e) =>
              setTexto(
                e.target.value
              )
            }
          />

        </div>

      </Modal>

    </div>
  );
}