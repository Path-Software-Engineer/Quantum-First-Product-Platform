import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

const stages = [
  {number: '01', title: 'Define', detail: 'A bounded offer, audience and explicit limitations.'},
  {number: '02', title: 'Review', detail: 'Trace claims to sources and a distinct human decision.'},
  {number: '03', title: 'Publish', detail: 'Generate an immutable one-pager from accepted data.'},
];

export default function Home(): ReactNode {
  return (
    <Layout title="Evidence-led product platform" description="A contract-first quantum-ready product platform under construction.">
      <main id="main-content" className={styles.page}>
        <section className={styles.hero} aria-labelledby="hero-heading">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Sprint 1 · implementation in progress</p>
            <Heading as="h1" id="hero-heading">A quantum-first story that can be checked.</Heading>
            <p className={styles.lead}>
              This platform is being built to connect product versions, evidence review and
              an accessible company one-pager. No customer adoption, quantum advantage or
              security certification is claimed here.
            </p>
            <div className={styles.actions}>
              <Link className="button button--primary button--lg" to="/docs/intro">Read the platform contract</Link>
              <Link className="button button--secondary button--lg" to="/trust">See evidence boundaries</Link>
            </div>
          </div>
          <aside className={styles.status} aria-label="Current release status">
            <span className={styles.statusLabel}>Release status</span>
            <strong>Sprint 1 is not yet released</strong>
            <p>Only reviewed, versioned product content will become public. The AI Project 55 handoff remains pending human review.</p>
          </aside>
        </section>
        <section className={styles.process} aria-labelledby="process-heading">
          <p className={styles.eyebrow}>Planned verified workflow</p>
          <Heading as="h2" id="process-heading">From structured source to public artifact</Heading>
          <div className={styles.stageGrid}>
            {stages.map((stage) => (
              <article className={styles.stage} key={stage.number}>
                <span aria-hidden="true">{stage.number}</span>
                <Heading as="h3">{stage.title}</Heading>
                <p>{stage.detail}</p>
              </article>
            ))}
          </div>
          <p className={styles.stageNote}>These are acceptance targets, not completed product capabilities.</p>
        </section>
      </main>
    </Layout>
  );
}
