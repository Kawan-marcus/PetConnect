import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CabecalhoPagina } from '../../components/Layout.jsx';
import Carregando, { Erro, Vazio } from '../../components/Carregando.jsx';
import { AnelScore } from '../../components/ScoreCompatibilidade.jsx';
import Icone from '../../components/Icone.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { listarFavoritos, obterAnimal } from '../../api/animais.js';
import { compatibilidade, recomendacoes } from '../../api/ia.js';
import { obterFormulario } from '../../api/adocoes.js';
import { ESPECIES, PORTES, ENERGIAS, formatarIdade, nivelScore } from '../../utils/format.js';

const MAX = 3;
const simNao = (v) => (v ? 'Sim' : 'Não');

/** Lê "?ids=1,8,3" da URL: a seleção fica no endereço, então dá para voltar, recarregar ou compartilhar. */
function lerIds(params) {
  return [...new Set((params.get('ids') || '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, MAX);
}

/**
 * Comparador de compatibilidade (Módulo 3 — Sprint 06).
 * Coloca até 3 animais lado a lado com o score da IA e cada fator do modelo,
 * destacando em qual critério cada animal combina melhor com o adotante.
 */
export default function Comparar() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  // Monta a URL à mão para manter as vírgulas legíveis (?ids=1,8,3) e não poluir o histórico do navegador.
  const definirIds = (lista) => navigate(lista.length ? `/comparar?ids=${lista.join(',')}` : '/comparar', { replace: true });
  const ids = lerIds(params);
  const chave = ids.join(',');

  // Opções para escolher: favoritos + os mais compatíveis segundo a IA.
  const opcoes = useAsync(async () => {
    const [formulario, favoritos, recs] = await Promise.all([obterFormulario(), listarFavoritos().catch(() => []), recomendacoes(8).catch(() => null)]);
    const mapa = new Map();
    for (const a of favoritos) mapa.set(a.id, { animal: a, favorito: true });
    for (const i of recs?.itens || []) if (!mapa.has(i.animal.id)) mapa.set(i.animal.id, { animal: i.animal, score: i.score });
    return { formulario, lista: [...mapa.values()] };
  }, []);

  // Dados dos animais escolhidos: ficha (módulo 1) + compatibilidade calculada pelo backend (módulo 3).
  const comparacao = useAsync(async () => {
    if (!ids.length) return [];
    return Promise.all(ids.map(async (id) => {
      const [animal, compat] = await Promise.all([obterAnimal(id), compatibilidade(id)]);
      return { animal, compat };
    }));
  }, [chave]);

  const alternar = (id) => {
    const novos = ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id].slice(0, MAX);
    definirIds(novos);
  };

  if (opcoes.carregando) return <Carregando />;

  if (opcoes.dados && !opcoes.dados.formulario) {
    return (
      <div className="container pagina">
        <CabecalhoPagina titulo="Comparar compatibilidade" />
        <Vazio
          titulo="Precisamos conhecer você primeiro"
          texto="A comparação usa as respostas do seu formulário de avaliação para calcular a compatibilidade com cada animal."
          acao={<Link to="/formulario" state={{ voltarPara: `/comparar${chave ? `?ids=${chave}` : ''}` }} className="btn btn--ia">Preencher formulário</Link>}
        />
      </div>
    );
  }

  const itens = (comparacao.dados || []).filter((c) => c.compat);
  const lista = opcoes.dados?.lista || [];
  // Fatores na ordem do modelo; o melhor valor de cada linha ganha destaque.
  const fatores = itens[0]?.compat.fatores || [];
  const melhorDe = (chaveFator) => Math.max(...itens.map((c) => c.compat.fatores.find((f) => f.chave === chaveFator)?.valor ?? 0));
  const vencedor = itens.length > 1 ? [...itens].sort((a, b) => b.compat.score - a.compat.score)[0] : null;
  const empate = vencedor && itens.filter((c) => c.compat.score === vencedor.compat.score).length > 1;

  return (
    <div className="container pagina">
      <CabecalhoPagina
        titulo="Comparar compatibilidade"
        subtitulo="Coloque até 3 animais lado a lado e veja, fator por fator, com qual você combina mais."
      />
      <Erro erro={opcoes.erro || comparacao.erro} onTentar={comparacao.recarregar} />

      <section className="card seletor-comparacao" aria-labelledby="titulo-seletor">
        <div className="secao__topo">
          <h2 id="titulo-seletor">Escolha os animais <span className="texto-suave">({ids.length}/{MAX})</span></h2>
          {ids.length > 0 && <button className="btn btn--link" onClick={() => definirIds([])}>Limpar seleção</button>}
        </div>
        {lista.length === 0 ? (
          <p className="texto-suave">Favorite alguns animais ou veja seus <Link to="/recomendados">recomendados</Link> para compará-los aqui.</p>
        ) : (
          <div className="seletor-comparacao__lista">
            {lista.map(({ animal, favorito, score }) => {
              const ativo = ids.includes(animal.id);
              return (
                <button
                  key={animal.id}
                  type="button"
                  className={`opcao-animal ${ativo ? 'is-ativa' : ''}`}
                  aria-pressed={ativo}
                  disabled={!ativo && ids.length >= MAX}
                  onClick={() => alternar(animal.id)}
                >
                  <img src={animal.fotos?.[0]} alt="" />
                  <span className="opcao-animal__nome">{animal.nome}</span>
                  <span className="opcao-animal__info">
                    {favorito ? <Icone nome="coracao" tamanho={12} preenchido /> : null}
                    {score != null ? `${score}%` : ESPECIES[animal.especie]}
                  </span>
                  {ativo && <span className="opcao-animal__check"><Icone nome="check" tamanho={14} /></span>}
                </button>
              );
            })}
          </div>
        )}
        {ids.length >= MAX && <p className="campo__ajuda">Máximo de {MAX} animais. Desmarque um para trocar.</p>}
      </section>

      {comparacao.carregando ? (
        <Carregando texto="Calculando a compatibilidade de cada animal…" />
      ) : itens.length === 0 ? (
        <Vazio titulo="Nenhum animal selecionado" texto="Toque nos animais acima para montar a comparação." />
      ) : (
        <>
          {vencedor && (
            <div className="alerta alerta--ia resumo-comparacao">
              <Icone nome="ia" />
              <span>
                {empate ? (
                  <>Empate técnico: mais de um animal tem <strong>{vencedor.compat.score}%</strong> de compatibilidade. Compare os fatores abaixo.</>
                ) : (
                  <><strong>{vencedor.animal.nome}</strong> é o mais compatível com o seu perfil ({vencedor.compat.score}%). A decisão final continua sendo sua e da ONG.</>
                )}
              </span>
            </div>
          )}

          <div className="tabela-wrap">
            <table className="tabela tabela-comparacao">
              <caption className="sr-only">Comparação de compatibilidade entre os animais escolhidos</caption>
              <thead>
                <tr>
                  <th scope="col"><span className="sr-only">Critério</span></th>
                  {itens.map(({ animal, compat }) => (
                    <th key={animal.id} scope="col" className={vencedor?.animal.id === animal.id && !empate ? 'is-vencedor' : ''}>
                      <div className="comparacao-animal">
                        <img src={animal.fotos?.[0]} alt="" className="comparacao-animal__foto" />
                        <Link to={`/animais/${animal.id}`} className="comparacao-animal__nome">{animal.nome}</Link>
                        <span className="texto-suave">{animal.raca}</span>
                        <AnelScore score={compat.score} tamanho={84} />
                        <span className={`score--${nivelScore(compat.score).tom} comparacao-animal__nivel`}>{nivelScore(compat.score).rotulo}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="tabela-comparacao__grupo"><th colSpan={itens.length + 1}>Fatores do modelo de IA</th></tr>
                {fatores.map((fator) => {
                  const melhor = melhorDe(fator.chave);
                  // Só destaca quando há diferença: se todos empatam, nenhum ganha cor.
                  const valores = itens.map((c) => c.compat.fatores.find((x) => x.chave === fator.chave)?.valor ?? 0);
                  const haDiferenca = new Set(valores).size > 1;
                  return (
                    <tr key={fator.chave}>
                      <th scope="row">
                        {fator.nome}
                        <span className="texto-suave bloco">peso {Math.round(fator.peso * 100)}%</span>
                      </th>
                      {itens.map(({ animal, compat }) => {
                        const f = compat.fatores.find((x) => x.chave === fator.chave);
                        const pct = Math.round((f?.valor ?? 0) * 100);
                        const tom = pct >= 75 ? 'verde' : pct >= 45 ? 'amarelo' : 'vermelho';
                        const destaque = haDiferenca && f?.valor === melhor;
                        return (
                          <td key={animal.id} className={destaque ? 'is-melhor' : ''} title={f?.descricao}>
                            <div className="celula-fator">
                              <div className="barra" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${fator.nome}: ${animal.nome}`}>
                                <div className={`barra__valor barra--${tom}`} style={{ width: `${pct}%` }} />
                              </div>
                              <strong>{pct}%</strong>
                            </div>
                            <span className="celula-fator__desc">{f?.descricao}</span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                <tr className="tabela-comparacao__grupo"><th colSpan={itens.length + 1}>Ficha do animal</th></tr>
                {[
                  ['Espécie', (a) => ESPECIES[a.especie]],
                  ['Idade', (a) => formatarIdade(a.idadeMeses)],
                  ['Porte', (a) => PORTES[a.porte]],
                  ['Energia', (a) => ENERGIAS[a.energia]],
                  ['Convive com crianças', (a) => simNao(a.convivenciaCriancas)],
                  ['Convive com outros animais', (a) => simNao(a.convivenciaAnimais)],
                  ['Castrado / vacinado', (a) => `${simNao(a.castrado)} / ${simNao(a.vacinado)}`],
                  ['ONG', (a) => `${a.ong?.nome || '—'}${a.ong?.cidade ? ` · ${a.ong.cidade}` : ''}`],
                ].map(([rotulo, valor]) => (
                  <tr key={rotulo}>
                    <th scope="row">{rotulo}</th>
                    {itens.map(({ animal }) => <td key={animal.id}>{valor(animal)}</td>)}
                  </tr>
                ))}
                <tr>
                  <th scope="row"><span className="sr-only">Ações</span></th>
                  {itens.map(({ animal }) => (
                    <td key={animal.id}>
                      <Link to={`/animais/${animal.id}`} className="btn btn--primario btn--bloco">Ver e solicitar</Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          {itens[0]?.compat.modelo && <p className="rodape-modelo">Modelo: {itens[0].compat.modelo}</p>}
        </>
      )}
    </div>
  );
}
