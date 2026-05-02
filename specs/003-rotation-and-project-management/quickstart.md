# Quickstart: Rotation & Project Management

**Branch**: `003-rotation-and-project-management` | **Date**: 2026-05-01

---

## What this feature adds

1. **Object Rotation** — A gizmo mode toolbar (Move / Rotate / Scale buttons) in the viewport lets users rotate selected objects. Rotation is persisted in `rotation_attributes` on each `SceneElement`.

2. **Project Management** — Projects are named workspaces stored in `localStorage`, each identified by a ULID. The active project is driven by the `?project=<id>` URL query param. The Settings panel gains a "Projects" folder for creating and switching projects.

---

## How to use (user-facing)

### Rotating an object

1. Click an element in the Elements panel to select it.
2. Click the **Rotate** button in the gizmo toolbar (appears at the bottom-center of the viewport).
3. Drag the rotation handles on the selected mesh.
4. The rotation is saved automatically. Reload the page — the object stays rotated.
5. Click **Move** to return to translate mode.

### Creating a new project

1. Open the **System** panel (bottom-left).
2. Expand the **Projects** folder.
3. Click **New Project** — the URL updates to `?project=<new-id>` and the scene clears.
4. Add elements, name the project using the "Name" binding at the top of the Projects folder.
5. Bookmark or copy the URL to share or return to this project later.

### Switching between projects

1. Open the **System** panel → **Projects** folder.
2. All saved projects appear as buttons. Click any project name to navigate to it.
3. The URL changes to `?project=<id>` and the project's elements load.

---

## How to use (developer-facing)

### Loading the active project in main.ts

```ts
import { resolveOrCreateProject } from './project/ProjectBootstrap.js';

// Reads ?project=<id> from URL. Creates a new project if absent.
// Returns a valid Project — never throws; corrupt storage ⇒ empty project + console.warn.
const project = resolveOrCreateProject();
```

### Saving on element change

```ts
import { saveProject } from './project/ProjectStore.js';

// inside ElementPanel commit():
saveProject({ ...project, elements: newState.elements, updated_at: new Date().toISOString() });
```

### Creating a new project from the UI

```ts
import { createProject, saveProject } from './project/ProjectStore.js';
import { setActiveProjectId } from './project/ProjectRouter.js';

const newProject = createProject('Untitled Project');
saveProject(newProject);
setActiveProjectId(newProject.id);
// reload scene with empty elements
```

### Using the GizmoToolbar

```ts
import { createGizmoToolbar } from './scene/GizmoToolbar.js';

const toolbar = createGizmoToolbar(viewportContainer, transformGizmo);
// toolbar automatically wires button clicks to gizmo.setMode()
// toolbar.setActiveMode('rotate') to programmatically sync the active button
// toolbar.dispose() on teardown
```

---

## Running tests

```bash
pnpm test              # all tests including inline doctests
pnpm test:coverage     # enforce 98%+ coverage thresholds
pnpm lint              # ESLint zero-warnings
pnpm typecheck         # strict TypeScript check
```

---

## Architecture diagram

```
main.ts
  │
  ├─ resolveOrCreateProject()  ──→  ProjectBootstrap  ──→  ProjectStore  ──→  localStorage
  │         │                                                   │
  │         └── projectId (string)                             ProjectRouter ──→ URL
  │
  ├─ createElementPanel(container, sceneManager, folder, projectId, gizmo)
  │         │
  │         ├─ ProjectStore.loadProject(projectId) ──→ elements
  │         ├─ ElementRenderer.sync(elements) ──→ SceneManager (Three.js meshes + rotation)
  │         └─ gizmo.onObjectChange → capture rotation_attributes → ProjectStore.saveProject()
  │
  ├─ createGizmoToolbar(viewportContainer, gizmo)
  │         └─ 3 buttons → gizmo.setMode('translate'|'rotate'|'scale')
  │
  └─ createSystemPanel(settings, registry, activeId, callbacks)
            └─ "New Project" btn → createProject() → saveProject() → setActiveProjectId() → reload
            └─ Project buttons → setActiveProjectId(id) → reload
```
