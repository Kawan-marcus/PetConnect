import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AnimalCard from '../../components/AnimalCard.jsx';
import Icone from '../../components/Icone.jsx';
import { CabecalhoPagina } from '../../components/Layout.jsx';
import { Erro, SkeletonCards, Vazio } from '../../components/Carregando.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { listarAnimais } from '../../api/animais.js';
import { useAuth } from '../../context/AuthContext.jsx';

const FILTROS = [
  { nome: 'especie', rotulo: 'Espécie', opcoes: [['cao', 'Cão'], ['gato', 'Gato']] },
  { nome: 'porte', rotulo: 'Porte', opcoes: [['pequeno', 'Pequeno'], ['medio', 'Médio'], ['grande', 'Grande']] },
  { nome: 'idade', rotulo: 'Idade', opcoes: [['filhote', 'Filhote (até 1 ano)'], ['adulto', 'Adulto'], ['idoso', 'Idoso (8+ anos)']] },
  { nome: 'sexo', rotulo: 'Sexo', opcoes: [['M', 'Macho'], ['F', 'Fêmea']] },
];

export default function Animais() {
  const { usuario } = useAuth();
  const [params, setParams] = useSearchParams();
  const [busca, setBusca] = useState(params.get('busca') || '');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  // Os filtros ficam na URL: dá para compartilhar o link e voltar com o botão do navegador.
  const filtros = useMemo(() => Object.fromEntries([...params.entries()].filter(([, v]) => v)), [params]);
  const chave = JSON.stringify(filtros);
  const { dados: animais, carregando, erro, recarregar } = useAsync(() => listarAnimais(filtros), [chave]);

  // Busca por texto com "debounce" (espera o usuário parar de digitar).
  useEffect(() => {
    const t = setTimeout(() => atualizar('busca', busca.trim()), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  function atualizar(nome, valor) {
    const novo = new URLSearchParams(params);
    if (valor) novo.set(nome, valor);
    else novo.delete(nome);
    if (novo.toString() !== params.toString()) setParams(novo, { replace: true });
  }

  const ativos = FILTROS.filter((f) => filtros[f.nome]).length;

  return (
    <div className="container pagina">
      <CabecalhoPagina
        titulo="Animais para adoção"
        subtitulo={animais ? `${animais.length} ${animais.length === 1 ? 'animal encontrado' : 'animais encontrados'}` : ' '}
        acoes={
          usuario?.perfil === 'adotante' && (
            <Link to="/recomendados" className="btn btn--ia">
              <Icone nome="ia" tamanho={18} /> Recomendados para mim
            </Link>
          )
        }
      />

      <div className="listagem">
        <aside className={`filtros ${filtrosAbertos ? 'is-aberto' : ''}`} aria-label="Filtros">
          <div className="filtros__topo">
            <h2>Filtros</h2>
            {ativos > 0 && (
              <button className="btn btn--link" onClick={() => { setBusca(''); setParams({}, { replace: true }); }}>
                Limpar
              </button>
            )}
          </div>
          {FILTROS.map((f) => (
            <fieldset key={f.nome} className="filtro">
              <legend>{f.rotulo}</legend>
              <div className="pilulas">
                {f.opcoes.map(([valor, rotulo]) => (
                  <button
                    key={valor}
                    type="button"
                    className={`pilula ${filtros[f.nome] === valor ? 'is-ativa' : ''}`}
                    aria-pressed={filtros[f.nome] === valor}
                    onClick={() => atualizar(f.nome, filtros[f.nome] === valor ? '' : valor)}
                  >
                    {rotulo}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
        </aside>

        <section>
          <div className="barra-busca">
            <div className="input-icone">
              <Icone nome="busca" tamanho={18} />
              <input
                type="search"
                placeholder="Buscar por nome, raça ou característica…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                aria-label="Buscar animais"
              />
            </div>
            <select value={filtros.ordenar || 'recentes'} onChange={(e) => atualizar('ordenar', e.target.value === 'recentes' ? '' : e.target.value)} aria-label="Ordenar">
              <option value="recentes">Mais recentes</option>
              <option value="nome">Nome (A–Z)</option>
              <option value="idade">Mais novos</option>
            </select>
            <button className="btn btn--fantasma mostrar-mobile" onClick={() => setFiltrosAbertos((a) => !a)}>
              <Icone nome="filtro" tamanho={16} /> Filtros{ativos ? ` (${ativos})` : ''}
            </button>
          </div>

          <Erro erro={erro} onTentar={recarregar} />
          {carregando && !animais ? (
            <SkeletonCards />
          ) : animais?.length === 0 ? (
            <Vazio titulo="Nenhum animal encontrado" texto="Tente remover alguns filtros ou mudar a busca." />
          ) : (
            <div className={`grade-animais ${carregando ? 'is-atualizando' : ''}`}>
              {animais?.map((a) => <AnimalCard key={a.id} animal={a} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
