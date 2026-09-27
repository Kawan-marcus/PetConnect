import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CabecalhoPagina } from '../../components/Layout.jsx';
import Campo, { OpcoesPilula, SimNao } from '../../components/Campo.jsx';
import Carregando, { Erro } from '../../components/Carregando.jsx';
import Icone from '../../components/Icone.jsx';
import { useFormulario } from '../../hooks/useFormulario.js';
import { obterFormulario, salvarFormulario } from '../../api/adocoes.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatarData } from '../../utils/format.js';

const VAZIO = {
  tipoMoradia: '', temQuintal: null, telaProtecao: null, pessoasCasa: '', temCriancas: null, outrosAnimais: null,
  horasSozinho: '', experiencia: '', nivelAtividade: '', motivacao: '',
};

const obrig = (v) => v === '' || v === null || v === undefined;

function validar(v) {
  return {
    tipoMoradia: obrig(v.tipoMoradia) && 'Selecione o tipo de moradia.',
    temQuintal: obrig(v.temQuintal) && 'Responda esta pergunta.',
    telaProtecao: obrig(v.telaProtecao) && 'Responda esta pergunta.',
    pessoasCasa: (obrig(v.pessoasCasa) || v.pessoasCasa < 1) && 'Informe quantas pessoas moram na casa.',
    temCriancas: obrig(v.temCriancas) && 'Responda esta pergunta.',
    outrosAnimais: obrig(v.outrosAnimais) && 'Responda esta pergunta.',
    horasSozinho: (obrig(v.horasSozinho) || v.horasSozinho < 0 || v.horasSozinho > 24) && 'Informe um valor entre 0 e 24.',
    experiencia: obrig(v.experiencia) && 'Selecione sua experiência.',
    nivelAtividade: obrig(v.nivelAtividade) && 'Selecione seu ritmo.',
    motivacao: (!v.motivacao || v.motivacao.trim().length < 20) && 'Escreva pelo menos 20 caracteres.',
  };
}

