import { useState } from 'react';
import { Link } from 'react-router-dom';
import AnimalCard from '../../components/AnimalCard.jsx';
import { CabecalhoPagina } from '../../components/Layout.jsx';
import { Erro, SkeletonCards, Vazio } from '../../components/Carregando.jsx';
import Icone from '../../components/Icone.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { recomendacoes } from '../../api/ia.js';

const ESPECIE = [['', 'Todos'], ['cao', 'Cães'], ['gato', 'Gatos']];
const PORTE = [['', 'Qualquer porte'], ['pequeno', 'Pequeno'], ['medio', 'Médio'], ['grande', 'Grande']];
const MINIMOS = [[0, 'Qualquer índice'], [50, 'A partir de 50%'], [75, 'A partir de 75%']];

/** Explica a recomendação: os fatores mais fortes e o principal ponto de atenção. */
function MotivoRecomendacao({ fatores = [] }) {
  const fortes = fatores.filter((f) => f.valor >= 0.75).sort((a, b) => b.peso - a.peso).slice(0, 2);
  const atencao = fatores.filter((f) => f.valor < 0.45).sort((a, b) => a.valor - b.valor)[0];
  if (!fortes.length && !atencao) return null;
  return (
    <div className="motivo-ia">
      {fortes.length > 0 && (
        <p className="motivo-ia__bom"><Icone nome="check" tamanho={14} /> Combina: {fortes.map((f) => f.nome.split(' ×')[0].toLowerCase()).join(', ')}</p>
      )}
      {atencao && (
        <p className="motivo-ia__atencao"><Icone nome="alerta" tamanho={14} /> Atenção: {atencao.nome.toLowerCase()}</p>
      )}
    </div>
  );
}

const tempo = (ms) => (ms == null ? null : ms < 1 ? 'menos de 1 ms' : `${ms.toLocaleString('pt-BR')} ms`);

/** RF22: animais ordenados pelo score de compatibilidade calculado pelo modelo. */
export default function Recomendados() {
  // Busca o ranking completo uma vez; os filtros abaixo só recortam o resultado, sem nova chamada à API.
  const { dados, carregando, erro, recarregar } = useAsync(() => recomendacoes(50), []);
  const [especie, setEspecie] = useState('');
  const [porte, setPorte] = useState('');
  const [minimo, setMinimo] = useState(0);

  const todos = dados?.itens || [];
  const itens = todos.filter((i) => (!especie || i.animal.especie === especie) && (!porte || i.animal.porte === porte) && i.score >= minimo);
  const filtrando = especie || porte || minimo;
  const top = itens.slice(0, 3).map((i) => i.animal.id).join(',');

  return (
    <div className="container pagina">
      <CabecalhoPagina
        titulo="Recomendados para você"
        subtitulo="Animais ordenados pela compatibilidade com o seu formulário de avaliação."
        acoes={
          <>
            {itens.length > 1 && (
              <Link to={`/comparar?ids=${top}`} className="btn btn--fantasma"><Icone nome="comparar" tamanho={16} /> Comparar os 3 primeiros</Link>
            )}
            <Link to="/formulario" state={{ voltarPara: '/recomendados' }} className="btn btn--fantasma"><Icone nome="editar" tamanho={16} /> Editar formulário</Link>
          </>
        }
      />

      {todos.length > 0 && (
        <div className="faixa-ia">
          <Icone nome="ia" />
          <span>
            O modelo avaliou <strong>{dados.processados}</strong> animais disponíveis
            {tempo(dados.tempoMs) && <> em <strong>{tempo(dados.tempoMs)}</strong></>}.
          </span>
          <span className="texto-suave">Modelo: {dados.modelo}</span>
        </div>
      )}

      {todos.length > 0 && (
        <div className="filtros-rapidos" role="group" aria-label="Filtrar recomendações">
          <div className="pilulas">
            {ESPECIE.map(([v, r]) => (
              <button key={v || 'todos'} type="button" className={`pilula ${especie === v ? 'is-ativa' : ''}`} aria-pressed={especie === v} onClick={() => setEspecie(v)}>{r}</button>
            ))}
          </div>
          <select value={porte} onChange={(e) => setPorte(e.target.value)} aria-label="Porte">
            {PORTE.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </select>
          <select value={minimo} onChange={(e) => setMinimo(Number(e.target.value))} aria-label="Compatibilidade mínima">
            {MINIMOS.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </select>
          <span className="texto-suave filtros-rapidos__total" aria-live="polite">{itens.length} de {todos.length} animais</span>
        </div>
      )}

      <Erro erro={erro} onTentar={recarregar} />
      {carregando ? (
        <SkeletonCards n={6} />
      ) : dados?.semFormulario ? (
        <Vazio
          titulo="Precisamos conhecer você primeiro"
          texto="Preencha o formulário de avaliação para receber recomendações personalizadas."
          acao={<Link to="/formulario" state={{ voltarPara: '/recomendados' }} className="btn btn--ia">Preencher formulário</Link>}
        />
      ) : todos.length === 0 && !erro ? (
        <Vazio titulo="Nenhum animal disponível no momento" texto="Assim que as ONGs publicarem novos animais, eles aparecem aqui." />
      ) : itens.length === 0 && filtrando ? (
        <Vazio
          titulo="Nenhum animal com esses filtros"
          texto="Tente outro porte ou diminua a compatibilidade mínima."
          acao={<button className="btn btn--fantasma" onClick={() => { setEspecie(''); setPorte(''); setMinimo(0); }}>Limpar filtros</button>}
        />
      ) : (
        <div className="grade-animais">
          {itens.map((i) => (
            <AnimalCard key={i.animal.id} animal={i.animal} score={i.score} extra={<MotivoRecomendacao fatores={i.fatores} />} />
          ))}
        </div>
      )}
    </div>
  );
}
