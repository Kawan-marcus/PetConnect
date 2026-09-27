import { Link } from 'react-router-dom';
import AnimalCard from '../../components/AnimalCard.jsx';
import { CabecalhoPagina } from '../../components/Layout.jsx';
import { Erro, SkeletonCards, Vazio } from '../../components/Carregando.jsx';
import Icone from '../../components/Icone.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { recomendacoes } from '../../api/ia.js';

/** RF22: animais ordenados pelo score de compatibilidade calculado pelo modelo. */
export default function Recomendados() {
  const { dados, carregando, erro, recarregar } = useAsync(() => recomendacoes(9), []);

  return (
    <div className="container pagina">
      <CabecalhoPagina
        titulo="Recomendados para você"
        subtitulo="Animais ordenados pela compatibilidade com o seu formulário de avaliação."
        acoes={<Link to="/formulario" className="btn btn--fantasma"><Icone nome="editar" tamanho={16} /> Editar formulário</Link>}
      />

      {dados?.itens?.length > 0 && (
        <div className="faixa-ia">
          <Icone nome="ia" />
          <span>
            O modelo avaliou <strong>{dados.processados}</strong> animais disponíveis em <strong>{dados.tempoMs} ms</strong>.
          </span>
          <span className="texto-suave">Modelo: {dados.modelo}</span>
        </div>
      )}

      <Erro erro={erro} onTentar={recarregar} />
      {carregando ? (
        <SkeletonCards n={6} />
      ) : dados?.semFormulario ? (
        <Vazio
          titulo="Precisamos conhecer você primeiro"
          texto="Preencha o formulário de avaliação para receber recomendações personalizadas."
          acao={<Link to="/formulario" className="btn btn--ia">Preencher formulário</Link>}
        />
      ) : dados?.itens?.length === 0 ? (
        <Vazio titulo="Nenhum animal disponível no momento" />
      ) : (
        <div className="grade-animais">
          {dados?.itens.map((i) => <AnimalCard key={i.animal.id} animal={i.animal} score={i.score} />)}
        </div>
      )}
    </div>
  );
}
