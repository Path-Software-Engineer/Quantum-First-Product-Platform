BEGIN;

CREATE TABLE products (
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  product_id uuid NOT NULL,
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  display_name text NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 160),
  summary text NOT NULL CHECK (length(trim(summary)) BETWEEN 1 AND 2000),
  created_by text NOT NULL CHECK (length(created_by) BETWEEN 1 AND 255),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, workspace_id, product_id),
  UNIQUE (organization_id, workspace_id, slug),
  FOREIGN KEY (organization_id, workspace_id)
    REFERENCES workspaces (organization_id, workspace_id) ON DELETE CASCADE
);

CREATE TABLE product_versions (
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  product_id uuid NOT NULL,
  version_id uuid NOT NULL,
  version_number integer NOT NULL CHECK (version_number > 0),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_review', 'approved', 'published', 'superseded')),
  change_summary text NOT NULL CHECK (length(trim(change_summary)) BETWEEN 1 AND 1000),
  created_by text NOT NULL CHECK (length(created_by) BETWEEN 1 AND 255),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, workspace_id, version_id),
  UNIQUE (organization_id, workspace_id, product_id, version_number),
  FOREIGN KEY (organization_id, workspace_id, product_id)
    REFERENCES products (organization_id, workspace_id, product_id) ON DELETE CASCADE
);

CREATE TABLE capabilities (
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  version_id uuid NOT NULL,
  capability_id uuid NOT NULL,
  capability_key text NOT NULL CHECK (capability_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 160),
  description text NOT NULL CHECK (length(trim(description)) BETWEEN 1 AND 3000),
  maturity text NOT NULL CHECK (maturity IN ('hypothesis', 'planned', 'available', 'retired')),
  limitations text NOT NULL CHECK (length(trim(limitations)) BETWEEN 1 AND 2000),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, workspace_id, version_id, capability_id),
  UNIQUE (organization_id, workspace_id, version_id, capability_key),
  FOREIGN KEY (organization_id, workspace_id, version_id)
    REFERENCES product_versions (organization_id, workspace_id, version_id) ON DELETE CASCADE
);

CREATE TABLE use_cases (
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  version_id uuid NOT NULL,
  use_case_id uuid NOT NULL,
  use_case_key text NOT NULL CHECK (use_case_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  actor text NOT NULL CHECK (length(trim(actor)) BETWEEN 1 AND 160),
  problem text NOT NULL CHECK (length(trim(problem)) BETWEEN 1 AND 2000),
  workflow text NOT NULL CHECK (length(trim(workflow)) BETWEEN 1 AND 3000),
  expected_outcome text NOT NULL CHECK (length(trim(expected_outcome)) BETWEEN 1 AND 2000),
  evidence_status text NOT NULL CHECK (evidence_status IN ('hypothesis', 'sourced')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, workspace_id, version_id, use_case_id),
  UNIQUE (organization_id, workspace_id, version_id, use_case_key),
  FOREIGN KEY (organization_id, workspace_id, version_id)
    REFERENCES product_versions (organization_id, workspace_id, version_id) ON DELETE CASCADE
);

CREATE TABLE capability_dependencies (
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  version_id uuid NOT NULL,
  capability_id uuid NOT NULL,
  depends_on_capability_id uuid NOT NULL,
  PRIMARY KEY (
    organization_id, workspace_id, version_id, capability_id, depends_on_capability_id
  ),
  CHECK (capability_id <> depends_on_capability_id),
  FOREIGN KEY (organization_id, workspace_id, version_id, capability_id)
    REFERENCES capabilities (organization_id, workspace_id, version_id, capability_id)
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, workspace_id, version_id, depends_on_capability_id)
    REFERENCES capabilities (organization_id, workspace_id, version_id, capability_id)
    ON DELETE RESTRICT
);

CREATE TABLE use_case_capabilities (
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  version_id uuid NOT NULL,
  use_case_id uuid NOT NULL,
  capability_id uuid NOT NULL,
  PRIMARY KEY (organization_id, workspace_id, version_id, use_case_id, capability_id),
  FOREIGN KEY (organization_id, workspace_id, version_id, use_case_id)
    REFERENCES use_cases (organization_id, workspace_id, version_id, use_case_id)
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, workspace_id, version_id, capability_id)
    REFERENCES capabilities (organization_id, workspace_id, version_id, capability_id)
    ON DELETE RESTRICT
);

DO $$ DECLARE table_name text; BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'products', 'product_versions', 'capabilities', 'use_cases',
    'capability_dependencies', 'use_case_capabilities'
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

COMMIT;
