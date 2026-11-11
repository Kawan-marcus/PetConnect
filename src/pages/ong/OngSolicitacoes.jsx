import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CabecalhoPagina } from '../../components/Layout.jsx';
import Carregando, { Erro, Vazio } from '../../components/Carregando.jsx';
import { StatusBadge } from '../../components/Badge.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { solicitacoesDaOng } from '../../api/adocoes.js';
import { formatarData, nivelScore } from '../../utils/format.js';
import Icone from '../../components/Icone.jsx';
import { useAtalhoBusca, useAtrasado } from '../../hooks/useTabela.js';
import { contem } from '../../utils/relatorios.js';

const ABAS = [
  ['abertas', 'Abertas'],
  ['aprovada', 'Aprovadas'],
  ['concluida', 'Concluídas'],
  ['fechadas', 'Recusadas / encerradas'],
  ['', 'Todas'],
];

const FILTRO = {
  abertas: (s) => ['pendente', 'em_analise'].includes(s.status),
  fechadas: (s) => ['recusada', 'encerrada', 'cancelada'].includes(s.status),
};

/** RF12 + RF16: solicitações recebidas pela ONG. */
export default function OngSolicitacoes() {
  const [aba, setAba] = useState('abertas');
  const [ordem, setOrdem] = useState('score');
  const [busca, setBusca] = useState('');
  const termo = useAtrasado(busca);
  const refBusca = useAtalhoBusca();
  const { dados, carregando, erro, recarregar } = useAsync(() => solicitacoesDaOng(), []);

  const filtrar = FILTRO[aba] || ((s) => !aba || s.status === aba);
  const lista = (dados || [])
    .filter(filtrar)
    .filter((s) => contem(`${s.id} ${s.animal.nome} ${s.usuario.nome} ${s.usuario.cidade || ''}`, termo))
    .sort((a, b) => (ordem === 'score' ? b.score - a.score : b.criadoEm.localeCompare(a.criadoEm)));

  return (
    <div className="container pagina">
      <CabecalhoPagina titulo="Solicitações de adoção" subtitulo="Analise os pedidos com apoio do índice de compatibilidade." />

      <div className="barra-ferramentas">
        <div className="abas abas--linha">
          {ABAS.map(([k, r]) => (
            <button key={k} className={`aba ${aba === k ? 'is-ativa' : ''}`} onClick={() => setAba(k)}>
              {r}
              {k === 'abertas' && dados && <span className="aba__contador">{dados.filter(FILTRO.abertas).length}</span>}
            </button>
          ))}
        </div>
        <div className="input-icone">
          <Icone nome="busca" tamanho={18} />
          <input ref={refBusca} type="search" placeholder="Pesquisar animal ou adotante… (/)" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Pesquisar solicitações" />
        </div>
        <select value={ordem} onChange={(e) => setOrdem(e.target.value)} aria-label="Ordenar">
          <option value="score">Maior compatibilidade</option>
          <option value="data">Mais recentes</option>
        </select>
      </div>

      <Erro erro={erro} onTentar={recarregar} />
      {carregando ? (
        <Carregando />
      ) : lista.length === 0 ? (
        <Vazio titulo={termo ? `Nada encontrado para “${termo}”` : 'Nenhuma solicitação nesta aba'} texto={termo ? 'Confira a grafia ou procure em outra aba.' : undefined} />
      ) : (
        <div className="tabela-wrap">
          <table className="tabela tabela--clicavel">
            <thead>
              <tr>
                <th>Animal</th>
                <th>Adotante</th>
                <th>Compatibilidade</th>
                <th>Recebida</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link to={`/ong/solicitacoes/${s.id}`} className="celula-animal">
                      <img src={s.animal.fotos[0]} alt="" className="miniatura" />
                      <strong>{s.animal.nome}</strong>
                    </Link>
                  </td>
                  <td>
                    <strong>{s.usuario.nome}</strong>
                    <span className="texto-suave bloco">{s.usuario.cidade}</span>
                  </td>
                  <td>
                    <span className={`chip-score score--${nivelScore(s.score).tom}`}>{s.score}%</span>
                  </td>
                  <td className="texto-suave">{formatarData(s.criadoEm)}</td>
                  <td>
                    <div className="acoes-linha">
                      <StatusBadge tipo="solicitacao" status={s.status} />
                      <Link to={`/ong/solicitacoes/${s.id}`} className="btn btn--link">Abrir</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
