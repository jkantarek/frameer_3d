# Ralph Progress Log

Feature: 003-rotation-and-project-management
Started: 2026-05-02 08:29:53

## Codebase Patterns

- Inline fixture objects in test files must include all SceneElement fields — when adding new fields to the interface, grep for `id:.*label:` patterns in test files to find all literal fixtures that need updating.
- Factory functions (PrimitiveFactory) use private helpers like `originAttrs()` that return typed attribute arrays. Add new field helpers following the same pattern.
- Spreads from factory output (`{ ...createBox(), ... }`) automatically carry new fields — only manually-constructed object literals need explicit field additions.

---

---
## Iteration 1 - 2026-05-02T08:35:00-05:00
**User Story**: P001F001 — SceneElement rotation_attributes type change
**Tasks Completed**: 
- [x] P001F001T001: Add rotation_attributes assertions to createBox doctest (RED)
- [x] P001F001T002: Add rotation_attributes to SceneElement interface; add rotationAttrs() helper to PrimitiveFactory + initialize in createBox; add rotation_attributes: [] to test fixture literals in ElementStore.test.ts and ElementControls.test.ts (GREEN)
**Tasks Remaining in Story**: None - story complete
**Commit**: 0d301d2
**Files Changed**: 
- src/elements/ElementTypes.ts
- src/elements/PrimitiveFactory.ts
- src/elements/ElementStore.test.ts
- src/elements/ElementControls.test.ts
- specs/003-rotation-and-project-management/tasks.md
**Learnings**:
- Only 2 test files had inline SceneElement literals needing rotation_attributes: [] — ElementStore.test.ts (makeEl) and ElementControls.test.ts (makeElementWith). All other test files use factory outputs or spreads.
- rotationAttrs() private helper added to PrimitiveFactory.ts alongside originAttrs(). Other factories (sphere, cylinder, plane) get rotation_attributes: [] for now; Phase 3 will initialize them properly.
- PrimitiveFactory.ts line count is approaching the limit — will need to be monitored as more factories are updated in Phase 3.
---
## Iteration 2 - 2026-05-02T08:50:00-05:00
**User Story**: P002 — Project Domain (ProjectTypes, ProjectStore, ProjectRouter, domain index)
**Tasks Completed**: 
- [x] P002F001T001+T002: ProjectTypes.ts — ProjectSummary, Project, ProjectRegistry interfaces with doctest
- [x] P002F002T001: ProjectStore tests written (RED confirmed)
- [x] P002F002T002: ProjectStore.ts implemented (loadRegistry, saveRegistry, loadProject, saveProject, createProject, deleteProject)
- [x] P002F003T001: ProjectRouter tests written (RED confirmed)
- [x] P002F003T002: ProjectRouter.ts implemented (getActiveProjectId, setActiveProjectId, clearActiveProjectId)
- [x] P002F004T001: src/project/index.ts barrel re-export created
**Tasks Remaining in Story**: None - story complete
**Commit**: 44eda1e
**Files Changed**: 
- src/project/ProjectTypes.ts (new)
- src/project/ProjectStore.ts (new)
- src/project/ProjectStore.registry.test.ts (new)
- src/project/ProjectStore.project.test.ts (new)
- src/project/ProjectStore.crud.test.ts (new)
- src/project/ProjectRouter.ts (new)
- src/project/ProjectRouter.test.ts (new)
- src/project/index.ts (new)
- specs/003-rotation-and-project-management/tasks.md
**Learnings**:
- `max-lines` with `skipBlankLines: false` — blank lines count toward the 150 limit. Split test files earlier.
- V8 branch coverage tracks each side of `||` separately: `typeof v !== 'object'` (non-object primitive) AND `v === null` must each be tested explicitly.
- Ternary true branch must be tested directly; missing-field tests only cover the false branch.
- `no-unnecessary-type-assertion` fires when `let s: Storage` is in scope and `as unknown as Storage` is used in `beforeEach`; inline storage creation per test avoids this.
---
