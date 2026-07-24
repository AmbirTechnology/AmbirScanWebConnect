import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/">
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}

function Features() {
  return (
    <section style={{padding: '2rem 0'}}>
      <div className="container">
        <div className="row">
          <div className="col col--4" style={{padding: '1rem'}}>
            <Heading as="h3">Simple Integration</Heading>
            <p>
              Add a single JavaScript file to your web app. No server-side changes,
              no complex setup, no dependencies.
            </p>
          </div>
          <div className="col col--4" style={{padding: '1rem'}}>
            <Heading as="h3">Full Scanner Control</Heading>
            <p>
              Resolution, color mode, duplex, page size, auto-rotate, auto-deskew,
              barcode detection, and OCR — all from JavaScript.
            </p>
          </div>
          <div className="col col--4" style={{padding: '1rem'}}>
            <Heading as="h3">Secure by Design</Heading>
            <p>
              Runs entirely on localhost with HTTPS. Supports Chrome Private Network
              Access. No data leaves the client machine.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home(): JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title="Home"
      description="Enable browser-based scanning with Ambir TWAIN scanners">
      <HomepageHeader />
      <main>
        <Features />
      </main>
    </Layout>
  );
}
