import type { ReactNode } from "react";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";

export default function SwaggerRoute(): ReactNode {
  return (
    <Layout
      title="Swagger"
      description="Interactive Quantum-First Control API contract"
    >
      <main id="main-content" className="container margin-vert--xl">
        <Heading as="h1">
          Swagger is exposed by the deployed API gateway.
        </Heading>
        <p>
          In local portal-only development, open the control API at{" "}
          <a href="http://127.0.0.1:8080/docs/">http://127.0.0.1:8080/docs/</a>.
        </p>
      </main>
    </Layout>
  );
}
