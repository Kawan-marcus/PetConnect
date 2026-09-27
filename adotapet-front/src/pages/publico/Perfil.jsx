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
    </div>
  );
}
