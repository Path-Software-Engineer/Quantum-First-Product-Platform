import type {ReactNode} from 'react';
import {useEffect, useState} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './one-pager.module.css';

type Snapshot = {
  schemaVersion: 'p10.one-pager.v1';
  product: {displayName: string; summary: string};
  version: {versionNumber: number; changeSummary: string};
  capabilities: Array<{
    key: string;
    title: string;
    description: string;
    maturity: string;
    limitations: string;
  }>;
  useCases: Array<{
    key: string;
    actor: string;
    problem: string;
    workflow: string;
    expected_outcome: string;
    evidence_status: string;
  }>;
  claims: Array<{
    statement: string;
    evidence_title: string;
    source_uri: string;
    source_kind: string;
    notes: string;
  }>;
  commercialScenarios: Array<{
    key: string;
    packaging: string;
    pricing: string;
    licensing: string;
    assumptions: string;
    is_hypothetical: boolean;
  }>;
};

type Build = {
  buildId: string;
  sourceSnapshot: Snapshot;
  sourceSha256: string;
  publishedAt: string;
};

export default function OnePager(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  const [build, setBuild] = useState<Build>();
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');

  useEffect(() => {
    const buildId = new URLSearchParams(window.location.search).get('build');
    if (!buildId) return;
    setState('loading');
    const base = String(siteConfig.customFields?.apiBaseUrl).replace(/\/$/, '');
    fetch(`${base}/api/v1/public/one-pagers/${encodeURIComponent(buildId)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Published build was not found.');
        setBuild((await response.json()) as Build);
        setState('idle');
      })
      .catch(() => setState('error'));
  }, [siteConfig.customFields?.apiBaseUrl]);

  return (
    <Layout title="Published one-pager" description="An evidence-reviewed product snapshot">
      <main id="main-content" className={styles.page}>
        {!build && state === 'idle' && (
          <section className={styles.empty} aria-labelledby="empty-title">
            <p className={styles.eyebrow}>Published artifact viewer</p>
            <Heading as="h1" id="empty-title">Open a versioned one-pager build.</Heading>
            <p>Supply a build identifier in <code>?build=&lt;uuid&gt;</code>. Drafts and unreviewed claims are never rendered here.</p>
          </section>
        )}
        {state === 'loading' && <p className={styles.notice} role="status">Loading the immutable source snapshot…</p>}
        {state === 'error' && <p className={styles.notice} role="alert">The published build could not be loaded. Check the build ID and API availability.</p>}
        {build && <PublishedBuild build={build} />}
      </main>
    </Layout>
  );
}

function PublishedBuild({build}: {build: Build}): ReactNode {
  const source = build.sourceSnapshot;
  return (
    <article>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Published product version {source.version.versionNumber}</p>
        <Heading as="h1">{source.product.displayName}</Heading>
        <p className={styles.lead}>{source.product.summary}</p>
        <dl className={styles.provenance}>
          <div><dt>Build</dt><dd>{build.buildId}</dd></div>
          <div><dt>Source SHA-256</dt><dd>{build.sourceSha256}</dd></div>
          <div><dt>Published</dt><dd>{new Date(build.publishedAt).toISOString()}</dd></div>
        </dl>
      </header>

      <section className={styles.section} aria-labelledby="capabilities-title">
        <Heading as="h2" id="capabilities-title">Capabilities and limits</Heading>
        <div className={styles.grid}>
          {source.capabilities.map((capability) => (
            <article className={styles.card} key={capability.key}>
              <span className={styles.badge}>{capability.maturity}</span>
              <Heading as="h3">{capability.title}</Heading>
              <p>{capability.description}</p>
              <p><strong>Limit:</strong> {capability.limitations}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="use-cases-title">
        <Heading as="h2" id="use-cases-title">Who it is for and what changes</Heading>
        <div className={styles.grid}>
          {source.useCases.map((useCase) => (
            <article className={styles.card} key={useCase.key}>
              <span className={styles.badge}>{useCase.evidence_status}</span>
              <Heading as="h3">{useCase.actor}</Heading>
              <p><strong>Problem:</strong> {useCase.problem}</p>
              <p><strong>Workflow:</strong> {useCase.workflow}</p>
              <p><strong>Expected outcome:</strong> {useCase.expected_outcome}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="claims-title">
        <Heading as="h2" id="claims-title">Approved claims and evidence</Heading>
        {source.claims.map((claim) => (
          <article className={styles.claim} key={`${claim.source_uri}-${claim.statement}`}>
            <blockquote>{claim.statement}</blockquote>
            <p><a href={claim.source_uri}>{claim.evidence_title}</a> · {claim.source_kind}</p>
            <p>{claim.notes}</p>
          </article>
        ))}
      </section>

      <section className={styles.section} aria-labelledby="commercial-title">
        <Heading as="h2" id="commercial-title">Commercial scenarios</Heading>
        <p className={styles.warning}>Hypothetical planning scenarios. These are not quotes, offers, invoices or executable license terms.</p>
        {source.commercialScenarios.map((scenario) => (
          <article className={styles.scenario} key={scenario.key}>
            <Heading as="h3">{scenario.key}</Heading>
            <dl>
              <div><dt>Package</dt><dd>{scenario.packaging}</dd></div>
              <div><dt>Pricing</dt><dd>{scenario.pricing}</dd></div>
              <div><dt>Licensing</dt><dd>{scenario.licensing}</dd></div>
              <div><dt>Assumptions</dt><dd>{scenario.assumptions}</dd></div>
            </dl>
          </article>
        ))}
      </section>
    </article>
  );
}
