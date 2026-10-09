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
        {
          type: 'category',
          label: 'Windows',
          items: [
            'guides/msi-installer',
            'guides/certificate-manager',
            'guides/desktop-app-diagnostics',
            'guides/windows-service-diagnostics',
          ],
        },
        {
          type: 'category',
          label: 'macOS',
          items: [
            'guides/macos-installer',
            'guides/macos-diagnostics',
          ],
        },
      ],
    },
    'sdk-reference',
    'rest-api',
    'troubleshooting',
  ],
};

export default sidebars;
