import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
  host: true,
  proxy: {
    '/api': {
      target: 'http://backend:5000', // Ubah dari http://localhost:5000
      changeOrigin: true,
    },
  },
},
});



