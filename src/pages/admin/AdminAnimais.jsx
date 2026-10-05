import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CabecalhoPagina } from '../../components/Layout.jsx';
import Carregando, { Erro, Vazio } from '../../components/Carregando.jsx';
import { StatusBadge } from '../../components/Badge.jsx';
import Icone from '../../components/Icone.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { listarTodosAnimais, removerAnimalAdmin } from '../../api/admin.js';
import { useToast } from '../../context/ToastContext.jsx';
import { STATUS_ANIMAL, ESPECIES, formatarData } from '../../utils/format.js';

/** RF19: visão de todos os animais, de todas as ONGs. */
export default function AdminAnimais() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [especie, setEspecie] = useState('');
  const { dados, carregando, erro, recarregar } = useAsync(() => listarTodosAnimais({ status, especie }), [status, especie]);

  const remover = async (a) => {
    if (!window.confirm(`Remover ${a.nome} (${a.ong.nome})?`)) return;
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
      <CabecalhoPagina titulo="Animais" subtitulo={dados ? `${dados.length} cadastrados em todas as ONGs` : ' '} />
      <div className="barra-busca">
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Situação">
          <option value="">Todas as situações</option>
          {Object.entries(STATUS_ANIMAL).map(([k, v]) => <option key={k} value={k}>{v.rotulo}</option>)}
        </select>
        <select value={especie} onChange={(e) => setEspecie(e.target.value)} aria-label="Espécie">
          <option value="">Todas as espécies</option>
          {Object.entries(ESPECIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <Erro erro={erro} onTentar={recarregar} />
      {carregando && !dados ? <Carregando /> : dados?.length === 0 ? <Vazio titulo="Nenhum animal encontrado" /> : (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead><tr><th>Animal</th><th>ONG</th><th>Cadastro</th><th>Situação</th><th className="direita">Ações</th></tr></thead>
            <tbody>
              {dados?.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="celula-animal">
                      <img src={a.fotos?.[0]} alt="" className="miniatura" />
                      <div><strong>{a.nome}</strong><span className="texto-suave bloco">{ESPECIES[a.especie]} · {a.raca}</span></div>
                    </div>
                  </td>
                  <td>{a.ong?.nome}</td>
                  <td className="texto-suave">{formatarData(a.criadoEm)}</td>
                  <td><StatusBadge tipo="animal" status={a.status} /></td>
                  <td className="direita">
                    <div className="acoes-linha">
                      <Link to={`/animais/${a.id}`} className="btn-icone" title="Ver"><Icone nome="seta" tamanho={18} /></Link>
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
