import {useEffect, useMemo, useState, type ReactNode} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './developer-docs.module.css';

type Build = {
  buildId: string;
  sourceSha256: string;
  publishedAt: string;
  markdown: string;
  sourceSnapshot: {
    document: {apiName: string; apiVersion: string; description: string; authModel: string; baseUrl: string; rateLimits: string; serviceStatus: string};
    endpoints: Array<{endpointId: string; method: string; path: string; summary: string; description: string; tags: string[]; useCase: string}>;
    errors: Array<{errorId: string; httpStatus: number; errorCode: string; message: string; cause: string; suggestedSolution: string; isCommon: boolean}>;
    examples: Array<{exampleId: string; language: string; title: string; requestSample: string; responseSample: string; notes: string}>;
    quickstart: {installation: string; firstCall: string; expectedResult: string; nextStep: string; troubleshooting: string};
    limitations: string;
  };
};

export default function DeveloperDocs(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  const apiBase = String(siteConfig.customFields?.apiBaseUrl ?? 'http://127.0.0.1:8080');
  const [build, setBuild] = useState<Build | null>(null);
  const [state, setState] = useState<'empty' | 'loading' | 'ready' | 'error'>('empty');
  const buildId = useMemo(() => typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('build') ?? '', []);

  useEffect(() => {
    if (!buildId) return;
    setState('loading');
    fetch(`${apiBase}/api/v1/public/developer-docs/${buildId}`)
      .then((response) => { if (!response.ok) throw new Error('load failed'); return response.json(); })
      .then((value: Build) => { setBuild(value); setState('ready'); })
      .catch(() => setState('error'));
  }, [apiBase, buildId]);

  return (
    <Layout title="Developer API docs" description="Reviewed API references, examples and quickstarts generated from structured metadata.">
      <main id="main-content" className={styles.page}>
        {state === 'empty' && <Empty />}
        {state === 'loading' && <p className={styles.notice} role="status">Loading published developer documentation…</p>}
        {state === 'error' && <p className={styles.notice} role="alert">The published documentation could not be loaded. Check the build ID and API availability.</p>}
        {state === 'ready' && build && <Published build={build} />}
      </main>
    </Layout>
  );
}

function Empty() {
  return <section className={styles.empty} aria-labelledby="empty-title">
    <p className={styles.eyebrow}>Sprint 3 · contract-first developer experience</p>
    <Heading as="h1" id="empty-title">API docs developers can trust.</Heading>
    <p>Open a reviewed build with <code>?build=&lt;uuid&gt;</code>. Draft metadata, tenant identifiers and reviewer identities are never exposed here.</p>
    <ol className={styles.flow} aria-label="Documentation workflow">
      <li>Define metadata and contracts</li><li>Review examples and errors</li><li>Publish immutable Markdown</li>
    </ol>
  </section>;
}

function Published({build}: {build: Build}) {
  const {document, endpoints, errors, examples, quickstart, limitations} = build.sourceSnapshot;
  const download = () => {
    const url = URL.createObjectURL(new Blob([build.markdown], {type: 'text/markdown'}));
    const anchor = window.document.createElement('a');
    anchor.href = url; anchor.download = `${document.apiName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`; anchor.click();
    URL.revokeObjectURL(url);
  };
  return <article>
    <header className={styles.hero}>
      <div><p className={styles.eyebrow}>Reviewed API reference · {document.serviceStatus}</p><Heading as="h1">{document.apiName}</Heading><p className={styles.lead}>{document.description}</p></div>
      <button type="button" className={styles.download} onClick={download}>Download Markdown</button>
    </header>
    <nav className={styles.jump} aria-label="On this page"><a href="#quickstart">Quickstart</a><a href="#endpoints">Endpoints</a><a href="#errors">Errors</a><a href="#examples">Examples</a></nav>
    <dl className={styles.meta} aria-label="API metadata"><Item label="Version" value={document.apiVersion}/><Item label="Base URL" value={document.baseUrl}/><Item label="Authentication" value={document.authModel}/><Item label="Limits" value={document.rateLimits}/></dl>
    <section id="quickstart" className={styles.section}><Heading as="h2">Quickstart</Heading><p>{quickstart.installation}</p><Code value={quickstart.firstCall}/><p><strong>Expected:</strong> {quickstart.expectedResult}</p><p><strong>Next:</strong> {quickstart.nextStep}</p><aside><strong>Troubleshooting</strong><p>{quickstart.troubleshooting}</p></aside></section>
    <section id="endpoints" className={styles.section}><Heading as="h2">Endpoint reference</Heading>{endpoints.map((item) => <article className={styles.card} key={item.endpointId}><div className={styles.endpointTitle}><span>{item.method}</span><code>{item.path}</code></div><Heading as="h3">{item.summary}</Heading><p>{item.description}</p><p><strong>Use case:</strong> {item.useCase}</p><ul className={styles.tags}>{item.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul></article>)}</section>
    <section id="errors" className={styles.section}><Heading as="h2">Errors that explain the next move</Heading><div className={styles.grid}>{errors.map((item) => <article className={styles.card} key={item.errorId}><span className={styles.errorCode}>{item.httpStatus} · {item.errorCode}{item.isCommon ? ' · common' : ''}</span><Heading as="h3">{item.message}</Heading><p><strong>Cause:</strong> {item.cause}</p><p><strong>Resolution:</strong> {item.suggestedSolution}</p></article>)}</div></section>
    <section id="examples" className={styles.section}><Heading as="h2">Copy-ready examples</Heading>{examples.map((item) => <article className={styles.example} key={item.exampleId}><Heading as="h3">{item.title}</Heading><Code value={item.requestSample}/><p>{item.notes}</p></article>)}</section>
    <footer className={styles.provenance}><strong>Evidence boundary</strong><span>{limitations}</span><span>SHA-256 {build.sourceSha256}</span><span>Published {new Date(build.publishedAt).toISOString()}</span></footer>
  </article>;
}

function Item({label, value}: {label: string; value: string}) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
function Code({value}: {value: string}) { return <pre tabIndex={0}><code>{value}</code></pre>; }
