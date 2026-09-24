import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const buildId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

const publishedBuild = {
  buildId,
  sourceSha256: "a".repeat(64),
  publishedAt: "2026-09-18T00:00:00.000Z",
  sourceSnapshot: {
    schemaVersion: "p10.one-pager.v1",
    product: {
      displayName: "Quantum Planner",
      summary: "Synthetic browser fixture used only for acceptance testing.",
    },
    version: { versionNumber: 1, changeSummary: "Acceptance fixture" },
    capabilities: [
      {
        key: "catalog-governance",
        title: "Governed catalog",
        description: "Maintains versioned product content.",
        maturity: "validated",
        limitations: "The fixture is not a customer claim.",
      },
    ],
    useCases: [
      {
        key: "review-product-copy",
        actor: "Product reviewer",
        problem: "Claims need traceable evidence.",
        workflow: "Review evidence before publication.",
        expected_outcome: "Only approved claims reach the public projection.",
        evidence_status: "synthetic-test",
      },
    ],
    claims: [
      {
        statement:
          "This synthetic statement exercises the approved-claim renderer.",
        evidence_title: "Local acceptance evidence",
        source_uri: "https://example.com/acceptance-fixture",
        source_kind: "synthetic-test",
        notes: "Not a testimonial, customer result, or production metric.",
      },
    ],
    commercialScenarios: [
      {
        key: "planning-only",
        packaging: "Illustrative package",
        pricing: "No price committed",
        licensing: "No license offered",
        assumptions: "Acceptance-test fixture only",
        is_hypothetical: true,
      },
    ],
  },
};

test("shows a safe empty state without inventing public content", async ({
  page,
}) => {
  await page.goto("/one-pager");
  await expect(
    page.getByRole("heading", { name: "Open a versioned one-pager build." }),
  ).toBeVisible();
  await expect(
    page.getByText("Drafts and unreviewed claims are never rendered here."),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("renders a published immutable snapshot with provenance and warnings", async ({
  page,
}) => {
  await page.route(`**/api/v1/public/one-pagers/${buildId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(publishedBuild),
    });
  });
  await page.goto(`/one-pager?build=${buildId}`);
  await expect(
    page.getByRole("heading", { name: "Quantum Planner" }),
  ).toBeVisible();
  await expect(page.getByText("Governed catalog")).toBeVisible();
  await expect(page.getByText("Product reviewer")).toBeVisible();
  await expect(
    page.getByText(
      "This synthetic statement exercises the approved-claim renderer.",
    ),
  ).toBeVisible();
  await expect(
    page.getByText("Hypothetical planning scenarios."),
  ).toBeVisible();
  await expect(page.getByText("a".repeat(64))).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("explains an unavailable published build", async ({ page }) => {
  await page.route("**/api/v1/public/one-pagers/**", async (route) => {
    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: "{}",
    });
  });
  await page.goto(`/one-pager?build=${buildId}`);
  await expect(page.getByRole("alert")).toContainText("could not be loaded");
});
