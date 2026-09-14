import type {ReactNode} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

export default function Trust(): ReactNode {
  return (
    <Layout title="Trust and evidence" description="Evidence and product-claim boundaries">
      <main className="container margin-vert--xl" id="main-content">
        <Heading as="h1">Trust and evidence</Heading>
        <p>Verified software behavior, research hypotheses and synthetic fixtures are different things.</p>
        <section aria-labelledby="status-heading">
          <Heading as="h2" id="status-heading">Current status</Heading>
          <p>Sprint 1 is under construction. No company thesis, customer result or post-quantum security certification is published by this site.</p>
          <p>AI Project 55 has a candidate handoff marked pending human review. This portal has not imported it.</p>
        </section>
        <section aria-labelledby="policy-heading">
          <Heading as="h2" id="policy-heading">Publication rule</Heading>
          <p>Future public claims require an owner, source reference, limitation and distinct reviewer approval. Published versions remain immutable; corrections create a new version.</p>
        </section>
      </main>
    </Layout>
  );
}
