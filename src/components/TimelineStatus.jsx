import { STATUS_SOLICITACAO, formatarData } from '../utils/format.js';

const FLUXO = ['pendente', 'em_analise', 'aprovada', 'concluida'];
const FINAIS_NEGATIVOS = ['recusada', 'encerrada', 'cancelada'];

/** Linha do tempo da solicitação: mostra as etapas percorridas e as que faltam. */
export default function TimelineStatus({ historico = [], status }) {
  const porStatus = Object.fromEntries(historico.map((h) => [h.status, h]));
  const negativo = FINAIS_NEGATIVOS.includes(status);
  const etapas = negativo
    ? [...historico.map((h) => h.status).filter((s) => FLUXO.includes(s)), status]
    : FLUXO;

  return (
    <ol className="timeline">
      {etapas.map((s) => {
        const h = porStatus[s];
        const feito = Boolean(h);
        const atual = s === status;
        const erro = FINAIS_NEGATIVOS.includes(s);
        return (
          <li key={s} className={`timeline__item ${feito ? 'is-feito' : ''} ${atual ? 'is-atual' : ''} ${erro ? 'is-negativo' : ''}`}>
            <span className="timeline__ponto" aria-hidden="true" />
            <div>
              <strong>{STATUS_SOLICITACAO[s].rotulo}</strong>
              <span className="texto-suave">{feito ? formatarData(h.data, true) : 'Aguardando'}</span>
              {h?.obs && <p className="timeline__obs">{h.obs}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
