import { Vazio } from './Carregando.jsx';
import Icone from './Icone.jsx';
import { useAtalhoBusca, useTabela } from '../hooks/useTabela.js';
import { exportarCSV, exportarPDF } from '../utils/exportar.js';

/**
 * Tabela de relatório com pesquisa, ordenação por coluna, paginação e exportação (Sprint 07).
 *
 * colunas: [{ id, titulo, valor: (linha) => valor bruto (ordena e exporta), render?: (linha) => JSX, direita?, csv?: false }]
 * busca:   (linha) => [textos pesquisáveis]
 */
export default function TabelaRelatorio({
  colunas, linhas, busca, placeholder = 'Pesquisar…', titulo, arquivo, contexto = [],
  ordem, porPagina = 15, vazio = 'Nenhum registro encontrado', rodape, compacta,
}) {
  const t = useTabela(linhas, { campos: busca, ordem, porPagina });
  const refBusca = useAtalhoBusca();

  const exportaveis = colunas.filter((c) => c.csv !== false);
  const csv = () => exportarCSV(arquivo, exportaveis, t.filtradas, [
    `PetConnect — ${titulo}`,
    ...contexto,
    ...(t.termo ? [`Pesquisa: "${t.termo}"`] : []),
    `Gerado em ${new Date().toLocaleString('pt-BR')} · ${t.filtradas.length} registro(s)`,
  ]);

  return (
    <div className="relatorio-tabela">
      <div className="relatorio-tabela__topo nao-imprimir">
        {busca && (
          <div className="input-icone relatorio-tabela__busca">
            <Icone nome="busca" tamanho={18} />
            <input
              ref={refBusca}
              type="search"
              placeholder={placeholder}
              value={t.busca}
              onChange={(e) => t.setBusca(e.target.value)}
              aria-label={placeholder}
            />
            <kbd className="atalho" title="Atalho: tecle / para pesquisar">/</kbd>
          </div>
        )}
        <span className="texto-suave relatorio-tabela__total" aria-live="polite">
          {t.filtradas.length} {t.filtradas.length === 1 ? 'registro' : 'registros'}
        </span>
        {arquivo && (
          <div className="relatorio-tabela__exportar">
            <button type="button" className="btn btn--fantasma" onClick={csv} disabled={!t.filtradas.length} title="Abre no Excel, LibreOffice ou Google Planilhas">
              <Icone nome="baixar" tamanho={16} /> CSV
            </button>
            <button type="button" className="btn btn--fantasma" onClick={() => exportarPDF(titulo)} disabled={!t.filtradas.length} title="Abre a impressão: escolha “Salvar como PDF”">
              <Icone nome="imprimir" tamanho={16} /> PDF
            </button>
          </div>
        )}
      </div>

      {t.filtradas.length === 0 ? (
        <Vazio titulo={vazio} texto={t.termo ? `Nada encontrado para “${t.termo}”. Tente outro termo ou limpe os filtros.` : 'Ajuste os filtros para ver mais resultados.'} />
      ) : (
        <>
          <div className="tabela-wrap">
            <table className={`tabela ${compacta ? 'tabela--compacta' : ''}`}>
              <thead>
                <tr>
                  {colunas.map((c) => {
                    const ativa = t.ordem?.id === c.id;
                    return (
                      <th key={c.id} className={c.direita ? 'direita' : ''} aria-sort={ativa ? (t.ordem.desc ? 'descending' : 'ascending') : 'none'}>
                        <button type="button" className="th-ordenar" onClick={() => t.ordenarPor(c.id, c.valor)} title="Ordenar">
                          {c.titulo}
                          <span className="th-ordenar__seta" aria-hidden="true">{ativa ? (t.ordem.desc ? '▼' : '▲') : '↕'}</span>
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {t.visiveis.map((l, i) => (
                  <tr key={l.id ?? i}>
                    {colunas.map((c) => (
                      <td key={c.id} className={c.direita ? 'direita' : ''}>{c.render ? c.render(l) : (c.valor(l) ?? '—')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {rodape && <tfoot>{rodape(t.filtradas)}</tfoot>}
            </table>
          </div>
          {/* Na impressão saem todas as linhas filtradas, não só a página atual */}
          <div className="so-imprimir">
            <table className="tabela tabela--compacta">
              <thead><tr>{exportaveis.map((c) => <th key={c.id}>{c.titulo}</th>)}</tr></thead>
              <tbody>
                {t.filtradas.map((l, i) => (
                  <tr key={l.id ?? i}>{exportaveis.map((c) => <td key={c.id}>{String(c.valor(l) ?? '—')}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          {t.totalPaginas > 1 && (
            <nav className="paginacao nao-imprimir" aria-label="Páginas">
              <button type="button" className="btn btn--fantasma" disabled={t.pagina === 1} onClick={() => t.setPagina(t.pagina - 1)}>
                <Icone nome="voltar" tamanho={16} /> Anterior
              </button>
              <span className="texto-suave">Página {t.pagina} de {t.totalPaginas}</span>
              <button type="button" className="btn btn--fantasma" disabled={t.pagina === t.totalPaginas} onClick={() => t.setPagina(t.pagina + 1)}>
                Próxima <Icone nome="seta" tamanho={16} />
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
