import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const buildId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const publishedReport = {
  buildId,
  sourceSha256: "b".repeat(64),
  publishedAt: "2026-09-24T00:00:00.000Z",
  sourceSnapshot: {
    schemaVersion: "p10.pqc-report.v1",
    disclaimer:
      "Readiness planning from declared evidence; not an audit, certification, exploitability finding or migration guarantee.",
    scoreRubric:
      "Four factors from 1 to 3 produce 4–12: low 4–6, medium 7–9, high 10–12.",
    assessment: {
      title: "Synthetic PQC readiness report",
      industry: "Synthetic financial services",
      maturity: "initial",
      primaryConcern: "Prioritize cryptographic discovery",
      scope: "Synthetic browser fixture only",
      assumptions: "No active scanner or production access",
      evidenceBasis: "self_reported",
      reviewNote: "Evidence boundary and limitations reviewed.",
    },
    executiveSummary: {
      inventoryItems: 1,
      highPriorityItems: 1,
      highestTier: "high",
      nextAction:
        "Validate high-priority inventory evidence before selecting migration controls.",
    },
    inventory: [
      {
        itemId: "11111111-1111-4111-8111-111111111111",
        systemName: "Synthetic identity gateway",
        algorithm: "RSA",
        protocol: "TLS",
        dataClass: "Synthetic long-lived records",
        evidenceNote: "Self-reported fixture; not independently discovered.",
        riskScore: 12,
        riskTier: "high",
        scoreFactors: {
          criticality: 3,
          exposure: 3,
          retention: 3,
          cryptoAgility: 3,
        },
      },
    ],
    recommendations: [
      {
        recommendationId: "22222222-2222-4222-8222-222222222222",
        action:
          "Validate the declared dependency and establish a crypto-agility owner.",
        priority: "high",
        dependency: "System owner and protocol inventory",
        limitation: "This report does not select a migration algorithm.",
      },
    ],
    roadmap: Array.from({ length: 5 }, (_, index) => ({
      phaseId: `33333333-3333-4333-8333-33333333333${index}`,
      phaseNumber: index + 1,
      title: `Synthetic phase ${index + 1}`,
      objective: "Advance one bounded readiness step.",
      exitCriteria: "Reviewer-verifiable evidence exists.",
      operationalRisks: "Change windows and dependencies require validation.",
    })),
  },
};

test("keeps draft reports private through a safe empty state", async ({
  page,
}) => {
  await page.goto("/pqc-report");
  await expect(
    page.getByRole("heading", { name: "Open a reviewed readiness report." }),
  ).toBeVisible();
  await expect(page.getByText("Draft inventories are private")).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("renders evidence, score factors, recommendations and roadmap accessibly", async ({
  page,
}) => {
  await page.route(`**/api/v1/public/pqc-reports/${buildId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(publishedReport),
    });
  });
  await page.goto(`/pqc-report?build=${buildId}`);
  await expect(
    page.getByRole("heading", { name: "Synthetic PQC readiness report" }),
  ).toBeVisible();
  await expect(page.getByText("not an audit, certification")).toBeVisible();
  await expect(page.getByText("high · 12/12")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Recommendation cards" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Five-phase migration roadmap" }),
  ).toBeVisible();
  await expect(page.locator("ol li")).toHaveCount(5);
  await expect(page.getByText("b".repeat(64))).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("explains an unavailable report without exposing private data", async ({
  page,
}) => {
  await page.route("**/api/v1/public/pqc-reports/**", async (route) => {
    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: "{}",
    });
  });
  await page.goto(`/pqc-report?build=${buildId}`);
  await expect(page.getByRole("alert")).toContainText("could not be loaded");
});
