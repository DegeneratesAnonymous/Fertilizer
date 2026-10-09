// Dependency-free workflow checks using a minimal DOM harness. Browser layout is tested separately.
const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const { webcrypto } = require("node:crypto");
const html = fs.readFileSync(
  require("node:path").join(__dirname, "../index.html"),
  "utf8",
);
class Element {
  constructor() {
    this.value = "";
    this.children = [];
    this.style = {};
    this.dataset = {};
    this.textContent = "";
    this.classList = { add() {}, remove() {}, toggle() {} };
  }
  append(...items) {
    this.children.push(...items);
  }
  replaceChildren(...items) {
    this.children = items;
  }
  setAttribute() {}
  addEventListener() {}
  focus() {}
  click() {}
  showModal() {}
  close() {}
  querySelectorAll() {
    return [];
  }
}
const els = new Map();
const get = (id) => {
  if (!els.has(id)) els.set(id, new Element());
  return els.get(id);
};
get("output-type").value = "spec";
get("gh-action").value = "issue";
get("visibility").value = "private";
get("gh-path").value = "docs/SPECIFICATION.md";
let stored = null;
let failStorage = false;
const requests = [];
let failPR = false;
const context = vm.createContext({
  document: { getElementById: get, createElement: () => new Element() },
  crypto: webcrypto,
  TextEncoder,
  Blob,
  URL,
  confirm: () => true,
  navigator: { clipboard: { writeText: async () => {} } },
  localStorage: {
    getItem: () => stored,
    setItem: (k, v) => {
      if (failStorage) throw Error("quota");
      stored = v;
    },
  },
  setTimeout: () => 1,
  clearTimeout() {},
  btoa: (s) => Buffer.from(s, "binary").toString("base64"),
  fetch: async (url, options) => {
    const p = new URL(url).pathname;
    const body = options.body ? JSON.parse(options.body) : null;
    requests.push({ p, method: options.method, body });
    let status = 200,
      data = {};
    if (failPR && p.endsWith("/pulls")) {
      status = 403;
      data = { message: "Permission denied" };
    } else if (p === "/user/repos")
      data = {
        full_name: "test/new",
        default_branch: "main",
        html_url: "https://github.com/test/new",
      };
    else if (p.endsWith("/issues"))
      data = { html_url: "https://github.com/test/garden/issues/1" };
    else if (p.endsWith("/git/ref/heads/main"))
      data = { object: { sha: "base" } };
    else if (p.includes("/contents/") && options.method === "GET") {
      status = 404;
      data = { message: "Not found" };
    } else if (p.endsWith("/pulls"))
      data = { html_url: "https://github.com/test/garden/pull/1" };
    else data = { default_branch: "main" };
    return { ok: status < 400, status, json: async () => data };
  },
});
vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], context);
const run = (code) => vm.runInContext(code, context);
(async () => {
  get("example").onclick();
  run(
    "project().name='Garden 🌱 <script>alert(1)</script>'; save(); refresh();",
  );
  assert.match(get("preview").textContent, /Garden 🌱/);
  assert.equal(
    JSON.parse(stored).projects[1].name,
    "Garden 🌱 <script>alert(1)</script>",
  );
  assert.match(run("handoff()"), /Never claim unrun checks passed/);
  assert.match(run("backlog()"), /TASK-001/);
  const imported = run(
    "validateProject({name:'Imported',idea:'Idea',unknown:'ignored',requirements:'Export 🌱'})",
  );
  assert.equal(imported.requirements, "Export 🌱");
  assert(!("unknown" in imported));
  assert.throws(() => run("validateProject({name:42})"));
  assert.throws(() => run("validateProject({unrelated:true})"));
  assert.equal(
    Buffer.from(run("base64('🌱 café')"), "base64").toString("utf8"),
    "🌱 café",
  );
  failStorage = true;
  run("save()");
  assert.match(get("save-state").textContent, /Unsaved/);
  failStorage = false;
  get("token").value = "secret-test-token";
  get("gh-repo").value = "test/garden";
  run("ghPreview()");
  await get("publish").onclick();
  assert.equal(requests.at(-1).p, "/repos/test/garden/issues");
  assert.match(requests.at(-1).body.body, /REQ-001/);
  get("gh-action").value = "pr";
  run("ghPreview()");
  await get("publish").onclick();
  const put = requests.find((r) => r.method === "PUT");
  assert(put.body.branch.startsWith("fertilizer/spec-"));
  assert.match(
    Buffer.from(put.body.content, "base64").toString("utf8"),
    /Garden 🌱/,
  );
  assert.equal(requests.at(-1).body.base, "main");
  failPR = true;
  get("gh-title").value = "Test failed PR";
  await get("publish").onclick();
  assert(
    get("github-result").children.some((x) =>
      x.textContent.includes("GitHub 403"),
    ),
  );
  assert(
    get("github-result").children.some((x) =>
      x.textContent.includes("branch created"),
    ),
  );
  failPR = false;
  get("gh-action").value = "repo";
  get("gh-repo").value = "new";
  run("ghPreview()");
  await get("publish").onclick();
  assert.equal(requests.find((r) => r.p === "/user/repos").body.private, true);
  assert.equal(
    requests.at(-1).p,
    "/repos/test/new/contents/docs/SPECIFICATION.md",
  );
  run("save()");
  assert(!stored.includes("secret-test-token"));
  get("disconnect").onclick();
  assert.equal(get("token").value, "");
  const before = requests.length;
  get("gh-action").value = "issue";
  get("gh-repo").value = "bad/value/extra";
  run("ghPreview()");
  await get("publish").onclick();
  assert.equal(requests.length, before);
  // Exact review regressions and stable reference allocation.
  for (const root of ["null", "[]", "42", "{}"]) {
    assert.throws(
      () => run(`parseBackup(${JSON.stringify(root)})`),
      /Expected a version 1/,
    );
  }
  assert.throws(() => run("parseBackup('{')"), /not valid JSON/);
  run(
    "globalThis.referenceProject={...blank(),name:'IDs',requirements:'First\\nSecond'}; pinProject(referenceProject)",
  );
  assert.match(run("referenceProject.requirements"), /\[REQ-001\] First/);
  run(
    "referenceProject.requirements='[REQ-002] Second edited\\n[REQ-001] First'; pinProject(referenceProject)",
  );
  assert.match(
    run('fieldText(referenceProject,"requirements")'),
    /REQ-002\*\* Second edited/,
  );
  run(
    "referenceProject.requirements='[REQ-001] First\\nThird'; pinProject(referenceProject)",
  );
  assert.match(run("referenceProject.requirements"), /\[REQ-003\] Third/);
  run("referenceProject.requirements += '\\n[REQ-001] Duplicate'");
  assert(
    run("gaps(referenceProject)").some((x) => x.includes("Duplicate REQ")),
  );
  const requestsBeforeLimits = requests.length;
  get("gh-action").value = "issue";
  get("gh-repo").value = "test/limits";
  get("gh-title").value = "x".repeat(257);
  get("gh-payload").value = "small";
  await get("publish").onclick();
  assert.equal(requests.length, requestsBeforeLimits);
  get("gh-title").value = "Limit test";
  get("gh-payload").value = "x".repeat(65537);
  await get("publish").onclick();
  assert.equal(requests.length, requestsBeforeLimits);
  assert.match(run("publishError()"), /specification PR/);
  get("gh-payload").value = "x".repeat(65536);
  get("token").value = "test-secret";
  await get("publish").onclick();
  assert.equal(requests.length, requestsBeforeLimits + 1);
  const afterSuccess = requests.length;
  await get("publish").onclick();
  assert.equal(requests.length, afterSuccess);
  console.log(
    "PASS: exports, Unicode, import validation, save failure, issue/PR/repository request flows, partial failure feedback, token exclusion, invalid destination rejection.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
