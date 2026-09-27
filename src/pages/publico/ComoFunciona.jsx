import { Link } from 'react-router-dom';
import { CabecalhoPagina } from '../../components/Layout.jsx';

const PASSOS = [
  ['Crie sua conta', 'Cadastro rápido com nome, e-mail e cidade.'],
  ['Preencha o formulário de avaliação', 'Conte sobre sua casa e sua rotina. Ele vale para todas as solicitações e alimenta o cálculo de compatibilidade.'],
  ['Explore e favorite', 'Use os filtros por espécie, porte, idade e sexo, ou veja a lista “Recomendados para você”.'],
  ['Solicite a adoção', 'A ONG recebe sua solicitação junto com o índice de compatibilidade.'],
  ['Acompanhe o status', 'Pendente → Em análise → Aprovada → Adoção concluída. Você recebe notificações a cada etapa.'],
  ['Pós-adoção', 'A ONG registra visitas e contatos de acompanhamento para garantir o bem-estar do animal.'],
];

export default function ComoFunciona() {
  return (
    <div className="container pagina pagina--estreita">
      <CabecalhoPagina titulo="Como funciona" subtitulo="Da busca ao acompanhamento pós-adoção." />
      <ol className="passos">
        {PASSOS.map(([t, d], i) => (
          <li key={t} className="passo">
            <span className="passo__num">{i + 1}</span>
            <div>
              <h3>{t}</h3>
              <p className="texto-suave">{d}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="alerta alerta--info">
        <span>
          <strong>Regras importantes:</strong> só é possível solicitar a adoção depois de preencher o formulário; cada pessoa pode ter
          apenas uma solicitação ativa por animal; e quando uma solicitação é aprovada, as demais para o mesmo animal são encerradas.
        </span>
      </div>
      <Link to="/cadastro" className="btn btn--primario">Criar minha conta</Link>
    </div>
  );
}
