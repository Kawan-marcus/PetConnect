import { useMemo } from 'react';
import { CabecalhoPagina } from '../../components/Layout.jsx';
import Carregando, { Erro } from '../../components/Carregando.jsx';
import FiltrosRelatorio from '../../components/Filtros.jsx';
import TabelaRelatorio from '../../components/TabelaRelatorio.jsx';
import Badge from '../../components/Badge.jsx';
import Icone from '../../components/Icone.jsx';
import { BarrasHorizontais } from '../../components/Graficos.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useFiltrosSalvos } from '../../hooks/useTabela.js';
import { historicoOperacoes, rotuloAcao, TIPOS_OPERACAO } from '../../api/relatorios.js';
import { intervalo, dentro, descreverPeriodo } from '../../utils/relatorios.js';
import { PERFIS, formatarData } from '../../utils/format.js';

const FILTRO_PADRAO = { periodo: '30', de: '', ate: '', status: '', usuario: '' };
const TOM_PERFIL = { admin: 'azul', ong: 'amarelo', adotante: 'cinza', sistema: 'verde' };

/**
 * Histórico de operações (Sprint 07 — logs): quem fez o quê e quando.
 * Fonte: rota GET /admin/logs (tabela log_acao, gravada pelos triggers do banco).
 * Enquanto o backend não tiver essa rota, a tela monta o histórico com as etapas das
 * solicitações e os cadastros que a API já devolve.
 */
export default function AdminOperacoes() {
  const [filtros, alterar, limpar] = useFiltrosSalvos('operacoes', FILTRO_PADRAO);
  const { dados, carregando, erro, recarregar } = useAsync(historicoOperacoes, []);

  const { linhas, pessoas, porTipo } = useMemo(() => {
    if (!dados) return { linhas: [], pessoas: [], porTipo: [] };
    const per = intervalo(filtros);
    const todas = dados.operacoes.filter((o) => dentro(o.data, per));
    const filtradas = todas.filter((o) => (!filtros.status || o.entidade === filtros.status) && (!filtros.usuario || o.quem === filtros.usuario));
    const nomes = [...new Set(todas.map((o) => o.quem))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const contagem = Object.keys(TIPOS_OPERACAO).map((k) => ({ rotulo: TIPOS_OPERACAO[k], valor: todas.filter((o) => o.entidade === k).length })).filter((x) => x.valor);
    return { linhas: filtradas, pessoas: nomes.map((n) => ({ id: n, nome: n })), porTipo: contagem };
  }, [dados, filtros]);

  return (
    <div className="container pagina">
      <CabecalhoPagina titulo="Histórico de operações" subtitulo="Registro das principais ações feitas no sistema: quem fez, o quê e quando." />

      {dados?.fonte === 'montado' && (
        <p className="alerta alerta--info nao-imprimir">
          <Icone nome="relogio" />
          <span>Histórico montado com as etapas das solicitações e os cadastros. O banco também grava cada operação na tabela <code>log_acao</code> (triggers); quando o backend publicar a rota <code>GET /admin/logs</code>, esta tela passa a mostrar esse registro completo automaticamente.</span>
        </p>
      )}

      <FiltrosRelatorio
        filtros={filtros}
        alterar={alterar}
        limpar={limpar}
        campos={['periodo', 'status', 'usuario']}
        status={TIPOS_OPERACAO}
        rotuloStatus="Todos os tipos"
        tituloStatus="Tipo"
        tituloUsuario="Quem fez"
        padraoPeriodo="30"
        usuarios={pessoas}
        rotuloUsuario="Todas as pessoas"
      />
      <Erro erro={erro} onTentar={recarregar} />

      {carregando && !dados ? <Carregando /> : dados && (
        <div className="grade-operacoes">
          <section className="card">
            <TabelaRelatorio
              titulo="Histórico de operações"
              arquivo="petconnect-historico-operacoes"
              contexto={[`Período: ${descreverPeriodo(filtros)}`]}
              linhas={linhas}
              porPagina={25}
              busca={(o) => [o.quem, rotuloAcao(o.acao), o.descricao, o.entidadeId]}
              placeholder="Pesquisar por pessoa, ação, animal ou nº…"
              ordem={{ id: 'data', valor: (o) => o.data, desc: true }}
              vazio="Nenhuma operação no período"
              compacta
              colunas={[
                { id: 'data', titulo: 'Quando', valor: (o) => o.data, render: (o) => <span className="texto-suave">{formatarData(o.data, true)}</span> },
                { id: 'quem', titulo: 'Quem', valor: (o) => o.quem, render: (o) => <><strong>{o.quem}</strong> <Badge tom={TOM_PERFIL[o.perfil] || 'cinza'}>{PERFIS[o.perfil] || 'Sistema'}</Badge></> },
                { id: 'acao', titulo: 'Operação', valor: (o) => rotuloAcao(o.acao) },
                { id: 'tipo', titulo: 'Tipo', valor: (o) => TIPOS_OPERACAO[o.entidade] || o.entidade },
                { id: 'detalhe', titulo: 'Detalhe', valor: (o) => o.descricao, render: (o) => <span className="texto-suave">{o.descricao}</span> },
              ]}
            />
          </section>
          <aside className="card nao-imprimir">
            <h2>Operações por tipo</h2>
            <p className="texto-suave">{descreverPeriodo(filtros)}</p>
            <BarrasHorizontais itens={porTipo} />
          </aside>
        </div>
      )}
    </div>
  );
}
