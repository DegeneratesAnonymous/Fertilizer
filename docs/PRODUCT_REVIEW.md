# Fertilizer product review

Perspective: what would a competing tool need to do to be more useful than the first Fertilizer draft?

## Findings and improvements

| Weakness in the first version                                              | Improvement in this PR                                                                                                                                                                                        |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Filling forms can feel complete even when requirements cannot be verified. | Actionable plan checks flag missing requirement-to-acceptance and requirement-to-task links, unknown references, duplicate IDs, cycles, and missing task verification. Each finding opens its relevant field. |
| Every backlog item inherits the same broad acceptance list.                | Single-task handoffs select linked requirements and acceptance checks, declare dependencies, and retain shared constraints and working instructions. They can be exported or published individually.          |
| Line-order IDs break external references after reordering.                 | Explicit pinned IDs survive reorder/edit operations, with persisted counters for new IDs and duplicate detection.                                                                                             |
| One invalid saved project can discard access to all projects.              | Valid projects are recovered independently. The original workspace is downloadable and protected from autosave until the user explicitly replaces it.                                                         |
| Concurrent tabs can silently overwrite one another.                        | Saving checks the latest stored workspace and pauses when another tab has changed it.                                                                                                                         |
| A successful publish can be repeated by clicking again.                    | Identical successful actions are blocked during the page session. Partial failures retain visible artifact links and never retry automatically.                                                               |
| Dense, single-line source makes future changes hard to review.             | HTML, CSS, JavaScript, and tests are formatted for maintainability while keeping one deployable HTML file.                                                                                                    |

## PR feedback addressed

- Give the GitHub dialog an accessible name through its heading.
- Validate backup roots before dereferencing `version`; null, arrays, primitives, malformed JSON, and wrong shapes have actionable errors.
- Validate issue bodies and issue/PR titles before network requests; oversized issues offer task, PR, and download alternatives.
- Apply the same field limit to editor input, imports, and reload validation; rejected input keeps the prior value.

## Verification

- Dependency-free core workflow suite: passed.
- Chromium browser suite: passed, including real reloads, JSON downloads/imports, editor boundaries, recovery, task selection, and mocked publishing.
- Desktop and mobile screenshots inspected; mobile overflow checked automatically.
- GitHub API requests in application tests were mocked. No live token or real repository/issue/PR was created by those tests.

## Remaining product boundaries

Fertilizer prepares structured material for an external AI assistant; it does not call a model or invent answers. Plan review checks structure and reference coverage, not whether a requirement is correct or feasible. Users still own those decisions.

Pinned IDs must remain attached to their original items; manually assigning or duplicating IDs can create ambiguity, which review flags. Workspace recovery downloads preserve original data for manual repair rather than silently guessing how to migrate malformed projects.

GitHub publishing uses a personal token and cannot guarantee server-side idempotency after an ambiguous network failure. Live organization policies, permissions, and rate limits still need validation in the user's GitHub environment.
