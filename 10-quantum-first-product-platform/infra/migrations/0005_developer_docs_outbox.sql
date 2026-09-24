BEGIN;

CREATE TABLE api_doc_projects (
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  version_id uuid NOT NULL,
  document_id uuid NOT NULL,
  api_name text NOT NULL CHECK (length(trim(api_name)) BETWEEN 1 AND 160),
  api_version text NOT NULL CHECK (length(trim(api_version)) BETWEEN 1 AND 40),
  description text NOT NULL CHECK (length(trim(description)) BETWEEN 1 AND 2000),
  auth_model text NOT NULL CHECK (length(trim(auth_model)) BETWEEN 1 AND 500),
  base_url text NOT NULL CHECK (base_url ~ '^https?://'),
  rate_limits text NOT NULL CHECK (length(trim(rate_limits)) BETWEEN 1 AND 500),
  service_status text NOT NULL CHECK (service_status IN ('concept', 'beta', 'stable', 'deprecated')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed')),
  created_by text NOT NULL CHECK (length(created_by) BETWEEN 1 AND 255),
  reviewed_by text,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  PRIMARY KEY (organization_id, workspace_id, document_id),
  FOREIGN KEY (organization_id, workspace_id, version_id)
    REFERENCES product_versions (organization_id, workspace_id, version_id) ON DELETE RESTRICT,
  CHECK (
    (status = 'draft' AND reviewed_by IS NULL AND reviewed_at IS NULL)
    OR (status = 'reviewed' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
  )
);

CREATE TABLE api_doc_endpoints (
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  document_id uuid NOT NULL,
  endpoint_id uuid NOT NULL,
  method text NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
  path text NOT NULL CHECK (path ~ '^/'),
  summary text NOT NULL CHECK (length(trim(summary)) BETWEEN 1 AND 240),
  description text NOT NULL CHECK (length(trim(description)) BETWEEN 1 AND 2000),
  tags jsonb NOT NULL CHECK (jsonb_typeof(tags) = 'array'),
  use_case text NOT NULL CHECK (length(trim(use_case)) BETWEEN 1 AND 1200),
  parameters jsonb NOT NULL CHECK (jsonb_typeof(parameters) = 'array'),
  request_schema jsonb NOT NULL CHECK (jsonb_typeof(request_schema) = 'object'),
  response_schema jsonb NOT NULL CHECK (jsonb_typeof(response_schema) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, workspace_id, document_id, endpoint_id),
  UNIQUE (organization_id, workspace_id, document_id, method, path),
  FOREIGN KEY (organization_id, workspace_id, document_id)
    REFERENCES api_doc_projects (organization_id, workspace_id, document_id) ON DELETE CASCADE
);

CREATE TABLE api_doc_errors (
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  document_id uuid NOT NULL,
  error_id uuid NOT NULL,
  error_code text NOT NULL CHECK (length(trim(error_code)) BETWEEN 1 AND 120),
  http_status smallint NOT NULL CHECK (http_status BETWEEN 400 AND 599),
  message text NOT NULL CHECK (length(trim(message)) BETWEEN 1 AND 500),
  cause text NOT NULL CHECK (length(trim(cause)) BETWEEN 1 AND 1000),
  example jsonb NOT NULL CHECK (jsonb_typeof(example) = 'object'),
  suggested_solution text NOT NULL CHECK (length(trim(suggested_solution)) BETWEEN 1 AND 1200),
  is_common boolean NOT NULL DEFAULT false,
  PRIMARY KEY (organization_id, workspace_id, document_id, error_id),
  UNIQUE (organization_id, workspace_id, document_id, error_code),
  FOREIGN KEY (organization_id, workspace_id, document_id)
    REFERENCES api_doc_projects (organization_id, workspace_id, document_id) ON DELETE CASCADE
);

CREATE TABLE api_doc_examples (
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  document_id uuid NOT NULL,
  example_id uuid NOT NULL,
  language text NOT NULL CHECK (language IN ('curl', 'python')),
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 180),
  request_sample text NOT NULL CHECK (length(trim(request_sample)) BETWEEN 1 AND 8000),
  response_sample text NOT NULL CHECK (length(trim(response_sample)) BETWEEN 1 AND 8000),
  notes text NOT NULL CHECK (length(trim(notes)) BETWEEN 1 AND 1200),
  PRIMARY KEY (organization_id, workspace_id, document_id, example_id),
  FOREIGN KEY (organization_id, workspace_id, document_id)
    REFERENCES api_doc_projects (organization_id, workspace_id, document_id) ON DELETE CASCADE
);

CREATE TABLE api_doc_quickstarts (
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  document_id uuid NOT NULL,
  installation text NOT NULL CHECK (length(trim(installation)) BETWEEN 1 AND 2000),
  first_call text NOT NULL CHECK (length(trim(first_call)) BETWEEN 1 AND 4000),
  expected_result text NOT NULL CHECK (length(trim(expected_result)) BETWEEN 1 AND 2000),
  next_step text NOT NULL CHECK (length(trim(next_step)) BETWEEN 1 AND 1000),
  troubleshooting text NOT NULL CHECK (length(trim(troubleshooting)) BETWEEN 1 AND 2000),
  PRIMARY KEY (organization_id, workspace_id, document_id),
  FOREIGN KEY (organization_id, workspace_id, document_id)
    REFERENCES api_doc_projects (organization_id, workspace_id, document_id) ON DELETE CASCADE
);

CREATE TABLE api_doc_builds (
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  document_id uuid NOT NULL,
  build_id uuid NOT NULL,
  source_snapshot jsonb NOT NULL,
  markdown text NOT NULL CHECK (length(markdown) > 0),
  source_sha256 text NOT NULL CHECK (source_sha256 ~ '^[a-f0-9]{64}$'),
  created_by text NOT NULL CHECK (length(created_by) BETWEEN 1 AND 255),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, workspace_id, build_id),
  FOREIGN KEY (organization_id, workspace_id, document_id)
    REFERENCES api_doc_projects (organization_id, workspace_id, document_id) ON DELETE RESTRICT
);

