import { DocsThemeConfig } from 'nextra-theme-docs'
import { SiteLogo } from './Logo'

const config: DocsThemeConfig = {
  logo: <SiteLogo />,
  project: {
    link: 'https://github.com/gabeklein/expressive-jsx',
  },
  footer: {
    text: 'MIT 2024 © Gabe Klein',
  },
  head: () => (
    <>
      <link href="https://fonts.googleapis.com" rel="preconnect" />
      <link href="https://fonts.gstatic.com" rel="preconnect" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Rubik&display=swap" rel="stylesheet" />
    </>
  ),
  sidebar: {
    defaultMenuCollapseLevel: 2
  },
}

export default config;
