import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CabecalhoPagina } from '../../components/Layout.jsx';
import Carregando, { Erro } from '../../components/Carregando.jsx';
import FiltrosRelatorio from '../../components/Filtros.jsx';
import TabelaRelatorio from '../../components/TabelaRelatorio.jsx';
import { StatusBadge } from '../../components/Badge.jsx';
import Badge from '../../components/Badge.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useFiltrosSalvos } from '../../hooks/useTabela.js';
import { dadosAdmin } from '../../api/relatorios.js';
import { STATUS_SOLICITACAO, STATUS_ANIMAL, STATUS_ONG, ESPECIES, PERFIS, formatarData } from '../../utils/format.js';
import {
  filtrarSolicitacoes, desempenhoPorOng, porFaixa, animaisEmEspera, cadastrosPorMes, indicadores,
  intervalo, dentro, descreverPeriodo, rotuloMes, fmtPct, fmtDias, fmtNumero, FAIXAS,
} from '../../utils/relatorios.js';

export const RELATORIOS = [
  { id: 'solicitacoes', titulo: 'Solicitações de adoção', descricao: 'Todos os pedidos, com score, situação e há quanto tempo estão abertos.', filtros: ['periodo', 'ong', 'especie', 'status', 'usuario'] },
  { id: 'adocoes', titulo: 'Adoções concluídas', descricao: 'Adoções finalizadas no período, tempo até a adoção e acompanhamento.', filtros: ['periodo', 'ong', 'especie'] },
  { id: 'ongs', titulo: 'Desempenho por ONG', descricao: 'Pedidos, aprovações, recusas e tempo médio de cada ONG.', filtros: ['periodo', 'especie'] },
  { id: 'espera', titulo: 'Animais à espera', descricao: 'Animais ainda sem lar, há quanto tempo estão na plataforma e o interesse recebido.', filtros: ['ong', 'especie', 'status'] },
  { id: 'compatibilidade', titulo: 'Compatibilidade × resultado', descricao: 'Se o score da IA acompanha a decisão das ONGs.', filtros: ['periodo', 'ong', 'especie'] },
  { id: 'cadastros', titulo: 'Cadastros na plataforma', descricao: 'Novas contas de adotantes e ONGs por mês.', filtros: ['periodo'] },
];

const FILTRO_PADRAO = { periodo: '180', de: '', ate: '', ong: '', especie: '', status: '', usuario: '' };

const score = (s) => (s.score == null ? '—' : `${s.score}%`);

/** Relatórios do administrador (Sprint 07): consulta, filtros, pesquisa e exportação CSV/PDF. */
export default function AdminRelatorios() {
  const [params, setParams] = useSearchParams();
  const atual = RELATORIOS.find((r) => r.id === params.get('r')) || RELATORIOS[0];
  const [filtros, alterar, limpar] = useFiltrosSalvos('relatorios', FILTRO_PADRAO);
  const { dados, carregando, erro, recarregar } = useAsync(dadosAdmin, []);

  const f = useMemo(() => Object.fromEntries(Object.entries(filtros).map(([k, v]) => [k, atual.filtros.includes(k) || ['de', 'ate'].includes(k) ? v : ''])), [filtros, atual]);
  const contexto = [atual.descricao, filtrosEmTexto(f, atual.filtros, dados)];

  return (
    <div className="container pagina">
      <CabecalhoPagina titulo="Relatórios" subtitulo="Consulte, filtre e exporte as informações da plataforma." />

      <div className="relatorios">
        <nav className="relatorios__menu nao-imprimir" aria-label="Relatórios">
          {RELATORIOS.map((r) => (
            <button key={r.id} type="button" className={`relatorios__item ${r.id === atual.id ? 'is-ativo' : ''}`} onClick={() => setParams({ r: r.id }, { replace: true })} aria-current={r.id === atual.id ? 'page' : undefined}>
              <strong>{r.titulo}</strong>
              <span className="texto-suave">{r.descricao}</span>
            </button>
          ))}
        </nav>

        <section className="card relatorios__conteudo" aria-labelledby="titulo-relatorio">
          <header className="relatorio__cabecalho">
            <h2 id="titulo-relatorio">{atual.titulo}</h2>
            <p className="texto-suave">{atual.descricao}</p>
            <p className="so-imprimir">{contexto[1]} · Gerado em {new Date().toLocaleString('pt-BR')}</p>
          </header>
          <div className="nao-imprimir">
            <FiltrosRelatorio
              filtros={filtros}
              alterar={alterar}
              limpar={limpar}
              campos={atual.filtros}
              ongs={dados?.ongs || []}
              usuarios={(dados?.usuarios || []).filter((u) => u.perfil === 'adotante').sort((a, b) => a.nome.localeCompare(b.nome))}
              status={atual.id === 'espera' ? { disponivel: STATUS_ANIMAL.disponivel, em_processo: STATUS_ANIMAL.em_processo } : STATUS_SOLICITACAO}
            />
          </div>
          <Erro erro={erro} onTentar={recarregar} />
          {carregando && !dados ? <Carregando /> : dados && (
            <Relatorio id={atual.id} dados={dados} f={f} contexto={contexto} titulo={atual.titulo} />
          )}
        </section>
      </div>
    </div>
  );
}

