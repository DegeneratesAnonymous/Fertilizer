# Fertilizer

Grow project ideas into detailed specifications and reviewable AI agent handoffs. Fertilizer is one standalone HTML file with no runtime dependencies, external assets, build step, or backend.

## Start

Download `index.html` and open it in a current desktop browser. Click **Example** to explore a populated project, or **New** to start your own. For a consistent browser origin, you can also serve the folder locally:

```sh
python -m http.server 8000
```

Open http://localhost:8000. Core planning and exports work offline. GitHub publishing requires internet access and a GitHub personal access token. No hosted deployment is needed.

## Planning workflow

1. **Plant the idea:** problem, users, current workarounds, and success measures.
2. **Define the boundaries:** v1 scope, non-goals, constraints, assumptions, and unanswered questions.
3. **Describe the experience:** user journeys, requirements, acceptance criteria, error behavior, and design.
4. **Map the system:** architecture, data model, integration contracts, security, and measurable quality targets.
5. **Plan the build:** tasks, dependencies, verification, deliverables, and agent instructions.

The preview updates as you type. Export a project specification, implementation handoff, Markdown issue backlog, single-task handoff, or plan review report. Single-task handoffs include the linked requirements and acceptance checks, declared task dependencies, verification steps, and shared project constraints. Use **Create issue for this task** to publish the exact task package you reviewed. The handoff asks an agent to inspect repository instructions, resolve blocking questions, respect scope, and report verification evidence. **Copy discovery prompt** packages your draft and gaps for discussion with your preferred AI assistant. There is no built-in model call or automatic invention of requirements.

Coverage measures filled fields, not specification quality. **Plan review** checks missing decisions, requirements without linked acceptance criteria or tasks, unknown references, duplicate IDs, dependency cycles, and tasks without explicit verification. Click a finding to jump to the field that needs attention. These are structural checks; they do not establish feasibility or semantic correctness.

Use **Pin reference IDs** before creating references or external issues. This adds visible `[REQ-001]`, `[AC-001]`, and `[TASK-001]` prefixes. Keep those prefixes when editing or reordering lines. New items receive new IDs; deleted pinned IDs are not reused. Unpinned IDs in previews are provisional. Duplicate IDs are flagged for correction rather than silently changing existing references.

Example linked entries:

```text
Requirements: [REQ-001] Export specifications as UTF-8 Markdown.
Acceptance:   [AC-001] REQ-001: Exported emoji and accented text match the preview.
Tasks:        [TASK-002] Build exporter | REQ-001 | depends: TASK-001 | verify: Unicode export round trip
```

Single-task packages select acceptance criteria through the task's REQ references or an explicit TASK reference in an acceptance criterion. Unlinked criteria are not silently assigned to every task. Missing links and undeclared dependencies remain explicit in the output. **Duplicate project** lets you explore an alternative without editing the original.

## Saving and backups

Projects autosave in this browser's local storage. Storage belongs to the origin/browser profile; switching from a downloaded file to localhost may show a different workspace. Browser cleanup or private mode can remove saved work. Use **Back up project** to download a versioned JSON file and **Import project** to restore it as a new copy. GitHub credentials are never included in backups or local storage. If saving fails, the header displays an unsaved state; export a backup before closing. Editor and import fields share the same 100,000-character limit; project JSON imports allow up to 16 MB to accommodate Unicode and JSON escaping.

If one saved project is invalid, valid projects remain available. A recovery banner pauses autosave and offers the original workspace as a download. Editing cannot overwrite that original until you explicitly choose **Use current workspace**. A changed browser workspace from another tab also pauses autosave instead of silently overwriting it. Back up your edits and reload to inspect the other tab's changes, or explicitly keep the current workspace. The workspace recovery download preserves raw data for manual recovery; ordinary **Import project** accepts individual project backups.

## GitHub

Open **GitHub**, enter a token, choose an action, and review the exact Markdown payload before publishing:

- **Planning issue:** creates one issue containing the complete specification or a selected task handoff in an existing `owner/repo`. Titles over 256 characters and issue bodies over 65,536 characters are blocked before network requests, with guidance to use a smaller task, a specification PR, or a Markdown download.
- **Specification PR:** reads the default or selected base branch, creates a unique `fertilizer/spec-…` branch, writes the specification to a relative Markdown path, and opens a PR. Existing specification files are updated on the new branch. The base branch is not edited. The repository must already have an initial commit.
- **Personal repository:** creates a repository owned by the token's user, initializes its README, and commits `docs/SPECIFICATION.md`. Private visibility is the default. Organization repository creation is not included.

For existing repositories, scope a fine-grained token to the intended repositories with **Contents: write** and **Pull requests: write** for PRs, or **Issues: write** for issues. Repository creation may require additional account permissions. Consult [GitHub's repository API documentation](https://docs.github.com/en/rest/repos/repos#create-a-repository-for-the-authenticated-user) for the token type and organization policies that apply to your account.

The token remains in the page's password field until cleared or the page closes and is sent only to `https://api.github.com`. Use a trusted copy of the HTML. **Clear token** removes it immediately. This is a client-side personal tool, not an OAuth application. No token is bundled in the source.

An identical successful publish action is blocked from being submitted again during the same page session. This is accidental-double-submit protection, not server-side idempotency. Writes are not automatically retried. A failed multi-step action may leave a repository, branch, or commit behind; the dialog reports successful steps and links to created artifacts. Inspect those artifacts before retrying. The tool publishes planning documents; it does not generate application code or run agents.

## Verification

Dependency-free workflow checks:

```sh
node tests/core.cjs
```

Browser integration checks (Playwright is a development dependency only):

```sh
npm install --no-save playwright
npx playwright install chromium
node tests/browser.cjs
```

Both suites passed after the PR review changes. They cover Unicode exports, null/invalid JSON roots, editor/reload limits, stable IDs, payload boundaries, duplicate publishing, task-specific exports, structural diagnostics, recovery, storage conflicts, and mocked GitHub flows. Browser tests also verify the dialog's accessible name, persistence, downloads/imports, safe text rendering, and mobile overflow. Tests mock GitHub and do not create real external artifacts.

If Chromium is already installed locally, you may set `CHROMIUM_EXECUTABLE_PATH` to its executable instead of downloading Playwright's bundled browser. The app itself still has no dependencies. See [the product review](docs/PRODUCT_REVIEW.md) for the improvement rationale and remaining boundaries.
