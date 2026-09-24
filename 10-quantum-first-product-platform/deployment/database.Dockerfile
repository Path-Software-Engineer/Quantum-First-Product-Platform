FROM postgres:17.10-bookworm

COPY infra/migrations/0001_tenancy.sql /docker-entrypoint-initdb.d/10-0001-tenancy.sql
COPY infra/migrations/0002_product_catalog.sql /docker-entrypoint-initdb.d/20-0002-product-catalog.sql
COPY infra/migrations/0003_claims_one_pagers.sql /docker-entrypoint-initdb.d/30-0003-claims-one-pagers.sql
COPY infra/migrations/0004_pqc_assessments.sql /docker-entrypoint-initdb.d/40-0004-pqc-assessments.sql
COPY infra/migrations/0005_developer_docs_outbox.sql /docker-entrypoint-initdb.d/50-0005-developer-docs-outbox.sql
COPY deployment/database/80-runtime-role.sh /docker-entrypoint-initdb.d/80-runtime-role.sh
COPY deployment/database/90-public-demo.sql /docker-entrypoint-initdb.d/90-public-demo.sql

