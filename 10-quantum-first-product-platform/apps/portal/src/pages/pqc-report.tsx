import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Heading from "@theme/Heading";
import Layout from "@theme/Layout";
import styles from "./pqc-report.module.css";

type Tier = "low" | "medium" | "high";
type ReportBuild = {
  buildId: string;
  sourceSha256: string;
  publishedAt: string;
  sourceSnapshot: {
    schemaVersion: "p10.pqc-report.v1";
    disclaimer: string;
    scoreRubric: string;
    assessment: {
      title: string;
      industry: string;
      maturity: string;
      primaryConcern: string;
      scope: string;
      assumptions: string;
      evidenceBasis: string;
      reviewNote: string;
    };
    executiveSummary: {
      inventoryItems: number;
      highPriorityItems: number;
      highestTier: Tier;
      nextAction: string;
    };
    inventory: Array<{
      itemId: string;
      systemName: string;
      algorithm: string;
      protocol: string;
      dataClass: string;
      evidenceNote: string;
      riskScore: number;
      riskTier: Tier;
      scoreFactors: Record<string, number>;
    }>;
    recommendations: Array<{
      recommendationId: string;
      action: string;
      priority: Tier;
      dependency: string;
      limitation: string;
    }>;
    roadmap: Array<{
      phaseId: string;
      phaseNumber: number;
      title: string;
      objective: string;
      exitCriteria: string;
      operationalRisks: string;
    }>;
  };
};

export default function PqcReport(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  const [build, setBuild] = useState<ReportBuild>();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    const buildId = new URLSearchParams(window.location.search).get("build");
    if (!buildId) return;
    setState("loading");
    const base = String(siteConfig.customFields?.apiBaseUrl).replace(/\/$/, "");
    fetch(`${base}/api/v1/public/pqc-reports/${encodeURIComponent(buildId)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Published report was not found.");
        setBuild((await response.json()) as ReportBuild);
        setState("idle");
      })
      .catch(() => setState("error"));
  }, [siteConfig.customFields?.apiBaseUrl]);

  return (
    <Layout
      title="PQC readiness report"
      description="Evidence-bounded post-quantum readiness report"
    >
      <main id="main-content" className={styles.page}>
        {!build && state === "idle" && (
          <section
            className={styles.empty}
            aria-labelledby="empty-report-title"
          >
            <p className={styles.eyebrow}>Published PQC report viewer</p>
            <Heading as="h1" id="empty-report-title">
              Open a reviewed readiness report.
            </Heading>
            <p>
              Supply a report build in <code>?build=&lt;uuid&gt;</code>. Draft
              inventories are private and never rendered here.
            </p>
          </section>
        )}
        {state === "loading" && (
          <p className={styles.notice} role="status">
            Loading the immutable report snapshot…
          </p>
        )}
        {state === "error" && (
          <p className={styles.notice} role="alert">
            The published report could not be loaded. Check the build ID and API
            availability.
          </p>
        )}
        {build && <PublishedReport build={build} />}
      </main>
    </Layout>
  );
}

function PublishedReport({ build }: { build: ReportBuild }): ReactNode {
  const report = build.sourceSnapshot;
  return (
    <article>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Reviewed readiness planning</p>
          <Heading as="h1">{report.assessment.title}</Heading>
          <p className={styles.lead}>{report.executiveSummary.nextAction}</p>
        </div>
        <button
          className={styles.printButton}
          type="button"
          onClick={() => window.print()}
        >
          Print or save PDF
        </button>
      </header>

      <section className={styles.boundary} aria-labelledby="boundary-title">
        <Heading as="h2" id="boundary-title">
          Evidence boundary
        </Heading>
        <p>{report.disclaimer}</p>
        <dl className={styles.metadata}>
          <div>
            <dt>Evidence</dt>
            <dd>{report.assessment.evidenceBasis.replaceAll("_", " ")}</dd>
          </div>
          <div>
            <dt>Scope</dt>
            <dd>{report.assessment.scope}</dd>
          </div>
          <div>
            <dt>Assumptions</dt>
            <dd>{report.assessment.assumptions}</dd>
          </div>
          <div>
            <dt>Reviewer note</dt>
            <dd>{report.assessment.reviewNote}</dd>
          </div>
        </dl>
      </section>

      <section className={styles.section} aria-labelledby="summary-title">
        <Heading as="h2" id="summary-title">
          Executive summary
        </Heading>
        <dl className={styles.metrics}>
          <Metric
            label="Declared systems"
            value={report.executiveSummary.inventoryItems}
          />
          <Metric
            label="High-priority items"
            value={report.executiveSummary.highPriorityItems}
          />
          <Metric
            label="Highest tier"
            value={report.executiveSummary.highestTier.toUpperCase()}
          />
          <Metric
            label="Maturity"
            value={report.assessment.maturity.toUpperCase()}
          />
        </dl>
        <p className={styles.rubric}>{report.scoreRubric}</p>
      </section>

      <section className={styles.section} aria-labelledby="inventory-title">
        <Heading as="h2" id="inventory-title">
          Cryptographic inventory
        </Heading>
        <div className={styles.inventory}>
          {report.inventory.map((item) => (
            <article className={styles.inventoryCard} key={item.itemId}>
              <div className={styles.cardHeading}>
                <Heading as="h3">{item.systemName}</Heading>
                <span className={`${styles.tier} ${styles[item.riskTier]}`}>
                  {item.riskTier} · {item.riskScore}/12
                </span>
              </div>
              <p className={styles.algorithm}>
                {item.algorithm} · {item.protocol} · {item.dataClass}
              </p>
              <dl className={styles.factors}>
                {Object.entries(item.scoreFactors).map(([label, value]) => (
                  <div key={label}>
                    <dt>{factorLabel(label)}</dt>
                    <dd>{value}/3</dd>
                  </div>
                ))}
              </dl>
              <p>
                <strong>Evidence note:</strong> {item.evidenceNote}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        className={styles.section}
        aria-labelledby="recommendations-title"
      >
        <Heading as="h2" id="recommendations-title">
          Recommendation cards
        </Heading>
        <div className={styles.grid}>
          {report.recommendations.map((recommendation) => (
            <article
              className={styles.card}
              key={recommendation.recommendationId}
            >
              <span
                className={`${styles.tier} ${styles[recommendation.priority]}`}
              >
                {recommendation.priority} priority
              </span>
              <Heading as="h3">{recommendation.action}</Heading>
              <p>
                <strong>Dependency:</strong> {recommendation.dependency}
              </p>
              <p>
                <strong>Limitation:</strong> {recommendation.limitation}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="roadmap-title">
        <Heading as="h2" id="roadmap-title">
          Five-phase migration roadmap
        </Heading>
        <ol className={styles.roadmap}>
          {report.roadmap.map((phase) => (
            <li key={phase.phaseId}>
              <span aria-hidden="true">
                {String(phase.phaseNumber).padStart(2, "0")}
              </span>
              <div>
                <Heading as="h3">{phase.title}</Heading>
                <p>{phase.objective}</p>
                <p>
                  <strong>Exit:</strong> {phase.exitCriteria}
                </p>
                <p>
                  <strong>Operational risk:</strong> {phase.operationalRisks}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <footer className={styles.provenance}>
        <strong>Immutable provenance</strong>
        <span>Build {build.buildId}</span>
        <span>SHA-256 {build.sourceSha256}</span>
        <span>Published {new Date(build.publishedAt).toISOString()}</span>
      </footer>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={styles.metric}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function factorLabel(value: string) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (character) => character.toUpperCase());
}
