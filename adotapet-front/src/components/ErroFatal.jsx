import { Component } from 'react';

/** Se uma tela quebrar, mostra uma mensagem em vez de deixar a página em branco. */
export default class ErroFatal extends Component {
  state = { erro: null };

  static getDerivedStateFromError(erro) {
    return { erro };
  }

  componentDidCatch(erro, info) {
    console.error('Erro na tela:', erro, info.componentStack);
  }

  componentDidUpdate(anterior) {
    // Ao trocar de página, tenta renderizar de novo.
    if (anterior.chave !== this.props.chave && this.state.erro) this.setState({ erro: null });
  }

  render() {
    if (!this.state.erro) return this.props.children;
    return (
      <div className="container pagina">
        <div className="vazio">
          <div className="vazio__icone" aria-hidden="true">🙀</div>
          <h3>Algo deu errado nesta tela</h3>
          <p>{this.state.erro.message}</p>
          <button className="btn btn--primario" onClick={() => this.setState({ erro: null })}>Tentar de novo</button>
        </div>
      </div>
    );
  }
}
