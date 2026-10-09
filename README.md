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

The preview updates as you type. Export a project specification, implementation handoff, or Markdown issue backlog. The handoff asks an agent to inspect repository instructions, resolve blocking questions, respect scope, and report verification evidence. **Copy discovery prompt** packages your draft and gaps for discussion with your preferred AI assistant. There is no built-in model call or automatic invention of requirements.

Coverage measures filled fields, not specification quality. Requirement, acceptance, and task IDs follow line order (`REQ-001`, `AC-001`, `TASK-001`); finalize ordering before referencing them in external issues. Task lines can include deliverables, dependencies, related requirement IDs, and verification steps. Backlog exports include project-wide acceptance criteria that must be refined for each task.

## Saving and backups

Projects autosave in this browser's local storage. Storage belongs to the origin/browser profile; switching from a downloaded file to localhost may show a different workspace. Browser cleanup or private mode can remove saved work. Use **Back up project** to download a versioned JSON file and **Import project** to restore it as a new copy. GitHub credentials are never included in backups or local storage. If saving fails, the header displays an unsaved state; export a backup before closing.

## GitHub

Open **GitHub**, enter a token, choose an action, and review the exact Markdown payload before publishing:

- **Planning issue:** creates one issue containing the complete specification in an existing `owner/repo`.
- **Specification PR:** reads the default or selected base branch, creates a unique `fertilizer/spec-…` branch, writes the specification to a relative Markdown path, and opens a PR. Existing specification files are updated on the new branch. The base branch is not edited. The repository must already have an initial commit.
- **Personal repository:** creates a repository owned by the token's user, initializes its README, and commits `docs/SPECIFICATION.md`. Private visibility is the default. Organization repository creation is not included.

For existing repositories, scope a fine-grained token to the intended repositories with **Contents: write** and **Pull requests: write** for PRs, or **Issues: write** for issues. Repository creation may require additional account permissions. Consult [GitHub's repository API documentation](https://docs.github.com/en/rest/repos/repos#create-a-repository-for-the-authenticated-user) for the token type and organization policies that apply to your account.

The token remains in the page's password field until cleared or the page closes and is sent only to `https://api.github.com`. Use a trusted copy of the HTML. **Clear token** removes it immediately. This is a client-side personal tool, not an OAuth application. No token is bundled in the source.

Writes are not automatically retried. A failed multi-step action may leave a repository, branch, or commit behind; the dialog reports successful steps and links to created artifacts. Inspect those artifacts before retrying. The tool publishes planning documents; it does not generate application code or run agents.

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

The core checks cover Unicode exports, schema validation, storage failure feedback, token exclusion, mocked GitHub issue/repository/PR requests, and partial failure reporting. Browser checks additionally cover reload persistence, download/import round trips, safe text rendering, and mobile overflow. Tests mock GitHub and do not create real external artifacts.

During the initial implementation, core checks passed. Browser checks could not run in the build environment because the Chromium download was blocked or truncated; run the browser command above locally before treating browser behavior as verified.
