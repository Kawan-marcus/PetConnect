import { useState } from 'react';
import { Link } from 'react-router-dom';
import Campo from '../../components/Campo.jsx';
import { Erro } from '../../components/Carregando.jsx';
import { Patinha } from '../../components/Icone.jsx';
import { useFormulario, validadores } from '../../hooks/useFormulario.js';
import { recuperarSenha } from '../../api/auth.js';

export default function RecuperarSenha() {
  const [mensagem, setMensagem] = useState(null);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const f = useFormulario({ email: '' }, (v) => ({ email: validadores.email(v.email) }));

  const enviar = async ({ email }) => {
    setErro(null);
    setEnviando(true);
    try {
      const r = await recuperarSenha(email);
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
          <h1>Recuperar senha</h1>
          <p className="texto-suave">Enviaremos um link para redefinir sua senha.</p>
        </div>
        <Erro erro={erro} />
        {mensagem ? (
          <p className="alerta alerta--sucesso">{mensagem}</p>
        ) : (
          <>
            <Campo rotulo="E-mail" erro={f.erros.email}>
              <input type="email" autoComplete="email" {...f.campo('email')} />
            </Campo>
            <button className="btn btn--primario btn--bloco" disabled={enviando}>
              {enviando ? 'Enviando…' : 'Enviar link'}
            </button>
          </>
        )}
        <p className="centro">
          <Link to="/login">Voltar para o login</Link>
        </p>
      </form>
    </div>
  );
}
