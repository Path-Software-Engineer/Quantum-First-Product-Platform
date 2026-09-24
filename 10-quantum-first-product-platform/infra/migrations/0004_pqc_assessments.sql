BEGIN;

CREATE TABLE pqc_assessments (
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  version_id uuid NOT NULL,
  assessment_id uuid NOT NULL,
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 180),
  industry text NOT NULL CHECK (length(trim(industry)) BETWEEN 1 AND 120),
  critical_systems text NOT NULL CHECK (length(trim(critical_systems)) BETWEEN 1 AND 2000),
  sensitive_data text NOT NULL CHECK (length(trim(sensitive_data)) BETWEEN 1 AND 2000),
  maturity text NOT NULL CHECK (maturity IN ('initial', 'developing', 'managed')),
  primary_concern text NOT NULL CHECK (length(trim(primary_concern)) BETWEEN 1 AND 1000),
  assessment_scope text NOT NULL CHECK (length(trim(assessment_scope)) BETWEEN 1 AND 2000),
  assumptions text NOT NULL CHECK (length(trim(assumptions)) BETWEEN 1 AND 2000),
  evidence_basis text NOT NULL CHECK (evidence_basis IN ('self_reported', 'document_review', 'technical_observation')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed')),
  created_by text NOT NULL CHECK (length(created_by) BETWEEN 1 AND 255),
  reviewed_by text,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  PRIMARY KEY (organization_id, workspace_id, assessment_id),
  FOREIGN KEY (organization_id, workspace_id, version_id)
    REFERENCES product_versions (organization_id, workspace_id, version_id) ON DELETE RESTRICT,
  CHECK (
    (status = 'draft' AND reviewed_by IS NULL AND reviewed_at IS NULL)
    OR
    (status = 'reviewed' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
  )
);

CREATE TABLE crypto_inventory_items (
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  assessment_id uuid NOT NULL,
  item_id uuid NOT NULL,
  system_name text NOT NULL CHECK (length(trim(system_name)) BETWEEN 1 AND 180),
  algorithm text NOT NULL CHECK (algorithm IN ('RSA', 'ECC', 'HYBRID', 'OTHER', 'UNKNOWN')),
  protocol text NOT NULL CHECK (length(trim(protocol)) BETWEEN 1 AND 180),
  data_class text NOT NULL CHECK (length(trim(data_class)) BETWEEN 1 AND 180),
  criticality text NOT NULL CHECK (criticality IN ('low', 'medium', 'high')),
  exposure text NOT NULL CHECK (exposure IN ('internal', 'partner', 'internet')),
  retention text NOT NULL CHECK (retention IN ('short', 'medium', 'long')),
  crypto_agility text NOT NULL CHECK (crypto_agility IN ('high', 'medium', 'low')),
  evidence_note text NOT NULL CHECK (length(trim(evidence_note)) BETWEEN 1 AND 2000),
  risk_score smallint NOT NULL CHECK (risk_score BETWEEN 4 AND 12),
  risk_tier text NOT NULL CHECK (risk_tier IN ('low', 'medium', 'high')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, workspace_id, assessment_id, item_id),
  FOREIGN KEY (organization_id, workspace_id, assessment_id)
    REFERENCES pqc_assessments (organization_id, workspace_id, assessment_id) ON DELETE CASCADE
);

CREATE TABLE pqc_recommendations (
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  assessment_id uuid NOT NULL,
  recommendation_id uuid NOT NULL,
  item_id uuid NOT NULL,
  action text NOT NULL CHECK (length(trim(action)) BETWEEN 1 AND 1200),
  priority text NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  dependency text NOT NULL CHECK (length(trim(dependency)) BETWEEN 1 AND 1000),
  limitation text NOT NULL CHECK (length(trim(limitation)) BETWEEN 1 AND 1200),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, workspace_id, assessment_id, recommendation_id),
  FOREIGN KEY (organization_id, workspace_id, assessment_id, item_id)
    REFERENCES crypto_inventory_items (organization_id, workspace_id, assessment_id, item_id) ON DELETE CASCADE
);

CREATE TABLE pqc_roadmap_phases (
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  assessment_id uuid NOT NULL,
  phase_id uuid NOT NULL,
  phase_number smallint NOT NULL CHECK (phase_number BETWEEN 1 AND 5),
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 160),
  objective text NOT NULL CHECK (length(trim(objective)) BETWEEN 1 AND 1200),
  exit_criteria text NOT NULL CHECK (length(trim(exit_criteria)) BETWEEN 1 AND 1200),
  operational_risks text NOT NULL CHECK (length(trim(operational_risks)) BETWEEN 1 AND 1200),
  PRIMARY KEY (organization_id, workspace_id, assessment_id, phase_id),
  UNIQUE (organization_id, workspace_id, assessment_id, phase_number),
  FOREIGN KEY (organization_id, workspace_id, assessment_id)
    REFERENCES pqc_assessments (organization_id, workspace_id, assessment_id) ON DELETE CASCADE
);

CREATE TABLE pqc_report_builds (
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  assessment_id uuid NOT NULL,
  build_id uuid NOT NULL,
  source_snapshot jsonb NOT NULL,
  source_sha256 text NOT NULL CHECK (source_sha256 ~ '^[a-f0-9]{64}$'),
  created_by text NOT NULL CHECK (length(created_by) BETWEEN 1 AND 255),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, workspace_id, build_id),
  FOREIGN KEY (organization_id, workspace_id, assessment_id)
    REFERENCES pqc_assessments (organization_id, workspace_id, assessment_id) ON DELETE RESTRICT
);

CREATE TABLE public_pqc_reports (
  build_id uuid PRIMARY KEY,
  source_snapshot jsonb NOT NULL,
  source_sha256 text NOT NULL CHECK (source_sha256 ~ '^[a-f0-9]{64}$'),
  published_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON public_pqc_reports FROM PUBLIC;
GRANT SELECT, INSERT ON public_pqc_reports TO p10_runtime;

DO $$ DECLARE table_name text; BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'pqc_assessments', 'crypto_inventory_items', 'pqc_recommendations',
    'pqc_roadmap_phases', 'pqc_report_builds'
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

REVOKE UPDATE ON crypto_inventory_items, pqc_recommendations,
  pqc_roadmap_phases, pqc_report_builds FROM p10_runtime;

COMMIT;
