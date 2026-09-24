import type { ReactNode } from "react";
import Link from "@docusaurus/Link";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";
import styles from "./index.module.css";

const stages = [
  {
    number: "01",
    title: "Define",
    detail: "A bounded offer, audience and explicit limitations.",
  },
  {
    number: "02",
    title: "Review",
    detail: "Trace claims to sources and a distinct human decision.",
  },
  {
    number: "03",
    title: "Publish",
    detail: "Generate an immutable one-pager from accepted data.",
  },
];

const demoBuilds = {
  onePager: "10000000-0000-4000-8000-000000000001",
  pqcReport: "10000000-0000-4000-8000-000000000002",
  developerDocs: "10000000-0000-4000-8000-000000000003",
};

export default function Home(): ReactNode {
  return (
    <Layout
      title="Evidence-led product platform"
      description="A released, contract-first quantum-ready product platform."
    >
      <main id="main-content" className={styles.page}>
        <section className={styles.hero} aria-labelledby="hero-heading">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Sprint 3 · recruiter demo release</p>
            <Heading as="h1" id="hero-heading">
              A quantum-first story that can be checked.
            </Heading>
            <p className={styles.lead}>
              This platform connects product versions, evidence review, PQC
              planning and developer documentation to immutable public
              artifacts. The hosted examples are synthetic and make no customer
              adoption, quantum advantage or certification claim.
            </p>
            <div className={styles.actions}>
              <Link
                className="button button--primary button--lg"
                to="/docs/intro"
              >
                Read the platform contract
              </Link>
              <Link className="button button--secondary button--lg" to="/trust">
                See evidence boundaries
              </Link>
              <Link
                className="button button--secondary button--lg"
                to="/swagger/"
              >
                Explore Swagger
              </Link>
            </div>
          </div>
          <aside className={styles.status} aria-label="Current release status">
            <span className={styles.statusLabel}>Release status</span>
            <strong>Sprints 1–3 are released</strong>
            <p>
              The public demo is rebuilt from reviewed synthetic projections
              after every scale-to-zero cold start; tenant-owned drafts remain
              private.
            </p>
          </aside>
        </section>
        <section className={styles.process} aria-labelledby="process-heading">
          <p className={styles.eyebrow}>Verified workflow</p>
          <Heading as="h2" id="process-heading">
            From structured source to public artifact
          </Heading>
          <div className={styles.stageGrid}>
            {stages.map((stage) => (
              <article className={styles.stage} key={stage.number}>
                <span aria-hidden="true">{stage.number}</span>
                <Heading as="h3">{stage.title}</Heading>
                <p>{stage.detail}</p>
              </article>
            ))}
          </div>
          <p className={styles.stageNote}>
            The workflow is covered by unit, HTTP, PostgreSQL RLS and browser
            acceptance tests.
          </p>
        </section>
        <section className={styles.process} aria-labelledby="demo-heading">
          <p className={styles.eyebrow}>Public synthetic evidence</p>
          <Heading as="h2" id="demo-heading">
            Open the recruiter-ready artifacts
          </Heading>
          <div className={styles.stageGrid}>
            <article className={styles.stage}>
              <span aria-hidden="true">A</span>
              <Heading as="h3">Product one-pager</Heading>
              <p>
                Capabilities, use cases, evidence and bounded commercial
                scenarios.
              </p>
              <Link to={`/one-pager?build=${demoBuilds.onePager}`}>
                Open artifact
              </Link>
            </article>
            <article className={styles.stage}>
              <span aria-hidden="true">B</span>
              <Heading as="h3">PQC readiness report</Heading>
              <p>
                A scored synthetic inventory, recommendations and a five-phase
                roadmap.
              </p>
              <Link to={`/pqc-report?build=${demoBuilds.pqcReport}`}>
                Open report
              </Link>
            </article>
            <article className={styles.stage}>
              <span aria-hidden="true">C</span>
              <Heading as="h3">Developer documentation</Heading>
              <p>
                Structured endpoints, errors, quickstart guidance and copy-ready
                examples.
              </p>
              <Link to={`/developer-docs?build=${demoBuilds.developerDocs}`}>
                Open API docs
              </Link>
            </article>
          </div>
        </section>
      </main>
    </Layout>
  );
}
