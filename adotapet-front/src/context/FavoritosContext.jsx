import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { idsFavoritos, alternarFavorito } from '../api/animais.js';
import { useAuth } from './AuthContext.jsx';
import { useToast } from './ToastContext.jsx';

const FavoritosContext = createContext(null);

/** Mantém os IDs favoritados em memória para todos os corações da tela ficarem sincronizados. */
export function FavoritosProvider({ children }) {
  const { usuario } = useAuth();
  const toast = useToast();
  const [ids, setIds] = useState(new Set());

  useEffect(() => {
    if (usuario?.perfil !== 'adotante') {
      setIds(new Set());
      return;
    }
    idsFavoritos().then((lista) => setIds(new Set(lista))).catch(() => {});
  }, [usuario]);

  const alternar = useCallback(
    async (animalId) => {
      // Atualização otimista: muda na hora e desfaz se a API falhar.
      setIds((s) => {
        const n = new Set(s);
        n.has(animalId) ? n.delete(animalId) : n.add(animalId);
        return n;
      });
      try {
        const { favorito } = await alternarFavorito(animalId);
        toast(favorito ? 'Adicionado aos favoritos' : 'Removido dos favoritos');
      } catch (e) {
        setIds((s) => {
          const n = new Set(s);
          n.has(animalId) ? n.delete(animalId) : n.add(animalId);
          return n;
        });
        toast(e.message, 'erro');
      }
    },
    [toast],
  );

  return (
    <FavoritosContext.Provider value={{ ids, alternar, ehFavorito: (id) => ids.has(id) }}>{children}</FavoritosContext.Provider>
  );
}

export const useFavoritos = () => useContext(FavoritosContext);
