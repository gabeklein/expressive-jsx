import jsx from '@expressive/vite-plugin-jsx';
import react from '@vitejs/plugin-react';
import vite from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default <vite.UserConfig> {
  plugins: [
    jsx(),
    react(),
    tsconfigPaths()
  ]
}