CREATE TABLE public_api_docs (
  build_id uuid PRIMARY KEY,
  source_snapshot jsonb NOT NULL,
  markdown text NOT NULL,
  source_sha256 text NOT NULL CHECK (source_sha256 ~ '^[a-f0-9]{64}$'),
  published_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE outbox_events (
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  event_id uuid NOT NULL,
  aggregate_type text NOT NULL CHECK (length(aggregate_type) BETWEEN 1 AND 80),
  aggregate_id uuid NOT NULL,
  event_type text NOT NULL CHECK (length(event_type) BETWEEN 1 AND 160),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  published_at timestamptz,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error text,
  PRIMARY KEY (organization_id, workspace_id, event_id),
  FOREIGN KEY (organization_id, workspace_id)
    REFERENCES workspaces (organization_id, workspace_id) ON DELETE CASCADE
);

REVOKE ALL ON public_api_docs FROM PUBLIC;
GRANT SELECT, INSERT ON public_api_docs TO p10_runtime;

DO $$ DECLARE table_name text; BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'api_doc_projects', 'api_doc_endpoints', 'api_doc_errors',
    'api_doc_examples', 'api_doc_quickstarts', 'api_doc_builds', 'outbox_events'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I TO p10_runtime USING '
      '(organization_id = current_organization_id()) WITH CHECK '
      '(organization_id = current_organization_id())',
      table_name || '_tenant', table_name
    );
    EXECUTE format('REVOKE ALL ON %I FROM PUBLIC', table_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE ON %I TO p10_runtime', table_name);
  END LOOP;
END $$;

REVOKE UPDATE ON api_doc_builds FROM p10_runtime;

COMMIT;
