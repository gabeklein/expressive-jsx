const { default: JSXPlugin } = require('@expressive/webpack-plugin');
const Nextra = require('nextra');

const nextra = Nextra({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx'
});

module.exports = nextra({
  webpack: (config) => {
    config.plugins.push(
      new JSXPlugin()
    );
  }
});