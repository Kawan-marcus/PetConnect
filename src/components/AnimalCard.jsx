import { Link, useNavigate } from 'react-router-dom';
import Icone from './Icone.jsx';
import { StatusBadge } from './Badge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useFavoritos } from '../context/FavoritosContext.jsx';
import { ESPECIES, PORTES, SEXOS, formatarIdade, nivelScore } from '../utils/format.js';

export function BotaoFavorito({ animalId, grande = false }) {
  const { usuario } = useAuth();
  const { ehFavorito, alternar } = useFavoritos();
  const navigate = useNavigate();
  if (usuario && usuario.perfil !== 'adotante') return null;
  const ativo = ehFavorito(animalId);

  return (
    <button
      type="button"
      className={`btn-favorito ${ativo ? 'is-ativo' : ''} ${grande ? 'btn-favorito--grande' : ''}`}
      aria-pressed={ativo}
      aria-label={ativo ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      onClick={(e) => {
        e.preventDefault();
        if (!usuario) return navigate('/login', { state: { de: `/animais/${animalId}` } });
        alternar(animalId);
      }}
    >
      <Icone nome="coracao" preenchido={ativo} tamanho={grande ? 22 : 18} />
    </button>
  );
}

export default function AnimalCard({ animal, score }) {
  const nivel = score != null ? nivelScore(score) : null;
  return (
    <Link to={`/animais/${animal.id}`} className="card-animal">
      <div className="card-animal__foto">
        <img src={animal.fotos?.[0]} alt={`Foto de ${animal.nome}`} loading="lazy" />
        <BotaoFavorito animalId={animal.id} />
        {animal.status !== 'disponivel' && (
          <span className="card-animal__status">
            <StatusBadge tipo="animal" status={animal.status} />
          </span>
        )}
        {score != null && (
          <span className={`card-animal__score score--${nivel.tom}`} title={nivel.rotulo}>
            <Icone nome="ia" tamanho={14} /> {score}% compatível
          </span>
        )}
      </div>
      <div className="card-animal__info">
        <div className="card-animal__linha">
          <h3>{animal.nome}</h3>
          <span className="texto-suave">{SEXOS[animal.sexo]}</span>
        </div>
        <p className="texto-suave">
          {animal.raca} · {formatarIdade(animal.idadeMeses)}
        </p>
        <div className="tags">
          <span className="tag">{ESPECIES[animal.especie]}</span>
          <span className="tag">Porte {PORTES[animal.porte].toLowerCase()}</span>
        </div>
        {animal.ong && <p className="card-animal__ong">{animal.ong.nome} · {animal.ong.cidade}</p>}
      </div>
    </Link>
  );
}