function filtrosEmTexto(f, campos, dados) {
  const partes = [];
  if (campos.includes('periodo')) partes.push(`Período: ${descreverPeriodo(f)}`);
  if (f.ong) partes.push(`ONG: ${dados?.ongs.find((o) => String(o.id) === String(f.ong))?.nome || f.ong}`);
  if (f.especie) partes.push(`Categoria: ${ESPECIES[f.especie]}`);
  if (f.status) partes.push(`Situação: ${STATUS_SOLICITACAO[f.status]?.rotulo || STATUS_ANIMAL[f.status]?.rotulo || f.status}`);
  if (f.usuario) partes.push(`Adotante: ${dados?.usuarios.find((u) => String(u.id) === String(f.usuario))?.nome || f.usuario}`);
  return partes.join(' · ') || 'Sem filtros';
}

function Resumo({ itens }) {
  return (
    <dl className="resumo-relatorio">
      {itens.map(([rotulo, valor]) => (
        <div key={rotulo}><dt>{rotulo}</dt><dd>{valor}</dd></div>
      ))}
    </dl>
  );
}

function Relatorio({ id, dados, f, contexto, titulo }) {
  const comum = { titulo, contexto, arquivo: `petconnect-${id}` };

  if (id === 'solicitacoes') {
    const linhas = filtrarSolicitacoes(dados.solicitacoes, f);
    const ind = indicadores(linhas);
    return (
      <>
        <Resumo itens={[['Solicitações', fmtNumero(ind.total)], ['Em aberto', fmtNumero(ind.abertas)], ['Taxa de aprovação', fmtPct(ind.taxaAprovacao)], ['Espera média dos abertos', fmtDias(ind.esperaMedia)]]} />
        <TabelaRelatorio
          {...comum}
          linhas={linhas}
          busca={(s) => [s.id, s.animal?.nome, s.adotanteNome, s.ongNome]}
          placeholder="Pesquisar por animal, adotante, ONG ou nº…"
          ordem={{ id: 'data', valor: (s) => s.criadoEm, desc: true }}
          colunas={[
            { id: 'id', titulo: 'Nº', valor: (s) => s.id },
            { id: 'data', titulo: 'Data', valor: (s) => s.criadoEm, render: (s) => formatarData(s.criadoEm) },
            { id: 'animal', titulo: 'Animal', valor: (s) => s.animal?.nome, render: (s) => <strong>{s.animal?.nome}</strong> },
            { id: 'especie', titulo: 'Categoria', valor: (s) => ESPECIES[s.especie] || '—' },
            { id: 'adotante', titulo: 'Adotante', valor: (s) => s.adotanteNome },
            { id: 'ong', titulo: 'ONG', valor: (s) => s.ongNome },
            { id: 'score', titulo: 'Score', direita: true, valor: (s) => s.score, render: score },
            { id: 'status', titulo: 'Situação', valor: (s) => STATUS_SOLICITACAO[s.status]?.rotulo, render: (s) => <StatusBadge tipo="solicitacao" status={s.status} /> },
            { id: 'aberto', titulo: 'Dias em aberto', direita: true, valor: (s) => s.diasEmAberto },
          ]}
        />
      </>
    );
  }

  if (id === 'adocoes') {
    const linhas = filtrarSolicitacoes(dados.solicitacoes.filter((s) => s.concluidaEm), f, 'concluidaEm');
    const ind = indicadores(linhas);
    return (
      <>
        <Resumo itens={[['Adoções concluídas', fmtNumero(linhas.length)], ['Tempo médio até a adoção', fmtDias(ind.tempoMedio)], ['Compatibilidade média', ind.scoreMedio != null ? `${fmtNumero(ind.scoreMedio)}%` : '—'], ['Cães / gatos', `${linhas.filter((s) => s.especie === 'cao').length} / ${linhas.filter((s) => s.especie === 'gato').length}`]]} />
        <TabelaRelatorio
          {...comum}
          linhas={linhas}
          busca={(s) => [s.id, s.animal?.nome, s.adotanteNome, s.ongNome]}
          placeholder="Pesquisar por animal, adotante ou ONG…"
          ordem={{ id: 'concluida', valor: (s) => s.concluidaEm, desc: true }}
          colunas={[
            { id: 'concluida', titulo: 'Concluída em', valor: (s) => s.concluidaEm, render: (s) => formatarData(s.concluidaEm) },
            { id: 'animal', titulo: 'Animal', valor: (s) => s.animal?.nome, render: (s) => <strong>{s.animal?.nome}</strong> },
            { id: 'especie', titulo: 'Categoria', valor: (s) => ESPECIES[s.especie] || '—' },
            { id: 'adotante', titulo: 'Adotante', valor: (s) => s.adotanteNome },
            { id: 'ong', titulo: 'ONG', valor: (s) => s.ongNome },
            { id: 'score', titulo: 'Score', direita: true, valor: (s) => s.score, render: score },
            { id: 'dias', titulo: 'Dias até a adoção', direita: true, valor: (s) => s.diasAteAdocao },
          ]}
        />
      </>
    );
  }

  if (id === 'ongs') {
    const linhas = filtrarSolicitacoes(dados.solicitacoes, f);
    const ongs = desempenhoPorOng(linhas, dados.ongs, dados.animais.filter((a) => !f.especie || a.especie === f.especie));
    return (
      <TabelaRelatorio
        {...comum}
        linhas={ongs}
        busca={(o) => [o.ong, o.cidade]}
        placeholder="Pesquisar ONG ou cidade…"
        ordem={{ id: 'solicitacoes', valor: (o) => o.solicitacoes, desc: true }}
        colunas={[
          { id: 'ong', titulo: 'ONG', valor: (o) => o.ong, render: (o) => <><strong>{o.ong}</strong><span className="texto-suave bloco">{o.cidade}</span></> },
          { id: 'situacao', titulo: 'Situação', valor: (o) => STATUS_ONG[o.status]?.rotulo, render: (o) => <Badge tom={STATUS_ONG[o.status]?.tom}>{STATUS_ONG[o.status]?.rotulo}</Badge> },
          { id: 'animais', titulo: 'Animais', direita: true, valor: (o) => o.animais },
          { id: 'solicitacoes', titulo: 'Pedidos', direita: true, valor: (o) => o.solicitacoes },
          { id: 'aprovadas', titulo: 'Aprovados', direita: true, valor: (o) => o.aprovadas },
          { id: 'recusadas', titulo: 'Recusados', direita: true, valor: (o) => o.recusadas },
          { id: 'concluidas', titulo: 'Adoções', direita: true, valor: (o) => o.concluidas },
          { id: 'taxa', titulo: 'Aprovação', direita: true, valor: (o) => o.taxaAprovacao, render: (o) => fmtPct(o.taxaAprovacao) },
          { id: 'tempo', titulo: 'Tempo médio', direita: true, valor: (o) => (o.tempoMedio == null ? null : Math.round(o.tempoMedio * 10) / 10), render: (o) => fmtDias(o.tempoMedio) },
        ]}
      />
    );
  }

  if (id === 'espera') {
    const aprovadas = new Set(dados.ongs.filter((o) => o.status === 'aprovada').map((o) => o.id));
    const linhas = animaisEmEspera(dados.animais, dados.solicitacoes)
      .filter((a) => aprovadas.has(a.ongId))
      .filter((a) => (!f.ong || String(a.ongId) === String(f.ong)) && (!f.especie || a.especie === f.especie) && (!f.status || a.status === f.status));
    const semPedido = linhas.filter((a) => !a.pedidos).length;
    return (
      <>
        <Resumo itens={[['Animais à espera', fmtNumero(linhas.length)], ['Sem nenhum pedido', fmtNumero(semPedido)], ['Há mais de 90 dias', fmtNumero(linhas.filter((a) => a.diasNaPlataforma > 90).length)], ['Espera média', fmtDias(linhas.length ? linhas.reduce((x, a) => x + a.diasNaPlataforma, 0) / linhas.length : null)]]} />
        <TabelaRelatorio
          {...comum}
          linhas={linhas}
          busca={(a) => [a.nome, a.raca, a.ongNome]}
          placeholder="Pesquisar animal, raça ou ONG…"
          ordem={{ id: 'dias', valor: (a) => a.diasNaPlataforma, desc: true }}
          colunas={[
            { id: 'animal', titulo: 'Animal', valor: (a) => a.nome, render: (a) => <Link to={`/animais/${a.id}`}><strong>{a.nome}</strong></Link> },
            { id: 'especie', titulo: 'Categoria', valor: (a) => ESPECIES[a.especie] },
            { id: 'raca', titulo: 'Raça', valor: (a) => a.raca },
            { id: 'ong', titulo: 'ONG', valor: (a) => a.ongNome },
            { id: 'status', titulo: 'Situação', valor: (a) => STATUS_ANIMAL[a.status]?.rotulo, render: (a) => <StatusBadge tipo="animal" status={a.status} /> },
            { id: 'dias', titulo: 'Dias na plataforma', direita: true, valor: (a) => a.diasNaPlataforma },
            { id: 'faixa', titulo: 'Faixa', valor: (a) => a.faixaEspera },
            { id: 'pedidos', titulo: 'Pedidos recebidos', direita: true, valor: (a) => a.pedidos },
          ]}
        />
      </>
    );
  }

  if (id === 'compatibilidade') {
    const linhas = filtrarSolicitacoes(dados.solicitacoes, f);
    const faixas = porFaixa(linhas);
    const alta = faixas.find((x) => x.faixa === 'alta');
    const baixa = faixas.find((x) => x.faixa === 'baixa');
    return (
      <>
        {alta?.taxaAprovacao != null && baixa?.taxaAprovacao != null && (
          <p className="alerta alerta--ia">
            Pedidos com compatibilidade alta foram aprovados em <strong>{fmtPct(alta.taxaAprovacao)}</strong> das decisões; os de compatibilidade baixa, em <strong>{fmtPct(baixa.taxaAprovacao)}</strong>.
            {alta.taxaAprovacao > baixa.taxaAprovacao ? ' O score está ajudando a prever a decisão das ONGs.' : ' O score ainda não acompanha a decisão das ONGs — vale revisar os pesos.'}
          </p>
        )}
        <TabelaRelatorio
          {...comum}
          linhas={faixas.map((x) => ({ ...x, id: x.faixa }))}
          colunas={[
            { id: 'faixa', titulo: 'Faixa de compatibilidade', valor: (x) => FAIXAS[x.faixa] },
            { id: 'solicitacoes', titulo: 'Pedidos', direita: true, valor: (x) => x.solicitacoes },
            { id: 'score', titulo: 'Score médio', direita: true, valor: (x) => (x.scoreMedio == null ? null : Math.round(x.scoreMedio * 10) / 10), render: (x) => (x.scoreMedio == null ? '—' : `${fmtNumero(x.scoreMedio, 1)}%`) },
            { id: 'aprovadas', titulo: 'Aprovados', direita: true, valor: (x) => x.aprovadas },
            { id: 'recusadas', titulo: 'Recusados', direita: true, valor: (x) => x.recusadas },
            { id: 'taxa', titulo: 'Taxa de aprovação', direita: true, valor: (x) => x.taxaAprovacao, render: (x) => fmtPct(x.taxaAprovacao) },
          ]}
        />
      </>
    );
  }

  // cadastros
  const meses = cadastrosPorMes(dados.usuarios, f);
  const per = intervalo(f);
  const contas = dados.usuarios.filter((u) => dentro(u.criadoEm, per));
  return (
    <>
      <Resumo itens={[['Novas contas', fmtNumero(contas.length)], ['Adotantes', fmtNumero(contas.filter((u) => u.perfil === 'adotante').length)], ['ONGs', fmtNumero(contas.filter((u) => u.perfil === 'ong').length)], ['Contas desativadas', fmtNumero(contas.filter((u) => !u.ativo).length)]]} />
      <TabelaRelatorio
        {...comum}
        linhas={meses.map((m) => ({ ...m, id: m.mes }))}
        ordem={{ id: 'mes', valor: (m) => m.mes, desc: true }}
        colunas={[
          { id: 'mes', titulo: 'Mês', valor: (m) => rotuloMes(m.mes, true) },
          { id: 'adotantes', titulo: PERFIS.adotante + 's', direita: true, valor: (m) => m.adotantes },
          { id: 'ongs', titulo: 'ONGs', direita: true, valor: (m) => m.ongs },
          { id: 'total', titulo: 'Total', direita: true, valor: (m) => m.total },
        ]}
      />
    </>
  );
}
