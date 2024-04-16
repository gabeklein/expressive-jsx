import jsx from '@expressive/vite-plugin';
import react from '@vitejs/plugin-react';
import vite from 'vite';
import paths from 'vite-tsconfig-paths';

export default <vite.UserConfig> {
  plugins: [
    jsx(),
    react(),
    paths()
  ]
}