/** Formulário de avaliação (RF11). Os dados alimentam o modelo de compatibilidade. */
export default function FormularioAvaliacao() {
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [carregando, setCarregando] = useState(true);
  const [atualizadoEm, setAtualizadoEm] = useState(null);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const f = useFormulario(VAZIO, validar);

  useEffect(() => {
    obterFormulario()
      .then((dados) => {
        if (dados) {
          const { usuarioId, atualizadoEm: em, ...resto } = dados;
          f.setValores({ ...VAZIO, ...resto });
          setAtualizadoEm(em);
        }
      })
      .catch(setErro)
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const salvar = async (v) => {
    setErro(null);
    setEnviando(true);
    try {
      await salvarFormulario(v);
      toast('Formulário salvo! Sua compatibilidade foi atualizada.');
      navigate(location.state?.voltarPara || '/recomendados');
    } catch (e) {
      setErro(e);
    } finally {
      setEnviando(false);
    }
  };

  if (carregando) return <Carregando />;
  const { valores: v, erros, set } = f;

  return (
    <div className="container pagina pagina--estreita">
      <CabecalhoPagina
        titulo="Formulário de avaliação"
        subtitulo={atualizadoEm ? `Última atualização em ${formatarData(atualizadoEm)}.` : 'Preencha uma vez e use em todas as solicitações.'}
      />

      <div className="alerta alerta--ia">
        <Icone nome="ia" />
        <span>Estas respostas são usadas pelo modelo de IA para calcular sua compatibilidade com cada animal. Seja sincero: a ideia é encontrar o par certo.</span>
      </div>

      <form className="form" onSubmit={f.enviar(salvar)} noValidate>
        <Erro erro={erro} />

        <section className="card form__secao">
          <h2>Sua casa</h2>
          <OpcoesPilula
            nome="tipoMoradia" rotulo="Tipo de moradia" valor={v.tipoMoradia} onChange={(x) => set('tipoMoradia', x)}
            opcoes={[{ valor: 'casa', rotulo: 'Casa' }, { valor: 'apartamento', rotulo: 'Apartamento' }]}
          />
          {erros.tipoMoradia && <span className="campo__erro">{erros.tipoMoradia}</span>}
          <div className="grade-2">
            <div>
              <SimNao nome="temQuintal" rotulo="Tem quintal ou área externa?" valor={v.temQuintal} onChange={(x) => set('temQuintal', x)} />
              {erros.temQuintal && <span className="campo__erro">{erros.temQuintal}</span>}
            </div>
            <div>
              <SimNao nome="telaProtecao" rotulo="Janelas e sacadas têm tela de proteção?" valor={v.telaProtecao} onChange={(x) => set('telaProtecao', x)} />
              {erros.telaProtecao && <span className="campo__erro">{erros.telaProtecao}</span>}
            </div>
          </div>
        </section>

        <section className="card form__secao">
          <h2>Quem mora com você</h2>
          <Campo rotulo="Quantas pessoas moram na casa (incluindo você)?" erro={erros.pessoasCasa}>
            <input type="number" min={1} max={20} {...f.campo('pessoasCasa', 'number')} />
          </Campo>
          <div className="grade-2">
            <div>
              <SimNao nome="temCriancas" rotulo="Há crianças na casa?" valor={v.temCriancas} onChange={(x) => set('temCriancas', x)} />
              {erros.temCriancas && <span className="campo__erro">{erros.temCriancas}</span>}
            </div>
            <div>
              <SimNao nome="outrosAnimais" rotulo="Já tem outros animais?" valor={v.outrosAnimais} onChange={(x) => set('outrosAnimais', x)} />
              {erros.outrosAnimais && <span className="campo__erro">{erros.outrosAnimais}</span>}
            </div>
          </div>
        </section>

        <section className="card form__secao">
          <h2>Sua rotina</h2>
          <Campo rotulo="Quantas horas por dia o animal ficaria sozinho?" erro={erros.horasSozinho}>
            <input type="number" min={0} max={24} {...f.campo('horasSozinho', 'number')} />
          </Campo>
          <OpcoesPilula
            nome="nivelAtividade" rotulo="Como é o seu ritmo?" valor={v.nivelAtividade} onChange={(x) => set('nivelAtividade', x)}
            opcoes={[
              { valor: 'baixo', rotulo: 'Tranquilo, mais caseiro' },
              { valor: 'medio', rotulo: 'Moderado, passeios leves' },
              { valor: 'alto', rotulo: 'Ativo, corridas e trilhas' },
            ]}
          />
          {erros.nivelAtividade && <span className="campo__erro">{erros.nivelAtividade}</span>}
          <OpcoesPilula
            nome="experiencia" rotulo="Experiência com animais" valor={v.experiencia} onChange={(x) => set('experiencia', x)}
            opcoes={[
              { valor: 'nenhuma', rotulo: 'Primeira vez' },
              { valor: 'alguma', rotulo: 'Já tive um animal' },
              { valor: 'muita', rotulo: 'Tenho bastante experiência' },
            ]}
          />
          {erros.experiencia && <span className="campo__erro">{erros.experiencia}</span>}
        </section>

        <section className="card form__secao">
          <h2>Motivação</h2>
          <Campo rotulo="Por que você quer adotar?" erro={erros.motivacao} ajuda={`${(v.motivacao || '').length} caracteres`}>
            <textarea rows={4} {...f.campo('motivacao')} />
          </Campo>
        </section>

        <div className="form__acoes">
          <button type="button" className="btn btn--fantasma" onClick={() => navigate(-1)}>Cancelar</button>
          <button className="btn btn--primario btn--grande" disabled={enviando}>{enviando ? 'Salvando…' : 'Salvar formulário'}</button>
        </div>
      </form>
    </div>
  );
}
