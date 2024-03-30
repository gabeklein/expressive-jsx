import JSXPlugin from '@expressive/webpack-plugin';
import Nextra from 'nextra';

const nextra = Nextra({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx'
});

export default nextra({
  webpack: (config) => {
    config.plugins.push(
      new JSXPlugin()
    );
  }
});