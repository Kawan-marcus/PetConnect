import { STATUS_ANIMAL, STATUS_SOLICITACAO, STATUS_ONG } from '../utils/format.js';

export default function Badge({ tom = 'cinza', children }) {
  return <span className={`badge badge--${tom}`}>{children}</span>;
}

const MAPAS = { animal: STATUS_ANIMAL, solicitacao: STATUS_SOLICITACAO, ong: STATUS_ONG };

/** <StatusBadge tipo="solicitacao" status="em_analise" /> */
export function StatusBadge({ tipo, status }) {
  const info = MAPAS[tipo]?.[status] || { rotulo: status, tom: 'cinza' };
  return <Badge tom={info.tom}>{info.rotulo}</Badge>;
}
