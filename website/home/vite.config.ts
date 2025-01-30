import jsx from '@expressive/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import paths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    jsx(),
    react(),
    paths()
  ]
})