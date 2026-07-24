import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  sdkSidebar: [
    'introduction',
    'getting-started',
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/deployment',
        'guides/browser-security',
        'guides/barcode-reading',
        'guides/auto-scan',
        'guides/desktop-app-diagnostics',
        'guides/windows-service-diagnostics',
        'guides/certificate-manager',
        'guides/msi-installer',
      ],
    },
    'sdk-reference',
    'rest-api',
    'troubleshooting',
  ],
};

export default sidebars;
