# Frameer 3D — Agent Coding Standards

This file governs how AI agents (and humans) write, test, and lint code in this repository.
All rules below are enforced by tooling; treat any conflict between this file and the
tooling configuration as a bug to fix, not a reason to relax the rule.

---

## File Construction

### Size limit: 150 non-comment source lines

ESLint enforces `max-lines: 150` (comments and blank lines excluded).
A file that approaches or exceeds this limit is a signal to apply Domain-Driven Design:

- Identify the distinct responsibilities inside the file.
- Extract each responsibility into its own module under a domain-named subdirectory
  (e.g. `src/geometry/`, `src/renderer/`, `src/ui/`).
- The entry file for each domain should re-export the public API; internals stay private.
- Do **not** split a file arbitrarily — split along cohesive domain boundaries only.

### One public concern per file

A source file should have a single, named purpose. Avoid "utils catch-all" files; if a
utility doesn't belong to a domain, reconsider the domain model.

### TypeScript strictness

All code must satisfy the compiler options in `tsconfig.app.json`:

- `strict`, `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `noImplicitOverride`, and `noPropertyAccessFromIndexSignature`
  are all enabled.
- No `@ts-ignore` or `@ts-expect-error` suppressions without an accompanying
  `@example` doctest that demonstrates why the suppression is unavoidable.

---

## Documentation

### Executable doctests only — no prose JSDoc

The custom ESLint rule `local/jsdoc-examples-only` is set to `error`.
Every JSDoc block **must** consist solely of `@example` blocks that contain a
`` ```ts @import.meta.vitest `` fence. These blocks are executed as live tests by
`vite-plugin-doctest` on every `vitest run`.

**Correct:**
```ts
/**
 * @example
 * ```ts @import.meta.vitest
 * expect(clamp(5, 0, 10)).toBe(5);
 * expect(clamp(-1, 0, 10)).toBe(0);
 * ```
 */
export function clamp(value: number, min: number, max: number): number { … }
```

**Forbidden:** `@param`, `@returns`, `@description`, or any plain prose in JSDoc.

---

## Testing

### Philosophy: black-box, functional, no mocks

- Tests must exercise the **public API** of a module, not its internals.
- **No mocking.** A test that requires a mock is a symptom of improperly structured
  code — the dependency should be injected, isolated into its own unit, or the design
  should be reconsidered. Fix the design rather than add a mock.
- Tests must not import or reference private symbols (anything not exported).

### Two complementary layers

| Layer | Location | Runner |
|---|---|---|
| Inline doctests | `@example @import.meta.vitest` blocks in source files | `vite-plugin-doctest` via `includeSource` |
| Black-box unit / integration tests | `src/**/*.{test,spec}.{ts,tsx}` alongside source | Vitest `include` |

Both layers run on every `vitest run` invocation.

### Coverage target: 98 %+

Thresholds enforced in `vitest.config.ts`:

```
lines:      98
functions:  98
branches:   98
statements: 98
```

A coverage miss is **not** acceptable technical debt — it is a refactoring signal:

- Uncovered line → the path is unreachable or the public API does not expose it; simplify or remove it.
- Uncovered branch → conditional logic is not testable through the public API; extract it into a pure function.
- Uncovered function → the function may be dead code or not yet integrated; decide and act.

### Test file conventions

- Named `<subject>.test.ts`, co-located with the source file.
- Import only from the public export of the module under test.
- Use `describe` / `it` with plain English names that read as specifications.
- No `beforeEach` / `afterEach` setup that hides state — prefer pure functions and
  explicit data construction in each `it` block.

---

## Linting & Formatting

### ESLint — zero warnings allowed

`eslint . --max-warnings 0` must pass. Rules of note:

| Rule | Setting |
|---|---|
| `@typescript-eslint/explicit-function-return-type` | `error` |
| `@typescript-eslint/no-explicit-any` | `error` |
| `@typescript-eslint/prefer-readonly` | `error` |
| `@typescript-eslint/no-floating-promises` | `error` |
| `@typescript-eslint/consistent-type-imports` | `error` — use `import type` |
| `no-console` | `warn` (only `console.warn` / `console.error` permitted) |
| `max-lines` | `error` at 150 (skip comments) |
| `local/jsdoc-examples-only` | `error` |

### Naming conventions (enforced)

| Symbol | Format |
|---|---|
| Interface, TypeAlias, Enum | `PascalCase` |
| EnumMember | `UPPER_CASE` |
| Variable | `camelCase`, `UPPER_CASE`, or `PascalCase` |
| Function | `camelCase` or `PascalCase` |
| Class | `PascalCase` |

### Prettier

All files formatted by Prettier (`prettier --check` must pass).
`.github/` and `.specify/` are excluded in `.prettierignore` and must stay excluded.

### Pre-commit gate (lint-staged + husky)

The commit hook runs:
- `prettier --check` on `*.{ts,tsx,json,md,html,css}`
- `eslint --max-warnings 0` on `*.{ts,tsx}`

Do not bypass with `--no-verify`. Fix the root cause.

---

## Domain-Driven Refactoring Triggers

When any of the following occur, pause and refactor before adding more code:

1. A file is at or above 130 non-comment lines (buffer before the 150 hard limit).
2. A test requires a mock or spy on an internal dependency.
3. Coverage drops below 98 % on any metric.
4. A single file exports more than one clearly distinct concern.
5. A `@example` doctest block grows beyond ~10 assertions (extract a `.test.ts`).

Refactoring means extracting to a new domain module with its own tests — not moving
code into a generic utility file.
