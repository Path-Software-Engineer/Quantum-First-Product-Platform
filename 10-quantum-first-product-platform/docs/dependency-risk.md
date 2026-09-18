# Dependency audit status — Sprint 1

Checked on 2026-09-18 from a newly generated npm lockfile. This remains **a
release blocker**, not an accepted exception. The final audit result after the
repairs below is 1 high, 20 moderate and 0 critical findings.

## Repaired and verified

- NestJS packages were upgraded from `12.0.1` to `12.0.3`.
- `@nestjs/platform-express@12.0.3` resolves `multer@2.4.0`; the prior Multer
  high findings no longer appear.
- `image-size@2.0.4` is pinned in the portal development toolchain and is
  deduplicated into `@docusaurus/mdx-loader`; its prior high findings no longer
  appear.

## Still blocked

`copy-webpack-plugin@11.0.0` and `css-minimizer-webpack-plugin@5.0.1`, brought
by `@docusaurus/bundler@3.10.2`, resolve `serialize-javascript@6.0.2`. npm audit
marks that version high and reports no automatic fix. The current Docusaurus
release remains `3.10.2` at this check.

Both a global and a parent-scoped npm override to `serialize-javascript@7.1.1`
were tested, including a clean lockfile and `npm ci`. Neither changed the
resolved lock entry. A direct dependency also produced an invalid dependency
tree because the build plugins require the `6.x` range. Those unsuccessful
declarations were removed rather than committed as false remediation.

Do not suppress the advisory or lower the audit threshold. The next valid
options are an upstream Docusaurus/plugin release that accepts the patched
major, or a reviewed and tested fork/patch of the affected build plugin. Any
such change must pass the Docusaurus production build and clean-install gate.
