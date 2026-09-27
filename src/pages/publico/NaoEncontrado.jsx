import { Link } from 'react-router-dom';
import { Vazio } from '../../components/Carregando.jsx';

export default function NaoEncontrado() {
  return (
    <div className="container pagina">
      <Vazio
        titulo="Página não encontrada"
        texto="Parece que esse caminho fugiu pelo portão."
        acao={<Link to="/" className="btn btn--primario">Voltar ao início</Link>}
      />
    </div>
  );
}
