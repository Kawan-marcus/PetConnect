import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { FavoritosProvider } from './context/FavoritosContext.jsx';
import './styles/global.css';

// HashRouter (#/rota) só é usado se o site for publicado num servidor sem configuração de rotas.
const Router = import.meta.env.VITE_HASH_ROUTER === 'true' ? HashRouter : BrowserRouter;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <ToastProvider>
        <AuthProvider>
          <FavoritosProvider>
            <App />
          </FavoritosProvider>
        </AuthProvider>
      </ToastProvider>
    </Router>
  </StrictMode>,
);
