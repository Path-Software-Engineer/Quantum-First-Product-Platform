# Sprint 1 product language v1

This is the vocabulary for software design, not an approved business thesis.
The AI55 handoff remains `pending_human_review`; none of its customer, pricing,
or value assertions are adopted here.

| Term | Meaning | Boundary |
| --- | --- | --- |
| Organization | Legal or operating tenant boundary | Every private record belongs to exactly one organization. |
| Workspace | Working area within an organization | A workspace cannot move between organizations. |
| Membership | Actor's relationship to one workspace | Possession of an account alone grants no access. |
| Product | A named, tenant-owned product concept | A name is not proof of an available capability. |
| Product version | Immutable snapshot of structured product content | Editing creates a new draft version; published versions are not overwritten. |
| Capability | A bounded behavior or capability proposal | Status and limitations travel with the capability. |
| Use case | An actor, problem, workflow and expected outcome | An expected outcome is not a measured result. |
| Customer profile | Explicit hypothesis about a potential buyer/user | Not a customer testimonial or validated segment. |
| Problem | Sourced observation or explicit hypothesis | It must identify source and confidence separately. |
| Value proposition | Proposed relationship between problem and capability | No implied performance or advantage claim. |
| Claim | A statement that could appear on a public artifact | Requires owner, evidence, independent approval and limitation. |
| Evidence reference | Stable pointer to source material or test artifact | A URL alone does not imply quality or approval. |
| Approval | Reviewer decision over one exact claim/version | Owner and reviewer must be distinct. |
| One-pager build | Reproducible rendering from an approved product version | It cannot consume unapproved draft content. |

## Invariants

1. Every workspace, catalog record, claim and audit event has an organization
   identity. Queries must be scoped by organization, including list endpoints.
2. A membership is scoped to one workspace and must be active at the time of
   an action. Roles are explicit; unknown roles or missing membership deny.
3. A product version references only capabilities, use cases and claims in its
   own organization. Cross-tenant foreign keys are invalid.
4. A claim cannot be approved by its owner. Approval binds to the claim's
   exact content hash, evidence set and limitations.
5. Only approved claims may appear in a published one-pager. Public output
   retains version and provenance identifiers.
6. Price and license entries are labeled scenarios. They cannot be rendered as
   checkout prices, quotes, commitments or contractual terms.

## Lifecycles

Product version: `draft -> in_review -> approved -> published -> superseded`.
Rejection returns a version to `draft` with a recorded reason; a published
version is never edited in place.

Claim: `draft -> submitted -> approved | rejected -> retired`. Changing an
approved claim's text, evidence or limitation creates a new draft revision;
the old approval does not carry forward.

Evidence reference: `proposed -> reviewed -> accepted | rejected`. A source
can later be `withdrawn`, which blocks new publication and triggers review of
dependent public claims rather than silently rewriting past artifacts.

## Acceptance examples

- A member of organization A requests a product of B: return no private data,
  including through list, detail, search and error messages.
- The owner submits a claim and tries to approve it: deny and audit the attempt.
- An approved claim is edited: its new revision is draft and cannot publish.
- A one-pager build with a pending claim: fail with a precise validation error,
  never render a partial public page.
- A hypothetical pricing scenario: render its assumptions and "hypothesis"
  label wherever it is shown.
