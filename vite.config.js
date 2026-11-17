import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// O proxy evita problemas de CORS em desenvolvimento:
// chamadas para /api vão para o back-end Python (FastAPI) na porta 8000.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
