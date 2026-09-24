import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const buildId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const build = {
  buildId,
  sourceSha256: "c".repeat(64),
  publishedAt: "2026-09-24T00:00:00.000Z",
  markdown: "# Synthetic Jobs API",
  sourceSnapshot: {
    document: { apiName: "Synthetic Jobs API", apiVersion: "v1", description: "A reviewed synthetic developer contract.", authModel: "Bearer token", baseUrl: "https://api.example.invalid", rateLimits: "60 requests per minute", serviceStatus: "beta" },
    endpoints: [{ endpointId: "endpoint", method: "POST", path: "/v1/jobs", summary: "Create a synthetic job", description: "Accepts one bounded work item.", tags: ["jobs"], useCase: "Verify the developer journey." }],
    errors: [{ errorId: "error", httpStatus: 422, errorCode: "INVALID_JOB", message: "The job payload is invalid.", cause: "A required field is absent.", suggestedSolution: "Add the required name field.", isCommon: true }],
    examples: [{ exampleId: "example", language: "curl", title: "Create with curl", requestSample: "curl -X POST https://api.example.invalid/v1/jobs", responseSample: '{"jobId":"synthetic"}', notes: "Non-production example." }],
    quickstart: { installation: "No SDK is required.", firstCall: "curl https://api.example.invalid/health", expectedResult: "A synthetic HTTP 200.", nextStep: "Create one job.", troubleshooting: "Verify the placeholder token." },
    limitations: "Generated from reviewed metadata; implementation behavior is not verified.",
  },
};

test("keeps draft developer docs private through a safe empty state", async ({ page }) => {
  await page.goto("/developer-docs");
  await expect(page.getByRole("heading", { name: "API docs developers can trust." })).toBeVisible();
  await expect(page.getByText("Draft metadata")).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("renders a reviewed quickstart, reference, errors and examples", async ({ page }) => {
  await page.route(`**/api/v1/public/developer-docs/${buildId}`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(build) }));
  await page.goto(`/developer-docs?build=${buildId}`);
  await expect(page.getByRole("heading", { name: "Synthetic Jobs API" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quickstart" })).toBeVisible();
  await expect(page.getByText("POST", { exact: true })).toBeVisible();
  await expect(page.getByText("422 · INVALID_JOB · common")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Copy-ready examples" })).toBeVisible();
  await expect(page.getByText("c".repeat(64))).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("shows a bounded error when a build is unavailable", async ({ page }) => {
  await page.route("**/api/v1/public/developer-docs/**", (route) => route.fulfill({ status: 404, body: "{}" }));
  await page.goto(`/developer-docs?build=${buildId}`);
  await expect(page.getByRole("alert")).toContainText("could not be loaded");
});
