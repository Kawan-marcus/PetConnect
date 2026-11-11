import Icone from './Icone.jsx';
import { PERIODOS, hojeISO } from '../utils/relatorios.js';
import { ESPECIES } from '../utils/format.js';

/**
 * Barra de filtros dos relatórios e do dashboard (Sprint 07).
 * Período, categoria (espécie), situação, ONG e usuário — mostra só os campos pedidos.
 *
 *   <FiltrosRelatorio filtros={f} alterar={alterar} limpar={limpar}
 *     campos={['periodo', 'ong', 'especie', 'status']} ongs={ongs} status={STATUS_SOLICITACAO} />
 */
export default function FiltrosRelatorio({ filtros, alterar, limpar, campos, ongs = [], usuarios = [], status, rotuloStatus = 'Todas as situações', rotuloUsuario = 'Todos os adotantes', tituloStatus = 'Situação', tituloUsuario = 'Usuário', padraoPeriodo = '180' }) {
  const tem = (c) => campos.includes(c);
  const ativos = campos.filter((c) => c !== 'periodo' && filtros[c]).length + (filtros.periodo !== padraoPeriodo && tem('periodo') ? 1 : 0);

  return (
    <div className="filtros-relatorio" role="group" aria-label="Filtros">
      <span className="filtros-relatorio__titulo"><Icone nome="filtro" tamanho={16} /> Filtros</span>
      {tem('periodo') && (
        <label className="filtros-relatorio__campo">
          <span>Período</span>
          <select value={filtros.periodo} onChange={(e) => alterar('periodo', e.target.value)}>
            {PERIODOS.map((p) => <option key={p.valor} value={p.valor}>{p.rotulo}</option>)}
          </select>
        </label>
      )}
      {tem('periodo') && filtros.periodo === 'personalizado' && (
        <>
          <label className="filtros-relatorio__campo">
            <span>De</span>
            <input type="date" value={filtros.de || ''} max={filtros.ate || hojeISO()} onChange={(e) => alterar('de', e.target.value)} />
          </label>
          <label className="filtros-relatorio__campo">
            <span>Até</span>
            <input type="date" value={filtros.ate || ''} min={filtros.de || undefined} max={hojeISO()} onChange={(e) => alterar('ate', e.target.value)} />
          </label>
        </>
      )}
      {tem('ong') && (
        <label className="filtros-relatorio__campo">
          <span>ONG</span>
          <select value={filtros.ong || ''} onChange={(e) => alterar('ong', e.target.value)}>
            <option value="">Todas as ONGs</option>
            {ongs.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
        </label>
      )}
      {tem('especie') && (
        <label className="filtros-relatorio__campo">
          <span>Categoria</span>
          <select value={filtros.especie || ''} onChange={(e) => alterar('especie', e.target.value)}>
            <option value="">Cães e gatos</option>
            {Object.entries(ESPECIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
      )}
      {tem('status') && status && (
        <label className="filtros-relatorio__campo">
          <span>{tituloStatus}</span>
          <select value={filtros.status || ''} onChange={(e) => alterar('status', e.target.value)}>
            <option value="">{rotuloStatus}</option>
            {Object.entries(status).map(([k, v]) => <option key={k} value={k}>{v.rotulo ?? v}</option>)}
          </select>
        </label>
      )}
      {tem('usuario') && (
        <label className="filtros-relatorio__campo">
          <span>{tituloUsuario}</span>
          <select value={filtros.usuario || ''} onChange={(e) => alterar('usuario', e.target.value)}>
            <option value="">{rotuloUsuario}</option>
            {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        </label>
      )}
      {ativos > 0 && limpar && (
        <button type="button" className="btn btn--link" onClick={limpar}>
          <Icone nome="x" tamanho={14} /> Limpar filtros
        </button>
      )}
    </div>
  );
}
