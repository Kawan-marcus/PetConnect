import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import Campo from '../../components/Campo.jsx';
import { Erro } from '../../components/Carregando.jsx';
import { Patinha } from '../../components/Icone.jsx';
import { useAuth, rotaInicial } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useFormulario, validadores } from '../../hooks/useFormulario.js';
import { cadastrarAdotante, cadastrarOng } from '../../api/auth.js';

function validarComum(v) {
  return {
    email: validadores.email(v.email),
    senha: validadores.senha(v.senha),
    confirmar: v.confirmar !== v.senha && 'As senhas não conferem.',
    telefone: !v.telefone && 'Informe um telefone.',
    cidade: !v.cidade && 'Informe a cidade.',
  };
}

export default function Cadastro() {
  const [params, setParams] = useSearchParams();
  const tipo = params.get('tipo') === 'ong' ? 'ong' : 'adotante';
  const { usuario, entrar } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const f = useFormulario(
    { nome: '', nomeOng: '', nomeResponsavel: '', cnpj: '', descricao: '', email: '', telefone: '', cidade: '', senha: '', confirmar: '', termos: false },
    (v) => ({
      ...validarComum(v),
      ...(tipo === 'adotante'
        ? { nome: !v.nome && 'Informe seu nome.' }
        : {
            nomeOng: !v.nomeOng && 'Informe o nome da ONG.',
            nomeResponsavel: !v.nomeResponsavel && 'Informe o responsável.',
            cnpj: !/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/.test(v.cnpj) && 'CNPJ inválido (00.000.000/0000-00).',
          }),
      termos: !v.termos && 'É preciso aceitar os termos.',
    }),
  );

  if (usuario) return <Navigate to={rotaInicial(usuario)} replace />;

  const enviar = async (v) => {
    setErro(null);
    setEnviando(true);
    try {
      const resp = tipo === 'ong' ? await cadastrarOng(v) : await cadastrarAdotante(v);
      const u = await entrar(resp);
      toast(tipo === 'ong' ? 'ONG cadastrada! Aguarde a aprovação do administrador.' : 'Conta criada! Preencha o formulário de avaliação.');
      navigate(tipo === 'ong' ? rotaInicial(u) : '/formulario', { replace: true });
    } catch (e) {
      setErro(e);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="auth">
      <form className="auth__card auth__card--largo" onSubmit={f.enviar(enviar)} noValidate>
        <div className="auth__marca">
          <Patinha tamanho={40} />
          <h1>Criar conta</h1>
        </div>

        <div className="abas" role="tablist">
          <button type="button" role="tab" aria-selected={tipo === 'adotante'} className={`aba ${tipo === 'adotante' ? 'is-ativa' : ''}`} onClick={() => setParams({})}>
            Quero adotar
          </button>
          <button type="button" role="tab" aria-selected={tipo === 'ong'} className={`aba ${tipo === 'ong' ? 'is-ativa' : ''}`} onClick={() => setParams({ tipo: 'ong' })}>
            Sou ONG / protetor
          </button>
        </div>

        <Erro erro={erro} />

        {tipo === 'adotante' ? (
          <Campo rotulo="Nome completo" erro={f.erros.nome}>
            <input autoComplete="name" {...f.campo('nome')} />
          </Campo>
        ) : (
          <>
            <div className="grade-2">
              <Campo rotulo="Nome da ONG" erro={f.erros.nomeOng}>
                <input {...f.campo('nomeOng')} />
              </Campo>
              <Campo rotulo="CNPJ" erro={f.erros.cnpj}>
                <input placeholder="00.000.000/0000-00" {...f.campo('cnpj')} />
              </Campo>
            </div>
            <Campo rotulo="Nome do responsável" erro={f.erros.nomeResponsavel}>
              <input autoComplete="name" {...f.campo('nomeResponsavel')} />
            </Campo>
            <Campo rotulo="Sobre a ONG" ajuda="Opcional. Aparece para os adotantes.">
              <textarea rows={3} {...f.campo('descricao')} />
            </Campo>
          </>
        )}

        <div className="grade-2">
          <Campo rotulo="E-mail" erro={f.erros.email}>
            <input type="email" autoComplete="email" {...f.campo('email')} />
          </Campo>
          <Campo rotulo="Telefone" erro={f.erros.telefone}>
            <input type="tel" autoComplete="tel" placeholder="(62) 90000-0000" {...f.campo('telefone')} />
          </Campo>
        </div>
        <Campo rotulo="Cidade" erro={f.erros.cidade}>
          <input placeholder="Goiânia - GO" {...f.campo('cidade')} />
        </Campo>
        <div className="grade-2">
          <Campo rotulo="Senha" erro={f.erros.senha}>
            <input type="password" autoComplete="new-password" {...f.campo('senha')} />
          </Campo>
          <Campo rotulo="Confirmar senha" erro={f.erros.confirmar}>
            <input type="password" autoComplete="new-password" {...f.campo('confirmar')} />
          </Campo>
        </div>

        <label className={`checkbox ${f.erros.termos ? 'campo--erro' : ''}`}>
          <input type="checkbox" {...f.campo('termos', 'checkbox')} />
          <span>Li e aceito os termos de uso e a política de privacidade.</span>
        </label>
        {f.erros.termos && <span className="campo__erro">{f.erros.termos}</span>}

        {tipo === 'ong' && (
          <p className="alerta alerta--info">Após o cadastro, a ONG passa pela aprovação do administrador antes de publicar animais.</p>
        )}

        <button className="btn btn--primario btn--bloco" disabled={enviando}>
          {enviando ? 'Criando conta…' : 'Criar conta'}
        </button>
        <p className="centro texto-suave">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </form>
    </div>
  );
}
