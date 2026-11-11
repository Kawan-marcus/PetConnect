import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CabecalhoPagina } from '../../components/Layout.jsx';
import Carregando, { Erro, Vazio } from '../../components/Carregando.jsx';
import Icone from '../../components/Icone.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { listarAnimaisDaOng, alterarStatusAnimal, removerAnimal } from '../../api/animais.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useConfirmar } from '../../context/ConfirmarContext.jsx';
import { useAtalhoBusca, useAtrasado } from '../../hooks/useTabela.js';
import { pode } from '../../utils/permissoes.js';
import { contem } from '../../utils/relatorios.js';
import { STATUS_ANIMAL, ESPECIES, PORTES, formatarIdade } from '../../utils/format.js';

/**
 * RF04, RF15, RF19: lista de animais da ONG com troca de status e ações.
 * Sprint 07: pesquisa por nome/raça. Sprint 08 (revisão das regras):
 *  - "Adotado" não é mais escolhido à mão: só a conclusão da adoção marca o animal (RN06);
 *  - animal adotado não volta para a lista; voltar de "em processo" para "disponível" pede confirmação;
 *  - remoção com confirmação explicando a RN08.
 */
export default function OngAnimais() {
  const { usuario } = useAuth();
  const toast = useToast();
  const confirmar = useConfirmar();
  const refBusca = useAtalhoBusca();
  const [busca, setBusca] = useState('');
  const termo = useAtrasado(busca);
  const [status, setStatus] = useState('');
  const { dados, carregando, erro, recarregar, setDados } = useAsync(() => listarAnimaisDaOng({ status }), [status]);

  const mudarStatus = async (animal, novo) => {
    if (animal.status === 'em_processo' && novo === 'disponivel') {
      const ok = await confirmar({
        titulo: `Voltar ${animal.nome} para "Disponível"?`,
        mensagem: `${animal.nome} volta a aparecer na lista de adoção e pode receber novos pedidos.`,
        detalhe: 'Se já existe uma adoção aprovada para este animal, conclua ou trate a solicitação antes — o sistema não deixa voltar com uma aprovação em aberto (RN06).',
        acao: 'Voltar para disponível',
      });
      if (!ok) return;
    }
    try {
      await alterarStatusAnimal(animal.id, novo);
      setDados((l) => l.map((a) => (a.id === animal.id ? { ...a, status: novo } : a)));
      toast(`${animal.nome}: ${STATUS_ANIMAL[novo].rotulo.toLowerCase()}.`);
    } catch (e) {
      toast(e.message, 'erro');
    }
  };

  const remover = async (animal) => {
    const ok = await confirmar({
      titulo: `Remover ${animal.nome}?`,
      mensagem: `O anúncio de ${animal.nome} sai da plataforma e deixa de aparecer para os adotantes.`,
      detalhe: 'Animais com solicitações em andamento não podem ser removidos (RN08). O histórico das adoções é mantido.',
      acao: 'Remover anúncio',
      perigo: true,
    });
    if (!ok) return;
    try {
      await removerAnimal(animal.id);
      toast(`${animal.nome} foi removido.`);
      recarregar();
    } catch (e) {
      toast(e.message, 'erro');
    }
  };

  return (
    <div className="container pagina">
      <CabecalhoPagina
        titulo="Meus animais"
        subtitulo="Cadastre, edite e atualize a situação dos animais."
        acoes={pode(usuario, 'animal.cadastrar').permitido && <Link to="/ong/animais/novo" className="btn btn--primario"><Icone nome="mais" tamanho={18} /> Cadastrar animal</Link>}
      />

      <div className="barra-ferramentas">
      <div className="abas abas--linha">
        {[['', 'Todos'], ...Object.entries(STATUS_ANIMAL).map(([k, v]) => [k, v.rotulo])].map(([k, r]) => (
          <button key={k} className={`aba ${status === k ? 'is-ativa' : ''}`} onClick={() => setStatus(k)}>{r}</button>
        ))}
      </div>
        <div className="input-icone">
          <Icone nome="busca" tamanho={18} />
          <input ref={refBusca} type="search" placeholder="Pesquisar nome ou raça… (atalho: /)" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Pesquisar animais" />
        </div>
      </div>

      <Erro erro={erro} onTentar={recarregar} />
      {carregando && !dados ? (
        <Carregando />
      ) : dados?.filter((a) => contem(`${a.nome} ${a.raca}`, termo)).length === 0 ? (
        <Vazio titulo={termo ? `Nenhum animal encontrado para “${termo}”` : 'Nenhum animal aqui'} texto={termo ? 'Tente outro nome ou raça.' : 'Cadastre um animal para ele aparecer para os adotantes.'} />
      ) : (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Animal</th>
                <th>Características</th>
                <th>Situação</th>
                <th className="direita">Ações</th>
              </tr>
            </thead>
            <tbody>
              {dados?.filter((a) => contem(`${a.nome} ${a.raca}`, termo)).map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="celula-animal">
                      <img src={a.fotos?.[0]} alt="" className="miniatura" />
                      <div>
                        <strong>{a.nome}</strong>
                        <span className="texto-suave">{a.raca}</span>
                      </div>
                    </div>
                  </td>
                  <td className="texto-suave">{ESPECIES[a.especie]} · {PORTES[a.porte]} · {formatarIdade(a.idadeMeses)}</td>
                  <td>
                    <select
                      value={a.status}
                      onChange={(e) => mudarStatus(a, e.target.value)}
                      aria-label={`Situação de ${a.nome}`}
                      className={`select-status status--${STATUS_ANIMAL[a.status].tom}`}
                      disabled={a.status === 'adotado'}
                      title={a.status === 'adotado' ? 'Adoção concluída: a situação não muda mais.' : '"Adotado" é marcado automaticamente quando você conclui a adoção.'}
                    >
                      {Object.entries(STATUS_ANIMAL).map(([k, v]) => (
                        <option key={k} value={k} disabled={k === 'adotado' && a.status !== 'adotado'}>
                          {v.rotulo}{k === 'adotado' && a.status !== 'adotado' ? ' (pela conclusão)' : ''}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="direita">
                    <div className="acoes-linha">
                      <Link to={`/animais/${a.id}`} className="btn-icone" title="Ver página pública"><Icone nome="seta" tamanho={18} /></Link>
                      <Link to={`/ong/animais/${a.id}/editar`} className="btn-icone" title="Editar"><Icone nome="editar" tamanho={18} /></Link>
                      <button className="btn-icone btn-icone--perigo" title="Remover" onClick={() => remover(a)}><Icone nome="lixo" tamanho={18} /></button>
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
