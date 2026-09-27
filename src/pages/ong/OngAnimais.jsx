import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CabecalhoPagina } from '../../components/Layout.jsx';
import Carregando, { Erro, Vazio } from '../../components/Carregando.jsx';
import Icone from '../../components/Icone.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { listarAnimaisDaOng, alterarStatusAnimal, removerAnimal } from '../../api/animais.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { STATUS_ANIMAL, ESPECIES, PORTES, formatarIdade } from '../../utils/format.js';

/** RF04, RF15, RF19: lista de animais da ONG com troca de status e ações. */
export default function OngAnimais() {
  const { usuario } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState('');
  const { dados, carregando, erro, recarregar, setDados } = useAsync(() => listarAnimaisDaOng({ status }), [status]);

  const mudarStatus = async (animal, novo) => {
    try {
      await alterarStatusAnimal(animal.id, novo);
      setDados((l) => l.map((a) => (a.id === animal.id ? { ...a, status: novo } : a)));
      toast(`${animal.nome}: ${STATUS_ANIMAL[novo].rotulo.toLowerCase()}.`);
    } catch (e) {
      toast(e.message, 'erro');
    }
  };

  const remover = async (animal) => {
    if (!window.confirm(`Remover ${animal.nome} da plataforma? Esta ação não pode ser desfeita.`)) return;
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
        acoes={usuario.ong?.status === 'aprovada' && <Link to="/ong/animais/novo" className="btn btn--primario"><Icone nome="mais" tamanho={18} /> Cadastrar animal</Link>}
      />

      <div className="abas abas--linha">
        {[['', 'Todos'], ...Object.entries(STATUS_ANIMAL).map(([k, v]) => [k, v.rotulo])].map(([k, r]) => (
          <button key={k} className={`aba ${status === k ? 'is-ativa' : ''}`} onClick={() => setStatus(k)}>{r}</button>
        ))}
      </div>

      <Erro erro={erro} onTentar={recarregar} />
      {carregando && !dados ? (
        <Carregando />
      ) : dados?.length === 0 ? (
        <Vazio titulo="Nenhum animal aqui" texto="Cadastre um animal para ele aparecer para os adotantes." />
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
              {dados?.map((a) => (
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
                    <select value={a.status} onChange={(e) => mudarStatus(a, e.target.value)} aria-label={`Situação de ${a.nome}`} className={`select-status status--${STATUS_ANIMAL[a.status].tom}`}>
                      {Object.entries(STATUS_ANIMAL).map(([k, v]) => <option key={k} value={k}>{v.rotulo}</option>)}
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
