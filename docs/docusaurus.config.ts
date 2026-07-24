import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'AmbirScan Web Connect',
  tagline: 'Enable browser-based scanning with Ambir TWAIN scanners',
  favicon: 'img/favicon.ico',

  url: 'https://ambirtechnology.github.io',
  baseUrl: '/AmbirScanWebConnect/',

  organizationName: 'AmbirTechnology',
  projectName: 'AmbirScanWebConnect',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl:
            'https://github.com/AmbirTechnology/AmbirScanWebConnect/tree/main/docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'AmbirScan Web Connect',
      logo: {
        alt: 'Ambir Technology Logo',
        src: 'img/favicon.ico',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'sdkSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: 'https://github.com/AmbirTechnology/AmbirScanWebConnect',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/getting-started',
            },
            {
              label: 'SDK Reference',
              to: '/docs/sdk-reference',
            },
            {
              label: 'REST API',
              to: '/docs/rest-api',
            },
          ],
        },
        {
          title: 'Support',
          items: [
            {
              label: 'GitHub Issues',
              href: 'https://github.com/AmbirTechnology/AmbirScanWebConnect/issues',
            },
            {
              label: 'Ambir Technology',
              href: 'https://ambir.com',
            },
          ],
        },
        {
          title: 'Legal',
          items: [
            {
              label: 'MIT License (SDK)',
              href: 'https://github.com/AmbirTechnology/AmbirScanWebConnect/blob/main/LICENSE',
            },
            {
              label: 'EULA (Installer)',
              href: 'https://github.com/AmbirTechnology/AmbirScanWebConnect/blob/main/EULA.md',
            },
          ],
        },
      ],
      copyright: `Copyright \u00a9 ${new Date().getFullYear()} Ambir Technology, Inc. All rights reserved.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['csharp', 'json', 'bash'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
