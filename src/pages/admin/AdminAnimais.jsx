import { Link } from 'react-router-dom';
import { CabecalhoPagina } from '../../components/Layout.jsx';
import Carregando, { Erro } from '../../components/Carregando.jsx';
import { StatusBadge } from '../../components/Badge.jsx';
import Icone from '../../components/Icone.jsx';
import FiltrosRelatorio from '../../components/Filtros.jsx';
import TabelaRelatorio from '../../components/TabelaRelatorio.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useFiltrosSalvos } from '../../hooks/useTabela.js';
import { listarTodosAnimais, listarOngs, removerAnimalAdmin } from '../../api/admin.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useConfirmar } from '../../context/ConfirmarContext.jsx';
import { STATUS_ANIMAL, ESPECIES, formatarData } from '../../utils/format.js';
import { intervalo, dentro } from '../../utils/relatorios.js';

const FILTRO_PADRAO = { periodo: 'tudo', de: '', ate: '', ong: '', especie: '', status: '' };

/**
 * RF19: todos os animais, de todas as ONGs.
 * Sprint 07: pesquisa, filtro por período de cadastro e ONG, paginação (a base de teste tem 10 mil animais) e CSV.
 * Sprint 08: confirmação no padrão do sistema, explicando a regra RN08.
 */
export default function AdminAnimais() {
  const toast = useToast();
  const confirmar = useConfirmar();
  const [filtros, alterar, limpar] = useFiltrosSalvos('admin-animais', FILTRO_PADRAO);
  const { dados, carregando, erro, recarregar } = useAsync(async () => {
    const [animais, ongs] = await Promise.all([listarTodosAnimais({ status: filtros.status, especie: filtros.especie }), listarOngs()]);
    return { animais, ongs };
  }, [filtros.status, filtros.especie]);

  const per = intervalo(filtros);
  const lista = (dados?.animais || []).filter((a) => dentro(a.criadoEm, per) && (!filtros.ong || String(a.ong?.id ?? a.ongId) === String(filtros.ong)));

  const remover = async (a) => {
    const ok = await confirmar({
      titulo: `Remover ${a.nome}?`,
      mensagem: `O anúncio de ${a.nome} (${a.ong?.nome}) sai da plataforma e deixa de aparecer para os adotantes.`,
      detalhe: 'Não é possível remover um animal com solicitações em andamento (RN08). O histórico de adoções é mantido.',
      acao: 'Remover anúncio',
      perigo: true,
    });
    if (!ok) return;
    try {
      await removerAnimalAdmin(a.id);
      toast(`${a.nome} removido.`);
      recarregar();
    } catch (e) {
      toast(e.message, 'erro');
    }
  };

  return (
    <div className="container pagina">
      <CabecalhoPagina titulo="Animais" subtitulo={dados ? `${dados.animais.length.toLocaleString('pt-BR')} cadastrados em todas as ONGs` : ' '} />
      <FiltrosRelatorio
        padraoPeriodo="tudo" filtros={filtros} alterar={alterar} limpar={limpar} campos={['periodo', 'ong', 'especie', 'status']} ongs={dados?.ongs || []} status={STATUS_ANIMAL} />
      <Erro erro={erro} onTentar={recarregar} />
      {carregando && !dados ? <Carregando /> : (
        <section className="card">
          <TabelaRelatorio
            titulo="Animais cadastrados"
            arquivo="petconnect-animais"
            linhas={lista}
            busca={(a) => [a.nome, a.raca, a.ong?.nome, a.id]}
            placeholder="Pesquisar por nome, raça, ONG ou nº…"
            ordem={{ id: 'cadastro', valor: (a) => a.criadoEm, desc: true }}
            colunas={[
              {
                id: 'animal', titulo: 'Animal', valor: (a) => a.nome,
                render: (a) => (
                  <div className="celula-animal">
                    <img src={a.fotos?.[0]} alt="" className="miniatura" loading="lazy" />
                    <div><strong>{a.nome}</strong><span className="texto-suave bloco">{ESPECIES[a.especie]} · {a.raca}</span></div>
                  </div>
                ),
              },
              { id: 'especie', titulo: 'Categoria', valor: (a) => ESPECIES[a.especie] },
              { id: 'ong', titulo: 'ONG', valor: (a) => a.ong?.nome },
              { id: 'cadastro', titulo: 'Cadastro', valor: (a) => a.criadoEm, render: (a) => <span className="texto-suave">{formatarData(a.criadoEm)}</span> },
              { id: 'status', titulo: 'Situação', valor: (a) => STATUS_ANIMAL[a.status]?.rotulo, render: (a) => <StatusBadge tipo="animal" status={a.status} /> },
              {
                id: 'acoes', titulo: 'Ações', direita: true, csv: false, valor: () => null,
                render: (a) => (
                  <div className="acoes-linha">
                    <Link to={`/animais/${a.id}`} className="btn-icone" title={`Ver ${a.nome}`} aria-label={`Ver ${a.nome}`}><Icone nome="seta" tamanho={18} /></Link>
                    <button type="button" className="btn-icone btn-icone--perigo" title={`Remover ${a.nome}`} aria-label={`Remover ${a.nome}`} onClick={() => remover(a)}><Icone nome="lixo" tamanho={18} /></button>
                  </div>
                ),
              },
            ]}
          />
        </section>
      )}
    </div>
  );
}
