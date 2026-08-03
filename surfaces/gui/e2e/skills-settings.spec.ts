import { test, expect } from "./fixtures";

// SKILLS-SPEC §9 journey 1 — Settings ▸ Skills as the management home: create through the
// Add-skill menu, edit in place, disable with the amber clean-slate banner, and the
// rich-skill folder chip. Hermetic: every /v1 call lands in fixtures.ts.

const openSkills = async (page: import("@playwright/test").Page) => {
  await page.goto("/");
  await page.getByTestId("account-row").click();
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page.getByRole("button", { name: "技能", exact: true }).click();
};

test("skills-settings: create via the menu → name-first banner; edit persists", async ({ page }) => {
  await openSkills(page);

  // The seeded rows render; the rich one wears its folder chip; the list is the page
  // (no standing add-surfaces).
  await expect(page.getByText("weekly-report")).toBeVisible();
  await expect(page.getByText("uploaded")).toBeVisible();
  await expect(page.getByTitle("显示文件夹")).toContainText("2 个文件");
  await expect(page.getByText("Start a conversation")).toHaveCount(0);

  // Add skill ▾ → the three doors, then Write it myself.
  await page.getByRole("button", { name: /添加技能/ }).click();
  await expect(page.getByText("导入文件")).toBeVisible();
  await expect(page.getByText("用 OpenWorker 创建")).toBeVisible();
  await page.getByText("我自己写").click();

  await page.getByLabel("名称").fill("greet-warmly");
  await page.getByLabel("描述").fill("Greets people warmly");
  await page.getByLabel("指令").fill("Always greet warmly.");
  await page.getByRole("button", { name: "保存技能" }).click();

  // Name-first teal confirmation (§7) + the new row.
  const status = page.getByRole("status");
  await expect(status).toContainText("greet-warmly");
  await expect(status).toContainText("可以在每次对话中使用它了");
  await expect(page.getByText("Greets people warmly")).toBeVisible();

  // Edit: pencil prefills, name locked, save PATCHes through to the re-fetched list.
  await page.getByTitle("编辑").first().click();
  const name = page.getByLabel("名称");
  await expect(name).toBeDisabled();
  await page.getByLabel("描述").fill("Monday status report, sharper");
  await page.getByRole("button", { name: "保存技能" }).click();
  await expect(page.getByText("Monday status report, sharper")).toBeVisible();
});

test("skills-settings: disable → amber everywhere/clean-slate banner; delete is two-step", async ({ page }) => {
  await openSkills(page);

  await page.getByLabel("weekly-report 已启用").click();
  const status = page.getByRole("status");
  await expect(status).toContainText("weekly-report");
  await expect(status).toContainText("已处处关闭");
  await expect(status).toContainText("开启一个新对话以获得完全干净的状态");

  // Two-step delete: arm, confirm, row gone, banner names the skill.
  await page.getByLabel("删除 html-to-markdown").click();
  await expect(page.getByText("html-to-markdown")).toBeVisible(); // armed ≠ deleted
  await page.getByText("确认删除").click();
  await expect(page.getByText("html-to-markdown")).toHaveCount(1); // only the banner remains
  await expect(page.getByRole("status")).toContainText("已移除");
});
