import { createContext, useContext, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { montarTrilha, mostraTrilha } from '../routes/mapaRotas.js';

/**
 * Trilha de navegação (breadcrumb) + título da aba do navegador.
 * Sprint 06: o usuário sempre sabe onde está e consegue voltar um nível com um clique.
 */
const TrilhaContext = createContext({ definirRotulo: () => {} });

/** Contador de navegações dentro do app: diz se "Voltar" pode usar o histórico. */
let navegacoesNoApp = 0;
let ultimoCaminho = null;
export const podeVoltarNoHistorico = () => navegacoesNoApp > 1;

export function TrilhaProvider({ children }) {
  const location = useLocation();
  const { usuario } = useAuth();
  const [rotulo, setRotulo] = useState({ caminho: null, texto: null, semTrilha: false });

  useEffect(() => {
    // Compara com o último caminho para não contar duas vezes (o StrictMode roda o efeito em dobro).
    if (ultimoCaminho !== location.pathname) {
      ultimoCaminho = location.pathname;
      navegacoesNoApp += 1;
    }
  }, [location.pathname]);

  // Rótulo dinâmico (nome do animal etc.) só vale para a página que o definiu.
  const daPagina = rotulo.caminho === location.pathname;
  const rotuloAtual = daPagina ? rotulo.texto : null;
  const semTrilha = daPagina && rotulo.semTrilha;
  const itens = montarTrilha(location.pathname, usuario, rotuloAtual);

  useEffect(() => {
    const atual = itens.at(-1)?.rotulo;
    document.title = atual && location.pathname !== '/' ? `${atual} · PetConnect` : 'PetConnect · Adoção responsável';
  }, [itens.at(-1)?.rotulo, location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const valor = {
    itens,
    semTrilha,
    definirRotulo: (texto, opcoes = {}) => setRotulo({ caminho: location.pathname, texto, semTrilha: !!opcoes.semTrilha }),
  };
  return <TrilhaContext.Provider value={valor}>{children}</TrilhaContext.Provider>;
}

/** Uma página usa para trocar o rótulo genérico por um nome (ex.: "Detalhes do animal" → "Thor"). */
export function useRotuloPagina(texto, opcoes) {
  const { definirRotulo } = useContext(TrilhaContext);
  useEffect(() => {
    if (texto) definirRotulo(texto, opcoes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);
}

export default function Trilha() {
  const { itens, semTrilha } = useContext(TrilhaContext);
  const { pathname } = useLocation();
  if (semTrilha || !mostraTrilha(pathname) || itens.length < 2) return null;

  return (
    <nav className="trilha container" aria-label="Você está em">
      <ol>
        {itens.map((item, i) => {
          const ultimo = i === itens.length - 1;
          return (
            <li key={item.caminho}>
              {ultimo ? (
                <span aria-current="page">{item.rotulo}</span>
              ) : (
                <Link to={item.caminho}>{item.rotulo}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
