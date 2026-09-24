#!/usr/bin/env bash
set -Eeuo pipefail

: "${P10_RUNTIME_PASSWORD:?P10_RUNTIME_PASSWORD is required}"

psql \
  --set ON_ERROR_STOP=1 \
  --set runtime_password="$P10_RUNTIME_PASSWORD" \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" <<'SQL'
SELECT format(
  'CREATE ROLE p10_app LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS',
  :'runtime_password'
) WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'p10_app') \gexec
GRANT p10_runtime TO p10_app;
ALTER ROLE p10_app SET statement_timeout = '15s';
ALTER ROLE p10_app SET lock_timeout = '5s';
SQL

