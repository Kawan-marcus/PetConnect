import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CabecalhoPagina } from '../../components/Layout.jsx';
import Carregando, { Erro, Vazio } from '../../components/Carregando.jsx';
import { StatusBadge } from '../../components/Badge.jsx';
import Badge from '../../components/Badge.jsx';
import Icone from '../../components/Icone.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useAtalhoBusca, useAtrasado } from '../../hooks/useTabela.js';
import { dadosAdmin } from '../../api/relatorios.js';
import { contem } from '../../utils/relatorios.js';
import { ESPECIES, PERFIS, formatarData } from '../../utils/format.js';

const GRUPOS = [
  { id: 'animais', titulo: 'Animais', icone: 'coracao' },
  { id: 'pessoas', titulo: 'Pessoas', icone: 'usuario' },
  { id: 'ongs', titulo: 'ONGs', icone: 'predio' },
  { id: 'solicitacoes', titulo: 'Solicitações', icone: 'formulario' },
];

/**
 * Pesquisa geral do administrador (Sprint 07): um termo procurado em animais, pessoas, ONGs
 * e solicitações ao mesmo tempo. Não diferencia maiúsculas nem acentos; aceita o nº da solicitação.
 * Equivale à procedure sp_pesquisar do banco.
 */
export default function AdminPesquisa() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const termo = useAtrasado(q.trim(), 200);
  const ref = useAtalhoBusca();
  const { dados, carregando, erro, recarregar } = useAsync(dadosAdmin, []);

  const resultados = useMemo(() => {
    if (!dados || termo.length < 2 && !/^\d+$/.test(termo)) return null;
    return {
      animais: dados.animais.filter((a) => contem(`${a.nome} ${a.raca} ${a.ong?.nome}`, termo)).slice(0, 30),
      pessoas: dados.usuarios.filter((u) => contem(`${u.nome} ${u.email} ${u.cidade || ''}`, termo)).slice(0, 30),
      ongs: dados.ongs.filter((o) => contem(`${o.nome} ${o.cidade} ${o.cnpj} ${o.email}`, termo)).slice(0, 30),
      solicitacoes: dados.solicitacoes.filter((s) => String(s.id) === termo || contem(`${s.animal?.nome} ${s.adotanteNome} ${s.ongNome}`, termo)).slice(0, 30),
    };
  }, [dados, termo]);

  const total = resultados ? Object.values(resultados).reduce((n, l) => n + l.length, 0) : 0;

  return (
    <div className="container pagina pagina--media">
      <CabecalhoPagina titulo="Pesquisar" subtitulo="Encontre animais, pessoas, ONGs e solicitações em um só lugar." />
      <div className="input-icone input-icone--grande">
        <Icone nome="busca" tamanho={20} />
        <input
          ref={ref}
          autoFocus
          type="search"
          value={q}
          onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })}
          placeholder="Ex.: Thor, Ana Souza, Patinhas, 12…"
          aria-label="Pesquisar em toda a plataforma"
        />
        <kbd className="atalho" title="Atalho: tecle / para pesquisar">/</kbd>
      </div>
      <Erro erro={erro} onTentar={recarregar} />
      {carregando && !dados ? <Carregando /> : !resultados ? (
        <p className="texto-suave centro pesquisa__dica">Digite pelo menos 2 letras (ou o número de uma solicitação). Não precisa de acento nem de maiúscula.</p>
      ) : total === 0 ? (
        <Vazio titulo={`Nada encontrado para “${termo}”`} texto="Confira a grafia ou tente uma parte do nome." />
      ) : (
        <>
          <p className="texto-suave" aria-live="polite">{total} {total === 1 ? 'resultado' : 'resultados'} para “{termo}”</p>
          {GRUPOS.filter((g) => resultados[g.id].length).map((g) => (
            <section key={g.id} className="card pesquisa__grupo">
              <h2><Icone nome={g.icone} tamanho={18} /> {g.titulo} <span className="aba__contador">{resultados[g.id].length}</span></h2>
              <ul className="lista-simples">
                {g.id === 'animais' && resultados.animais.map((a) => (
                  <li key={a.id}>
                    <Link to={`/animais/${a.id}`} className="linha-link">
                      <img src={a.fotos?.[0]} alt="" className="miniatura" />
                      <div className="linha-link__info"><strong>{a.nome}</strong><span className="texto-suave">{ESPECIES[a.especie]} · {a.raca} · {a.ong?.nome}</span></div>
                      <StatusBadge tipo="animal" status={a.status} />
                    </Link>
                  </li>
                ))}
                {g.id === 'pessoas' && resultados.pessoas.map((u) => (
                  <li key={u.id}>
                    <Link to={`/admin/usuarios?busca=${encodeURIComponent(u.email)}`} className="linha-link">
                      <div className="linha-link__info"><strong>{u.nome}</strong><span className="texto-suave">{u.email} · desde {formatarData(u.criadoEm)}</span></div>
                      <Badge tom={u.ativo ? 'cinza' : 'vermelho'}>{u.ativo ? PERFIS[u.perfil] : 'Desativado'}</Badge>
                    </Link>
                  </li>
                ))}
                {g.id === 'ongs' && resultados.ongs.map((o) => (
                  <li key={o.id}>
                    <Link to="/admin/ongs" className="linha-link">
                      <div className="linha-link__info"><strong>{o.nome}</strong><span className="texto-suave">{o.cidade} · CNPJ {o.cnpj}</span></div>
                      <StatusBadge tipo="ong" status={o.status} />
                    </Link>
                  </li>
                ))}
                {g.id === 'solicitacoes' && resultados.solicitacoes.map((s) => (
                  <li key={s.id}>
                    <Link to={`/admin/historico?busca=${s.id}`} className="linha-link">
                      <div className="linha-link__info"><strong>#{s.id} · {s.animal?.nome}</strong><span className="texto-suave">{s.adotanteNome} · {s.ongNome} · {formatarData(s.criadoEm)}</span></div>
                      <StatusBadge tipo="solicitacao" status={s.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
