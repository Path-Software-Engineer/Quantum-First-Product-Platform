-- Run as a migration owner, never with the runtime connection.
BEGIN;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'p10_runtime') THEN
    CREATE ROLE p10_runtime NOLOGIN NOBYPASSRLS;
  END IF;
END $$;

CREATE TABLE organizations (
  organization_id uuid PRIMARY KEY,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  display_name text NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 160),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE workspaces (
  organization_id uuid NOT NULL REFERENCES organizations (organization_id),
  workspace_id uuid NOT NULL,
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  display_name text NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 160),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, workspace_id),
  UNIQUE (organization_id, slug)
);

CREATE TABLE memberships (
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  subject_id text NOT NULL CHECK (length(subject_id) BETWEEN 1 AND 255),
  role text NOT NULL CHECK (role IN ('owner', 'editor', 'reviewer', 'viewer')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, workspace_id, subject_id),
  FOREIGN KEY (organization_id, workspace_id)
    REFERENCES workspaces (organization_id, workspace_id) ON DELETE CASCADE
);

-- Missing/empty context evaluates to NULL and cannot match any tenant.
-- An invalid nonempty UUID fails closed with a cast error.
CREATE FUNCTION current_organization_id() RETURNS uuid
LANGUAGE sql STABLE SET search_path = pg_catalog AS $$
  SELECT nullif(current_setting('app.organization_id', true), '')::uuid
$$;

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
CREATE POLICY organizations_tenant ON organizations TO p10_runtime
  USING (organization_id = current_organization_id());

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces FORCE ROW LEVEL SECURITY;
CREATE POLICY workspaces_tenant ON workspaces TO p10_runtime
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships FORCE ROW LEVEL SECURITY;
CREATE POLICY memberships_tenant ON memberships TO p10_runtime
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

REVOKE ALL ON organizations, workspaces, memberships FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO p10_runtime;
GRANT EXECUTE ON FUNCTION current_organization_id() TO p10_runtime;
GRANT SELECT ON organizations TO p10_runtime;
GRANT SELECT, INSERT, UPDATE ON workspaces TO p10_runtime;
GRANT SELECT, INSERT, UPDATE ON memberships TO p10_runtime;

COMMIT;
