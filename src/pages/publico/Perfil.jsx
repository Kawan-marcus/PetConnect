import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CabecalhoPagina } from '../../components/Layout.jsx';
import Campo from '../../components/Campo.jsx';
import { Erro } from '../../components/Carregando.jsx';
import { StatusBadge } from '../../components/Badge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useFormulario } from '../../hooks/useFormulario.js';
import { atualizarPerfil } from '../../api/auth.js';
import { PERFIS } from '../../utils/format.js';
import Icone from '../../components/Icone.jsx';
import { acoesDoPerfil, pode } from '../../utils/permissoes.js';

export default function Perfil() {
  const { usuario, recarregar } = useAuth();
  const toast = useToast();
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const f = useFormulario(
    { nome: usuario.nome, telefone: usuario.telefone || '', cidade: usuario.cidade || '', novaSenha: '' },
    (v) => ({
      nome: !v.nome && 'Informe o nome.',
      novaSenha: v.novaSenha && v.novaSenha.length < 6 && 'Mínimo de 6 caracteres.',
    }),
  );

  const salvar = async (v) => {
    setErro(null);
    setEnviando(true);
    try {
      await atualizarPerfil(v);
      await recarregar();
      f.set('novaSenha', '');
      toast('Perfil atualizado.');
    } catch (e) {
      setErro(e);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="container pagina pagina--estreita">
      <CabecalhoPagina titulo="Meu perfil" subtitulo={`${usuario.email} · ${PERFIS[usuario.perfil]}`} />

      {usuario.ong && (
        <div className="card card--linha">
          <div>
            <strong>{usuario.ong.nome}</strong>
            <p className="texto-suave">CNPJ {usuario.ong.cnpj} · {usuario.ong.cidade}</p>
          </div>
          <StatusBadge tipo="ong" status={usuario.ong.status} />
        </div>
      )}

      <form className="card form" onSubmit={f.enviar(salvar)} noValidate>
        <Erro erro={erro} />
        <Campo rotulo="Nome" erro={f.erros.nome}>
          <input {...f.campo('nome')} />
        </Campo>
        <div className="grade-2">
          <Campo rotulo="Telefone">
            <input type="tel" {...f.campo('telefone')} />
          </Campo>
          <Campo rotulo="Cidade">
            <input {...f.campo('cidade')} />
          </Campo>
        </div>
        <Campo rotulo="Nova senha" ajuda="Deixe em branco para manter a atual." erro={f.erros.novaSenha}>
          <input type="password" autoComplete="new-password" {...f.campo('novaSenha')} />
        </Campo>
        <div className="form__acoes">
          {usuario.perfil === 'adotante' && <Link to="/formulario" className="btn btn--fantasma">Editar formulário de avaliação</Link>}
          <button className="btn btn--primario" disabled={enviando}>{enviando ? 'Salvando…' : 'Salvar alterações'}</button>
        </div>
      </form>

      {/* Sprint 08: o usuário vê com clareza o que o perfil dele permite */}
      <section className="card">
        <h2><Icone nome="escudo" tamanho={18} /> O que você pode fazer</h2>
        <p className="texto-suave">Seu perfil é <strong>{PERFIS[usuario.perfil]}</strong>. Estas são as funções liberadas para você:</p>
        <ul className="lista-permissoes">
          {acoesDoPerfil(usuario.perfil).map((a) => {
            const { permitido, motivo } = pode(usuario, a.id);
            return (
              <li key={a.id} className={permitido ? '' : 'is-bloqueada'}>
                <Icone nome={permitido ? 'check' : 'cadeado'} tamanho={16} />
                <span>{a.rotulo}{a.observacao ? <span className="texto-suave"> — {a.observacao}</span> : null}{!permitido && <span className="bloco texto-suave">{motivo}</span>}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
