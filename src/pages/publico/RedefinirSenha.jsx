import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Campo from '../../components/Campo.jsx';
import { Erro } from '../../components/Carregando.jsx';
import { Patinha } from '../../components/Icone.jsx';
import { useFormulario, validadores } from '../../hooks/useFormulario.js';
import { redefinirSenha } from '../../api/auth.js';

/** Página aberta pelo link de "Esqueci minha senha" (/redefinir-senha?token=...). */
export default function RedefinirSenha() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [mensagem, setMensagem] = useState(null);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const f = useFormulario({ senha: '', confirmar: '' }, (v) => ({
    senha: validadores.senha(v.senha),
    confirmar: v.confirmar !== v.senha && 'As senhas não conferem.',
  }));

  const enviar = async ({ senha }) => {
    setErro(null);
    setEnviando(true);
    try {
      const r = await redefinirSenha(token, senha);
      setMensagem(r.mensagem);
    } catch (e) {
      setErro(e);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="auth">
      <form className="auth__card" onSubmit={f.enviar(enviar)} noValidate>
        <div className="auth__marca">
          <Patinha tamanho={40} />
          <h1>Nova senha</h1>
          <p className="texto-suave">Escolha uma senha com pelo menos 6 caracteres.</p>
        </div>
        {!token && <p className="alerta alerta--erro">Link inválido. Solicite um novo em “Esqueci minha senha”.</p>}
        <Erro erro={erro} />
        {mensagem ? (
          <>
            <p className="alerta alerta--sucesso">{mensagem}</p>
            <Link to="/login" className="btn btn--primario btn--bloco">Ir para o login</Link>
          </>
        ) : (
          <>
            <Campo rotulo="Nova senha" erro={f.erros.senha}>
              <input type="password" autoComplete="new-password" {...f.campo('senha')} />
            </Campo>
            <Campo rotulo="Confirmar nova senha" erro={f.erros.confirmar}>
              <input type="password" autoComplete="new-password" {...f.campo('confirmar')} />
            </Campo>
            <button className="btn btn--primario btn--bloco" disabled={enviando || !token}>
              {enviando ? 'Salvando…' : 'Redefinir senha'}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
