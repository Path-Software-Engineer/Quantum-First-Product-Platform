# Dependency audit status — Sprint 1 bootstrap

Checked on 2026-09-14 with `npm audit --json` against the generated npm
workspace lockfile. The result is **not a passing release gate**: 22 high and
6 moderate findings. This document records a blocker, not an exception or
authorization to publish.

The first distinct vulnerable transitive packages are:

- `multer@2.2.0`, required by `@nestjs/platform-express@12.0.1`;
- `serialize-javascript@6.0.2`, required by Docusaurus bundler plugins;
- `image-size@2.0.2`, required by `@docusaurus/mdx-loader@3.10.2`;
- `uuid@8.3.2`, in the Docusaurus development server tree.

The high count includes parent packages through these dependency chains; it
does not mean 22 independent defects. `npm view image-size version` returned
`2.0.2`, so no later published release was available at this check. An npm
`overrides` attempt for the first two packages did not alter the resolved
versions in this Windows npm 11 workspace; it was removed rather than left as
a misleading claim of remediation.

Before a Sprint 1 release: inspect the exact advisory and reachable code path,
upgrade upstream package releases or test a compatible scoped override/fork,
regenerate the lockfile, run the full build and tests, then obtain a clean
strict audit. Do not downgrade severity, suppress the finding, or publish an
unreviewed package substitution solely to turn the gate green.
