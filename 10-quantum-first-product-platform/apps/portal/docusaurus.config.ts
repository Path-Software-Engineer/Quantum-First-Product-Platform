import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Quantum-First Product Platform',
  tagline: 'Evidence before claims. Product before hype.',
  url: 'http://127.0.0.1:3000',
  baseUrl: '/',
  customFields: {
    apiBaseUrl: process.env.P10_PUBLIC_API_URL ?? 'http://127.0.0.1:8080',
  },
  onBrokenLinks: 'throw',
  i18n: {defaultLocale: 'en', locales: ['en']},
  presets: [
    ['classic', {
      docs: {sidebarPath: './sidebars.ts', routeBasePath: '/docs'},
      blog: false,
      theme: {customCss: './src/css/custom.css'},
    } satisfies Preset.Options],
  ],
  themeConfig: {
    colorMode: {defaultMode: 'light', respectPrefersColorScheme: true},
    navbar: {
      title: 'Quantum-First',
      items: [
        {to: '/docs/intro', label: 'Platform contract', position: 'left'},
        {to: '/trust', label: 'Trust and evidence', position: 'left'},
        {to: '/one-pager', label: 'Published one-pager', position: 'left'},
      ],
    },
    footer: {
      style: 'dark',
      copyright: `© ${new Date().getFullYear()} Quantum-First Product Platform. Local development preview; no customer claims.`,
    },
  },
};

export default config;
