BEGIN;

CREATE TABLE evidence_references (
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  version_id uuid NOT NULL,
  evidence_id uuid NOT NULL,
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 240),
  source_uri text NOT NULL CHECK (source_uri ~ '^https?://'),
  source_kind text NOT NULL CHECK (source_kind IN ('primary', 'standard', 'internal')),
  notes text NOT NULL CHECK (length(trim(notes)) BETWEEN 1 AND 2000),
  created_by text NOT NULL CHECK (length(created_by) BETWEEN 1 AND 255),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, workspace_id, version_id, evidence_id),
  FOREIGN KEY (organization_id, workspace_id, version_id)
    REFERENCES product_versions (organization_id, workspace_id, version_id) ON DELETE CASCADE
);

CREATE TABLE product_claims (
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  version_id uuid NOT NULL,
  claim_id uuid NOT NULL,
  evidence_id uuid NOT NULL,
  statement text NOT NULL CHECK (length(trim(statement)) BETWEEN 1 AND 2000),
  owner_subject_id text NOT NULL CHECK (length(owner_subject_id) BETWEEN 1 AND 255),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_review', 'approved', 'rejected')),
  review_note text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, workspace_id, version_id, claim_id),
  FOREIGN KEY (organization_id, workspace_id, version_id, evidence_id)
    REFERENCES evidence_references (organization_id, workspace_id, version_id, evidence_id)
    ON DELETE RESTRICT,
  CHECK (
    (status IN ('draft', 'in_review') AND reviewed_by IS NULL AND reviewed_at IS NULL)
    OR
    (status IN ('approved', 'rejected') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
  )
);

CREATE TABLE commercial_scenarios (
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  version_id uuid NOT NULL,
  scenario_id uuid NOT NULL,
  scenario_key text NOT NULL CHECK (scenario_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  packaging text NOT NULL CHECK (length(trim(packaging)) BETWEEN 1 AND 1000),
  pricing text NOT NULL CHECK (length(trim(pricing)) BETWEEN 1 AND 1000),
  licensing text NOT NULL CHECK (length(trim(licensing)) BETWEEN 1 AND 1000),
  assumptions text NOT NULL CHECK (length(trim(assumptions)) BETWEEN 1 AND 2000),
  is_hypothetical boolean NOT NULL DEFAULT true CHECK (is_hypothetical),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, workspace_id, version_id, scenario_id),
  UNIQUE (organization_id, workspace_id, version_id, scenario_key),
  FOREIGN KEY (organization_id, workspace_id, version_id)
    REFERENCES product_versions (organization_id, workspace_id, version_id) ON DELETE CASCADE
);

CREATE TABLE one_pager_builds (
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  version_id uuid NOT NULL,
  build_id uuid NOT NULL,
  source_snapshot jsonb NOT NULL,
  source_sha256 text NOT NULL CHECK (source_sha256 ~ '^[a-f0-9]{64}$'),
  created_by text NOT NULL CHECK (length(created_by) BETWEEN 1 AND 255),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, workspace_id, build_id),
  FOREIGN KEY (organization_id, workspace_id, version_id)
    REFERENCES product_versions (organization_id, workspace_id, version_id) ON DELETE RESTRICT
);

CREATE TABLE audit_events (
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  event_id uuid NOT NULL,
  actor_subject_id text NOT NULL CHECK (length(actor_subject_id) BETWEEN 1 AND 255),
  action text NOT NULL CHECK (length(action) BETWEEN 1 AND 160),
  entity_type text NOT NULL CHECK (length(entity_type) BETWEEN 1 AND 80),
  entity_id uuid NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, workspace_id, event_id),
  FOREIGN KEY (organization_id, workspace_id)
    REFERENCES workspaces (organization_id, workspace_id) ON DELETE CASCADE
);

-- Deliberately contains only the approved, published projection. It has no
-- tenant identifiers, private drafts, actor identifiers or write privilege
-- beyond INSERT, so the public API cannot enumerate tenant-owned source data.
CREATE TABLE public_one_pagers (
  build_id uuid PRIMARY KEY,
  source_snapshot jsonb NOT NULL,
  source_sha256 text NOT NULL CHECK (source_sha256 ~ '^[a-f0-9]{64}$'),
  published_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON public_one_pagers FROM PUBLIC;
GRANT SELECT, INSERT ON public_one_pagers TO p10_runtime;

DO $$ DECLARE table_name text; BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'evidence_references', 'product_claims', 'commercial_scenarios',
    'one_pager_builds', 'audit_events'
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

REVOKE UPDATE ON one_pager_builds, audit_events FROM p10_runtime;

COMMIT;
