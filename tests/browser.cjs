const { chromium } = require(
  process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
    ? process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + "/playwright"
    : "playwright",
);
const assert = require("node:assert/strict");
const path = require("node:path");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_EXECUTABLE_PATH
      ? {
          executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
          args: ["--no-sandbox", "--disable-dev-shm-usage"],
        }
      : {}),
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("file://" + path.resolve(__dirname, "../index.html"));
  await page.locator("#example").click();
  await page
    .locator("#field-name")
    .fill("Garden 🌱 <img src=x onerror=alert(1)>");
  await page.reload();
  assert.match(await page.locator("#field-name").inputValue(), /Garden 🌱/);
  assert.equal(await page.locator("#preview img").count(), 0);
  await page.locator("#output-type").selectOption("agent");
  assert.match(
    await page.locator("#preview").innerText(),
    /Implementation handoff/,
  );
  await page.locator("#output-type").selectOption("issues");
  assert.match(await page.locator("#preview").innerText(), /TASK-001/);
  const [backup] = await Promise.all([
    page.waitForEvent("download"),
    page.locator("#export-json").click(),
  ]);
  const backupPath = await backup.path();
  const fs = require("node:fs");
  const data = JSON.parse(fs.readFileSync(backupPath, "utf8"));
  assert.equal(data.project.name, "Garden 🌱 <img src=x onerror=alert(1)>");
  assert.equal(data.project.token, undefined);
  await page.locator("#import-file").setInputFiles(backupPath);
  await page.waitForFunction(
    () => document.querySelectorAll("#project-list option").length === 3,
  );
  assert.equal(await page.locator("#project-list option").count(), 3);
  const requests = [];
  let mode = "success";
  await page.route("https://api.github.com/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const body = req.postDataJSON();
    requests.push({ path: url.pathname, method: req.method(), body });
    let response = {};
    let status = 200;
    if (mode === "fail" && url.pathname.endsWith("/pulls")) {
      status = 403;
      response = { message: "Permission denied" };
    } else if (url.pathname.endsWith("/issues"))
      response = { html_url: "https://github.com/test/garden/issues/1" };
    else if (url.pathname === "/user/repos")
      response = {
        full_name: "test/new-garden",
        default_branch: "main",
        html_url: "https://github.com/test/new-garden",
      };
    else if (url.pathname.endsWith("/git/ref/heads/main"))
      response = { object: { sha: "base123" } };
    else if (req.method() === "GET" && url.pathname.includes("/contents/")) {
      status = 404;
      response = { message: "Not found" };
    } else if (url.pathname.endsWith("/pulls"))
      response = { html_url: "https://github.com/test/garden/pull/2" };
    else response = { default_branch: "main" };
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });
  await page.locator("#github-open").click();
  await page.locator("#token").fill("test-token-secret");
  await page.locator("#gh-repo").fill("test/garden");
  await page.locator("#publish").click();
  await page.getByText("Planning issue created.").waitFor();
  assert.equal(requests.at(-1).body.title, "Plan: " + data.project.name);
  await page.locator("#gh-action").selectOption("pr");
  await page.locator("#publish").click();
  await page.getByText("Specification PR opened.").waitFor();
  const commit = requests.find((r) => r.method === "PUT");
  assert.notEqual(commit.body.branch, "main");
  assert.match(
    Buffer.from(commit.body.content, "base64").toString("utf8"),
    /Garden 🌱/,
  );
  assert.equal(requests.at(-1).body.base, "main");
  mode = "fail";
  await page.locator("#gh-title").fill("Test failed PR");
  await page.locator("#publish").click();
  await page.getByText(/GitHub 403/).waitFor();
  assert.match(
    await page.locator("#github-result").innerText(),
    /branch created/,
  );
  mode = "success";
  await page.locator("#gh-action").selectOption("repo");
  await page.locator("#gh-repo").fill("new-garden");
  await page.locator("#publish").click();
  await page.getByText("Specification committed.").waitFor();
  assert.equal(
    requests.find((r) => r.path === "/user/repos").body.private,
    true,
  );
  assert(
    !(
      await page.evaluate(() => localStorage.getItem("fertilizer.workspace.v1"))
    ).includes("test-token-secret"),
  );
  await page.locator("#disconnect").click();
  assert.equal(await page.locator("#token").inputValue(), "");
  await page.locator("#github-close").click();
  // Review feedback: invalid JSON roots produce an actionable error, not a TypeError.
  for (const root of [null, [], 42, {}]) {
    await page.locator("#import-file").setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(root)),
    });
    await page.waitForFunction(() =>
      document
        .getElementById("status")
        .textContent.includes("Expected a version 1"),
    );
  }
  assert.equal(await page.locator("#project-list option").count(), 3);
  // Programmatic over-limit inputs must also obey the editor's persistence contract.
  const oldIdea = await page.locator("#field-idea").inputValue();
  await page.locator("#field-idea").evaluate((el) => {
    el.value = "x".repeat(100001);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  assert.equal(await page.locator("#field-idea").inputValue(), oldIdea);
  await page.reload();
  assert.equal(await page.locator("#project-list option").count(), 3);
  assert.equal(await page.locator("#field-idea").inputValue(), oldIdea);
  await page.locator("#field-idea").fill("x".repeat(100000));
  await page.reload();
  assert.equal((await page.locator("#field-idea").inputValue()).length, 100000);
  await page.locator("#github-open").click();
  assert.equal(
    await page
      .getByRole("dialog", { name: "Send a reviewed plan to GitHub" })
      .count(),
    1,
  );
  await page.locator("#gh-action").selectOption("issue");
  assert(await page.locator("#publish").isDisabled());
  assert.match(await page.locator("#publish-validation").innerText(), /65,536/);
  const beforeLimit = requests.length;
  await page.evaluate(() => document.getElementById("publish").onclick());
  assert.equal(requests.length, beforeLimit);
  await page.locator("#gh-action").selectOption("pr");
  assert(!(await page.locator("#publish").isDisabled()));
  await page.locator("#gh-title").evaluate((el) => {
    el.value = "x".repeat(257);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  assert(await page.locator("#publish").isDisabled());
  assert.match(await page.locator("#publish-validation").innerText(), /256/);
  await page.locator("#github-close").click();
  await page.locator("#field-idea").fill(oldIdea);
  // Pin IDs, reorder requirements, then ensure task-specific context remains correctly linked.
  await page.evaluate(() => {
    project().requirements = project()
      .requirements.split("\n")
      .reverse()
      .join("\n");
    save();
    render();
  });
  await page.locator("#output-type").selectOption("task");
  await page.locator("#task-select").selectOption("TASK-002");
  const taskOutput = await page.locator("#preview").innerText();
  assert.match(taskOutput, /REQ-002.*Export specification/);
  const linked = taskOutput
    .split("## Linked requirements")[1]
    .split("## Dependencies")[0];
  assert(!linked.includes("REQ-001"));
  assert.match(linked, /AC-002/);
  await page.locator("#publish-task").click();
  await page.locator("#token").fill("test-token-secret");
  await page.locator("#gh-repo").fill("test/garden");
  const reviewedTask = await page.locator("#gh-payload").inputValue();
  await page.locator("#publish").click();
  await page.getByText("Planning issue created.").waitFor();
  assert.equal(requests.at(-1).body.body, reviewedTask);
  assert.match(requests.at(-1).body.title, /TASK-002/);
  const beforeDuplicate = requests.length;
  await page.locator("#publish").click();
  await page.getByText(/already succeeded/).waitFor();
  assert.equal(requests.length, beforeDuplicate);
  await page.locator("#github-close").click();
  await page.evaluate(() => {
    project().tasks =
      "[TASK-001] First | REQ-999 | depends: TASK-002\n[TASK-002] Second | depends: TASK-001";
    save();
    render();
  });
  await page.locator("#output-type").selectOption("review");
  const report = await page.locator("#preview").innerText();
  assert.match(report, /Unknown requirement references: REQ-999/);
  assert.match(report, /contain a cycle/);
  await page
    .locator("#questions button")
    .filter({ hasText: "Task dependencies contain a cycle" })
    .click();
  assert(
    await page
      .locator("#field-tasks")
      .evaluate((el) => el === document.activeElement),
  );
  // Recovery keeps good projects visible and protects original data even when editing.
  const damaged = await page.evaluate(() => {
    const key = "fertilizer.workspace.v1";
    const data = JSON.parse(localStorage.getItem(key));
    data.projects.push({ name: "Bad project", idea: 42 });
    const raw = JSON.stringify(data);
    localStorage.setItem(key, raw);
    return raw;
  });
  await page.reload();
  assert(await page.locator("#recovery").isVisible());
  assert.equal(await page.locator("#project-list option").count(), 3);
  await page.locator("#field-name").fill("Recovered project");
  assert.equal(
    await page.evaluate(() => localStorage.getItem("fertilizer.workspace.v1")),
    damaged,
  );
  const [recoveryFile] = await Promise.all([
    page.waitForEvent("download"),
    page.locator("#download-recovery").click(),
  ]);
  assert.equal(fs.readFileSync(await recoveryFile.path(), "utf8"), damaged);
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#accept-recovery").click();
  await page.reload();
  assert(!(await page.locator("#recovery").isVisible()));
  assert.equal(
    await page.locator("#field-name").inputValue(),
    "Recovered project",
  );
  // A competing tab cannot silently overwrite the latest saved workspace.
  await page.evaluate(() => {
    const key = "fertilizer.workspace.v1";
    const data = JSON.parse(localStorage.getItem(key));
    data.projects[0].name = "Changed in another tab";
    localStorage.setItem(key, JSON.stringify(data));
  });
  await page.locator("#field-name").fill("My local edits");
  assert(await page.locator("#recovery").isVisible());
  assert.match(
    await page.locator("#recovery-message").innerText(),
    /Another tab/,
  );

  await page.setViewportSize({ width: 390, height: 844 });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: persistence, safe rendering, exports, import, handoff, backlog, issue, PR, partial failures, private repository creation, token exclusion, payload limits, import roots, editor limits, task exports, pinned IDs, review diagnostics, recovery, concurrent tab protection, mobile layout.",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
