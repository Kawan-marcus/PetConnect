import { Link } from 'react-router-dom';
import AnimalCard from '../../components/AnimalCard.jsx';
import { CabecalhoPagina } from '../../components/Layout.jsx';
import { Erro, SkeletonCards, Vazio } from '../../components/Carregando.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { listarFavoritos } from '../../api/animais.js';
import { useFavoritos } from '../../context/FavoritosContext.jsx';

export default function Favoritos() {
  const { dados, carregando, erro } = useAsync(listarFavoritos, []);
  const { ehFavorito } = useFavoritos();
  // Some da lista na hora quando o usuário desmarca o coração.
  const animais = dados?.filter((a) => ehFavorito(a.id));

  return (
    <div className="container pagina">
      <CabecalhoPagina titulo="Meus favoritos" subtitulo="Os animais que você salvou para ver depois." />
      <Erro erro={erro} />
      {carregando ? (
        <SkeletonCards n={3} />
      ) : animais?.length ? (
        <div className="grade-animais">{animais.map((a) => <AnimalCard key={a.id} animal={a} />)}</div>
      ) : (
        <Vazio
          titulo="Nenhum favorito ainda"
          texto="Toque no coração de um animal para salvá-lo aqui."
          acao={<Link to="/animais" className="btn btn--primario">Ver animais</Link>}
        />
      )}
    </div>
  );
}
