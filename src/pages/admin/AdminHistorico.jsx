import { useState } from 'react';
import { CabecalhoPagina } from '../../components/Layout.jsx';
import Carregando, { Erro, Vazio } from '../../components/Carregando.jsx';
import { StatusBadge } from '../../components/Badge.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { todasSolicitacoes } from '../../api/admin.js';
import { STATUS_SOLICITACAO, formatarData } from '../../utils/format.js';

/** RF16: histórico de todas as solicitações e adoções. */
export default function AdminHistorico() {
  const [status, setStatus] = useState('');
  const { dados, carregando, erro, recarregar } = useAsync(todasSolicitacoes, []);
  const lista = (dados || []).filter((s) => !status || s.status === status);

  return (
    <div className="container pagina">
      <CabecalhoPagina titulo="Histórico de adoções" subtitulo="Todas as solicitações registradas na plataforma." />
      <div className="barra-busca">
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">Todos os status</option>
          {Object.entries(STATUS_SOLICITACAO).map(([k, v]) => <option key={k} value={k}>{v.rotulo}</option>)}
        </select>
      </div>
      <Erro erro={erro} onTentar={recarregar} />
      {carregando ? <Carregando /> : lista.length === 0 ? <Vazio titulo="Nenhum registro" /> : (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead><tr><th>#</th><th>Animal</th><th>Adotante</th><th>ONG</th><th className="direita">Score</th><th>Aberta em</th><th>Última atualização</th><th>Status</th></tr></thead>
            <tbody>
              {lista.map((s) => (
                <tr key={s.id}>
                  <td className="texto-suave">{s.id}</td>
                  <td><strong>{s.animal?.nome}</strong></td>
                  <td>{s.usuario?.nome}</td>
                  <td>{s.ong?.nome}</td>
                  <td className="direita">{s.score}%</td>
                  <td className="texto-suave">{formatarData(s.criadoEm)}</td>
                  <td className="texto-suave">{formatarData(s.historico.at(-1).data)}</td>
                  <td><StatusBadge tipo="solicitacao" status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
