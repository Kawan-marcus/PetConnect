import { useState } from 'react';
import { CabecalhoPagina } from '../../components/Layout.jsx';
import Carregando, { Erro, Vazio } from '../../components/Carregando.jsx';
import { StatusBadge } from '../../components/Badge.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { listarOngs, alterarStatusOng } from '../../api/admin.js';
import { useToast } from '../../context/ToastContext.jsx';
import { STATUS_ONG, formatarData } from '../../utils/format.js';

/** RF18 + RN04: aprovação e gestão das ONGs. */
export default function AdminOngs() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const { dados, carregando, erro, recarregar, setDados } = useAsync(() => listarOngs({ status }), [status]);

  const mudar = async (ong, novo) => {
    try {
      await alterarStatusOng(ong.id, novo);
      setDados((l) => (status && status !== novo ? l.filter((o) => o.id !== ong.id) : l.map((o) => (o.id === ong.id ? { ...o, status: novo } : o))));
      toast(`${ong.nome}: ${STATUS_ONG[novo].rotulo.toLowerCase()}.`);
    } catch (e) {
      toast(e.message, 'erro');
    }
  };

  return (
    <div className="container pagina">
      <CabecalhoPagina titulo="ONGs" subtitulo="Aprove novas instituições e gerencie as existentes." />
      <div className="abas abas--linha">
        {[['', 'Todas'], ['pendente', 'Aguardando aprovação'], ['aprovada', 'Aprovadas'], ['suspensa', 'Suspensas']].map(([k, r]) => (
          <button key={k} className={`aba ${status === k ? 'is-ativa' : ''}`} onClick={() => setStatus(k)}>{r}</button>
        ))}
      </div>
      <Erro erro={erro} onTentar={recarregar} />
      {carregando && !dados ? <Carregando /> : dados?.length === 0 ? <Vazio titulo="Nenhuma ONG nesta situação" /> : (
        <div className="lista-cards">
          {dados?.map((o) => (
            <article key={o.id} className="card ong-card">
              <div className="ong-card__info">
                <div className="ong-card__titulo">
                  <h2>{o.nome}</h2>
                  <StatusBadge tipo="ong" status={o.status} />
                </div>
                <p className="texto-suave">CNPJ {o.cnpj} · {o.cidade} · desde {formatarData(o.criadoEm)}</p>
                <p className="texto-suave">{o.email} · {o.telefone}</p>
                {o.descricao && <p>{o.descricao}</p>}
                <p className="texto-suave">{o.totalAnimais} animais cadastrados · {o.totalAdocoes} adoções concluídas</p>
              </div>
              <div className="ong-card__acoes">
                {o.status === 'pendente' && (
                  <>
                    <button className="btn btn--sucesso" onClick={() => mudar(o, 'aprovada')}>Aprovar</button>
                    <button className="btn btn--perigo-suave" onClick={() => mudar(o, 'suspensa')}>Recusar</button>
                  </>
                )}
                {o.status === 'aprovada' && <button className="btn btn--perigo-suave" onClick={() => mudar(o, 'suspensa')}>Suspender</button>}
                {o.status === 'suspensa' && <button className="btn btn--fantasma" onClick={() => mudar(o, 'aprovada')}>Reativar</button>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
