import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Campo from '../../components/Campo.jsx';
import { Erro } from '../../components/Carregando.jsx';
import { Patinha } from '../../components/Icone.jsx';
import { useAuth, rotaInicial } from '../../context/AuthContext.jsx';
import { useFormulario, validadores } from '../../hooks/useFormulario.js';
import { USE_MOCK } from '../../api/client.js';

const CONTAS_DEMO = [
  { rotulo: 'Adotante', email: 'ana@email.com' },
  { rotulo: 'ONG', email: 'ong@patinhas.org' },
  { rotulo: 'Admin', email: 'admin@adotapet.com' },
];

export default function Login() {
  const { usuario, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const f = useFormulario({ email: '', senha: '' }, (v) => ({
    email: validadores.email(v.email),
    senha: !v.senha && 'Informe a senha.',
  }));

  if (usuario) return <Navigate to={rotaInicial(usuario)} replace />;

  const entrar = async ({ email, senha }) => {
    setErro(null);
    setEnviando(true);
    try {
      const u = await login(email, senha);
      const destino = location.state?.de;
      navigate(destino && destino !== '/login' ? destino : rotaInicial(u), { replace: true });
    } catch (e) {
      setErro(e);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="auth">
      <form className="auth__card" onSubmit={f.enviar(entrar)} noValidate>
        <div className="auth__marca">
          <Patinha tamanho={40} />
          <h1>Entrar</h1>
          <p className="texto-suave">Bem-vindo de volta ao AdotaPet.</p>
        </div>

        <Erro erro={erro} />

        <Campo rotulo="E-mail" erro={f.erros.email}>
          <input type="email" autoComplete="email" {...f.campo('email')} />
        </Campo>
        <Campo rotulo="Senha" erro={f.erros.senha}>
          <input type="password" autoComplete="current-password" {...f.campo('senha')} />
        </Campo>

        <div className="auth__linha">
          <Link to="/recuperar-senha" className="btn btn--link">Esqueci minha senha</Link>
        </div>

        <button className="btn btn--primario btn--bloco" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>

        <p className="centro texto-suave">
          Ainda não tem conta? <Link to="/cadastro">Cadastre-se</Link>
        </p>

        {USE_MOCK && (
          <div className="demo-contas">
            <p className="texto-suave">Contas de demonstração (senha 123456):</p>
            <div className="pilulas">
              {CONTAS_DEMO.map((c) => (
                <button
                  key={c.email}
                  type="button"
                  className="pilula"
                  onClick={() => f.setValores({ email: c.email, senha: '123456' })}
                >
                  {c.rotulo}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
