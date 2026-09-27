import { Link } from 'react-router-dom';
import AnimalCard from '../../components/AnimalCard.jsx';
import Icone from '../../components/Icone.jsx';
import { SkeletonCards } from '../../components/Carregando.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { listarAnimais } from '../../api/animais.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { ilustracaoAnimal } from '../../utils/placeholder.js';

export default function Home() {
  const { usuario } = useAuth();
  const { dados: animais, carregando } = useAsync(() => listarAnimais({ status: 'disponivel' }), []);

  return (
    <>
      <section className="hero">
        <div className="container hero__conteudo">
          <div className="hero__texto">
            <p className="eyebrow">Adoção responsável</p>
            <h1>Encontre o companheiro que combina com a sua vida.</h1>
            <p className="hero__sub">
              Conectamos animais resgatados por ONGs a adotantes compatíveis. Nossa IA analisa sua rotina e sua casa para indicar os
              animais com mais chance de uma adoção feliz — para você e para eles.
            </p>
            <div className="hero__acoes">
              <Link to="/animais" className="btn btn--primario btn--grande">
                Quero adotar <Icone nome="seta" tamanho={18} />
              </Link>
              {!usuario && (
                <Link to="/cadastro?tipo=ong" className="btn btn--fantasma btn--grande">
                  Sou uma ONG
                </Link>
              )}
            </div>
          </div>
          <div className="hero__arte" aria-hidden="true">
            <img src={ilustracaoAnimal('cao', 3, 0)} alt="" className="hero__img hero__img--1" />
            <img src={ilustracaoAnimal('gato', 2, 2)} alt="" className="hero__img hero__img--2" />
            <div className="hero__selo">
              <Icone nome="ia" tamanho={16} /> 92% compatível
            </div>
          </div>
        </div>
      </section>

      <section className="container secao">
        <div className="secao__topo">
          <div>
            <h2>Esperando por um lar</h2>
            <p className="texto-suave">Animais cadastrados recentemente pelas ONGs parceiras.</p>
          </div>
          <Link to="/animais" className="btn btn--link">
            Ver todos <Icone nome="seta" tamanho={16} />
          </Link>
        </div>
        {carregando ? <SkeletonCards n={4} /> : (
          <div className="grade-animais">
            {animais?.slice(0, 4).map((a) => <AnimalCard key={a.id} animal={a} />)}
          </div>
        )}
      </section>

      <section className="secao secao--destaque">
        <div className="container">
          <h2 className="centro">Como a inteligência artificial ajuda</h2>
          <div className="grade-3">
            <div className="card-info">
              <span className="card-info__icone"><Icone nome="formulario" /></span>
              <h3>Você conta sobre sua rotina</h3>
              <p>Moradia, tempo livre, crianças, outros pets e experiência. Um formulário só, usado em todas as solicitações.</p>
            </div>
            <div className="card-info">
              <span className="card-info__icone"><Icone nome="ia" /></span>
              <h3>O modelo calcula a compatibilidade</h3>
              <p>Cruzamos seu perfil com porte, energia e temperamento de cada animal, em lote e em paralelo com OpenCL.</p>
            </div>
            <div className="card-info">
              <span className="card-info__icone"><Icone nome="check" /></span>
              <h3>A ONG decide com mais informação</h3>
              <p>A ONG vê o índice e os fatores que o explicam. A IA apoia a decisão — quem aprova é sempre uma pessoa.</p>
            </div>
          </div>
        </div>
      </section>

      {!usuario && (
        <section className="container secao">
          <div className="cta">
            <div>
              <h2>Você é uma ONG ou protetor independente?</h2>
              <p>Cadastre sua instituição, publique os animais e receba solicitações já com a análise de compatibilidade.</p>
            </div>
            <Link to="/cadastro?tipo=ong" className="btn btn--claro btn--grande">Cadastrar ONG</Link>
          </div>
        </section>
      )}
    </>
  );
}
