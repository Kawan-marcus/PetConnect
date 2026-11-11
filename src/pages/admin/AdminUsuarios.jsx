import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CabecalhoPagina } from '../../components/Layout.jsx';
import Carregando, { Erro, Vazio } from '../../components/Carregando.jsx';
import Badge from '../../components/Badge.jsx';
import Icone from '../../components/Icone.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { listarUsuarios, atualizarUsuario } from '../../api/admin.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useConfirmar } from '../../context/ConfirmarContext.jsx';
import { useAtalhoBusca } from '../../hooks/useTabela.js';
import { pode } from '../../utils/permissoes.js';
import { PERFIS, formatarData } from '../../utils/format.js';

/**
 * RF17: gerenciamento de usuários.
 * Sprint 08: o administrador não consegue desativar a própria conta (botão desabilitado com o motivo)
 * e a desativação pede confirmação explicando o efeito.
 */
export default function AdminUsuarios() {
  const toast = useToast();
  const { usuario: eu } = useAuth();
  const confirmar = useConfirmar();
  const [params] = useSearchParams();
  const refBusca = useAtalhoBusca();
  const [perfil, setPerfil] = useState('');
  const [busca, setBusca] = useState(params.get('busca') || '');
  const [buscaAtiva, setBuscaAtiva] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setBuscaAtiva(busca), 300);
    return () => clearTimeout(t);
  }, [busca]);

  const { dados, carregando, erro, recarregar, setDados } = useAsync(() => listarUsuarios({ perfil, busca: buscaAtiva }), [perfil, buscaAtiva]);

  const alternarAtivo = async (u) => {
    if (u.ativo) {
      const ok = await confirmar({
        titulo: `Desativar ${u.nome}?`,
        mensagem: `${u.nome} não vai mais conseguir entrar no PetConnect.`,
        detalhe: 'Os dados e o histórico da conta são mantidos. Você pode reativar quando quiser.',
        acao: 'Desativar conta',
        perigo: true,
      });
      if (!ok) return;
    }
    try {
      const novo = await atualizarUsuario(u.id, { ativo: !u.ativo });
      setDados((l) => l.map((x) => (x.id === u.id ? { ...x, ...novo } : x)));
      toast(`${u.nome} ${novo.ativo ? 'reativado' : 'desativado'}.`);
    } catch (e) {
      toast(e.message, 'erro');
    }
  };

  return (
    <div className="container pagina">
      <CabecalhoPagina titulo="Usuários" subtitulo="Visualize e gerencie as contas da plataforma." />
      <div className="barra-busca">
        <div className="input-icone">
          <Icone nome="busca" tamanho={18} />
           <input ref={refBusca} type="search" placeholder="Buscar por nome ou e-mail… (atalho: /)" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar usuários" />
        </div>
        <select value={perfil} onChange={(e) => setPerfil(e.target.value)} aria-label="Filtrar por perfil">
          <option value="">Todos os perfis</option>
          {Object.entries(PERFIS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <Erro erro={erro} onTentar={recarregar} />
      {carregando && !dados ? <Carregando /> : dados?.length === 0 ? <Vazio titulo="Nenhum usuário encontrado" /> : (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead><tr><th>Nome</th><th>Perfil</th><th>Cidade</th><th>Cadastro</th><th>Situação</th><th className="direita">Ação</th></tr></thead>
            <tbody>
              {dados?.map((u) => (
                <tr key={u.id} className={u.ativo ? '' : 'is-inativo'}>
                  <td><strong>{u.nome}</strong><span className="texto-suave bloco">{u.email}</span></td>
                  <td><Badge tom={u.perfil === 'admin' ? 'azul' : u.perfil === 'ong' ? 'amarelo' : 'cinza'}>{PERFIS[u.perfil]}</Badge></td>
                  <td className="texto-suave">{u.cidade || '—'}</td>
                  <td className="texto-suave">{formatarData(u.criadoEm)}</td>
                  <td>{u.ativo ? <Badge tom="verde">Ativo</Badge> : <Badge tom="vermelho">Desativado</Badge>}</td>
                  <td className="direita">
                    {(() => {
                      const { permitido, motivo } = pode(eu, 'usuario.ativar', { alvo: u });
                      return (
                        <button className={`btn ${u.ativo ? 'btn--perigo-suave' : 'btn--fantasma'}`} onClick={() => alternarAtivo(u)} disabled={!permitido} title={motivo || undefined}>
                          {u.ativo ? 'Desativar' : 'Reativar'}
                        </button>
                      );
                    })()}
                    {u.id === eu?.id && <span className="texto-suave bloco texto-pequeno">Sua conta</span>}
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
