import { test, expect } from "./fixtures";

// SKILLS-SPEC §9 journey 3 — import with the mandatory review gate: the preview installs
// NOTHING; confirm installs and the row wears the `uploaded` provenance badge. Hermetic:
// stage/confirm round-trip through fixtures.ts state.

test("skills-upload: preview installs nothing → confirm → uploaded badge", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("account-row").click();
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page.getByRole("button", { name: "技能", exact: true }).click();

  // Add skill ▾ → Import a file → straight to the (hidden) picker.
  await page.getByRole("button", { name: /添加技能/ }).click();
  await page.getByText("导入文件").click();
  await page.getByLabel("上传技能归档").setInputFiles({
    name: "greet.zip",
    mimeType: "application/zip",
    buffer: Buffer.from("PKfake"),
  });

  // The mandatory review screen: everything parsed, nothing installed yet.
  await expect(page.getByText("安装前请审查")).toBeVisible();
  await expect(page.getByText("says hello")).toBeVisible();
  await expect(page.getByText("Say hello warmly.")).toBeVisible();
  await expect(page.getByText(/notes\.txt/)).toBeVisible();
  await expect(page.getByText("greet", { exact: true })).toHaveCount(1); // preview only, no row

  await page.getByRole("button", { name: "安装技能" }).click();

  // Installed: teal name-first banner, a real row with the provenance badge + folder chip.
  const status = page.getByRole("status");
  await expect(status).toContainText("greet");
  await expect(status).toContainText("可以在每次对话中使用它了");
  await expect(page.getByText("greet", { exact: true })).toHaveCount(2); // banner + the new row
  await expect(page.getByText("uploaded")).toHaveCount(2); // html-to-markdown + greet
});
