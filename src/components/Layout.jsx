import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Icone, { Patinha } from './Icone.jsx';
import ErroFatal from './ErroFatal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { listarNotificacoes, marcarNotificacoesLidas } from '../api/notificacoes.js';
import { USE_MOCK } from '../api/client.js';
import { resetarMock } from '../api/mock/handlers.js';
import { PERFIS, tempoRelativo } from '../utils/format.js';

const LINKS = {
  visitante: [
    { to: '/animais', rotulo: 'Adotar' },
    { to: '/como-funciona', rotulo: 'Como funciona' },
  ],
  adotante: [
    { to: '/animais', rotulo: 'Adotar' },
    { to: '/recomendados', rotulo: 'Recomendados' },
    { to: '/favoritos', rotulo: 'Favoritos' },
    { to: '/minhas-solicitacoes', rotulo: 'Minhas solicitações' },
  ],
  ong: [
    { to: '/ong', rotulo: 'Painel', end: true },
    { to: '/ong/animais', rotulo: 'Meus animais' },
    { to: '/ong/solicitacoes', rotulo: 'Solicitações' },
    { to: '/ong/acompanhamentos', rotulo: 'Pós-adoção' },
  ],
  admin: [
    { to: '/admin', rotulo: 'Dashboard', end: true },
    { to: '/admin/ongs', rotulo: 'ONGs' },
    { to: '/admin/usuarios', rotulo: 'Usuários' },
    { to: '/admin/animais', rotulo: 'Animais' },
    { to: '/admin/historico', rotulo: 'Histórico' },
  ],
};

function Notificacoes() {
  const [aberto, setAberto] = useState(false);
  const [itens, setItens] = useState([]);
  const ref = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    listarNotificacoes().then(setItens).catch(() => {});
  }, [location.pathname]);

  useEffect(() => {
    const fora = (e) => ref.current && !ref.current.contains(e.target) && setAberto(false);
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, []);

  const naoLidas = itens.filter((n) => !n.lida).length;

  const abrir = async () => {
    setAberto((a) => !a);
    if (!aberto && naoLidas) {
      await marcarNotificacoesLidas().catch(() => {});
      setTimeout(() => setItens((l) => l.map((n) => ({ ...n, lida: true }))), 1500);
    }
  };

  return (
    <div className="dropdown" ref={ref}>
      <button className="btn-icone" onClick={abrir} aria-label={`Notificações (${naoLidas} não lidas)`} aria-expanded={aberto}>
        <Icone nome="sino" />
        {naoLidas > 0 && <span className="contador">{naoLidas}</span>}
      </button>
      {aberto && (
        <div className="dropdown__menu dropdown__menu--largo">
          <p className="dropdown__titulo">Notificações</p>
          {itens.length === 0 && <p className="texto-suave dropdown__vazio">Nada por aqui ainda.</p>}
          {itens.slice(0, 8).map((n) => (
            <button
              key={n.id}
              className={`notificacao ${n.lida ? '' : 'is-nova'}`}
              onClick={() => {
                setAberto(false);
                if (n.link) navigate(n.link);
              }}
            >
              <span>{n.texto}</span>
              <span className="texto-suave">{tempoRelativo(n.data)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MenuUsuario({ usuario, onSair }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const fora = (e) => ref.current && !ref.current.contains(e.target) && setAberto(false);
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, []);
  const iniciais = usuario.nome.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="dropdown" ref={ref}>
      <button className="avatar-btn" onClick={() => setAberto((a) => !a)} aria-expanded={aberto} aria-label="Menu do usuário">
        <span className="avatar">{iniciais}</span>
      </button>
      {aberto && (
        <div className="dropdown__menu">
          <div className="dropdown__cabecalho">
            <strong>{usuario.nome}</strong>
            <span className="texto-suave">{PERFIS[usuario.perfil]}{usuario.ong ? ` · ${usuario.ong.nome}` : ''}</span>
          </div>
          <Link className="dropdown__item" to="/perfil" onClick={() => setAberto(false)}>
            <Icone nome="usuario" tamanho={16} /> Meu perfil
          </Link>
          {usuario.perfil === 'adotante' && (
            <Link className="dropdown__item" to="/formulario" onClick={() => setAberto(false)}>
              <Icone nome="formulario" tamanho={16} /> Formulário de avaliação
            </Link>
          )}
          <button className="dropdown__item" onClick={onSair}>
            <Icone nome="sair" tamanho={16} /> Sair
          </button>
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuMobile, setMenuMobile] = useState(false);
  const links = LINKS[usuario?.perfil || 'visitante'];

  useEffect(() => {
    setMenuMobile(false);
    window.scrollTo?.(0, 0);
  }, [location.pathname]);

  const sair = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="app">
      {USE_MOCK && (
        <div className="faixa-mock">
          Modo demonstração: dados simulados no navegador.
          <button
            className="btn btn--link"
            onClick={() => {
              resetarMock();
              logout();
              navigate('/');
              window.location.reload();
            }}
          >
            Restaurar dados de exemplo
          </button>
        </div>
      )}
      <header className="topo">
        <div className="container topo__conteudo">
          <Link to="/" className="logo">
            <Patinha /> <span>PetConnect</span>
          </Link>

          <nav className={`nav ${menuMobile ? 'is-aberto' : ''}`} aria-label="Principal">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `nav__link ${isActive ? 'is-ativo' : ''}`}>
                {l.rotulo}
              </NavLink>
            ))}
          </nav>

          <div className="topo__acoes">
            {usuario ? (
              <>
                <Notificacoes />
                <MenuUsuario usuario={usuario} onSair={sair} />
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn--fantasma">Entrar</Link>
                <Link to="/cadastro" className="btn btn--primario esconder-mobile">Criar conta</Link>
              </>
            )}
            <button className="btn-icone mostrar-mobile" onClick={() => setMenuMobile((m) => !m)} aria-label="Abrir menu" aria-expanded={menuMobile}>
              <Icone nome={menuMobile ? 'x' : 'menu'} />
            </button>
          </div>
        </div>
      </header>

      <main className="principal">
        <ErroFatal chave={location.pathname}>
          <Outlet />
        </ErroFatal>
      </main>

      <footer className="rodape">
        <div className="container rodape__conteudo">
          <div className="logo logo--pequeno">
            <Patinha tamanho={22} /> <span>PetConnect</span>
          </div>
          <p className="texto-suave">Projeto acadêmico · Fábrica de Software & Tópicos Avançados · 2026.2</p>
        </div>
      </footer>
    </div>
  );
}

/** Cabeçalho padrão das páginas internas. */
export function CabecalhoPagina({ titulo, subtitulo, acoes, voltar }) {
  const navigate = useNavigate();
  return (
    <div className="cabecalho-pagina">
      <div>
        {voltar && (
          <button className="btn btn--link voltar" onClick={() => navigate(voltar === true ? -1 : voltar)}>
            <Icone nome="voltar" tamanho={16} /> Voltar
          </button>
        )}
        <h1>{titulo}</h1>
        {subtitulo && <p className="texto-suave">{subtitulo}</p>}
      </div>
      {acoes && <div className="cabecalho-pagina__acoes">{acoes}</div>}
    </div>
  );
}
