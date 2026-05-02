# Feature Specification: Rotation of Objects & Project Management

**Feature Branch**: `003-rotation-and-project-management`  
**Created**: 2026-05-01  
**Status**: Draft  
**Input**: User description: "review the state object, build a proposal for holistically adding the following features: rotation of objects and project management. a new project should be spawnable by the settings menu and should be driven by the URL. whatever file identifier is in the url should load the local stored object"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Rotate a Scene Object via Gizmo (Priority: P1)

A user selects a mesh in the Elements panel, then switches the transform gizmo to "Rotate" mode using a toolbar in the viewport. They drag the gizmo handles to rotate the object. The rotation is saved and persists on reload.

**Why this priority**: Rotation is a fundamental 3D editing operation. The gizmo already supports `rotate` mode internally; this story only exposes it via UI and wires it to the persisted state model.

**Independent Test**: Select a box, switch to rotate mode, drag gizmo → box rotates → reload page → box has same rotation.

**Acceptance Scenarios**:

1. **Given** a box is selected, **When** the user clicks the Rotate toolbar button, **Then** the TransformGizmo switches to rotate mode and shows rotation handles.
2. **Given** the gizmo is in rotate mode and a mesh is selected, **When** the user drags a handle, **Then** `rotation_attributes` on the element are updated and persisted via `save()`.
3. **Given** persisted rotation data, **When** the app reloads, **Then** the mesh is rendered with the saved Euler angles applied.

---

### User Story 2 - Create a New Project from the Settings Menu (Priority: P2)

A user opens the System/Settings panel and clicks "New Project". The app generates a new project ID, navigates the browser URL to `?project=<id>`, and presents a fresh empty canvas. The previous project remains accessible via its URL.

**Why this priority**: Project management is the second major feature, and creating projects is the entry point of the workflow.

**Independent Test**: Open app → click "New Project" in System panel → URL changes to `?project=<ulid>` → page reloads with empty canvas → navigate back → original project still has its elements.

**Acceptance Scenarios**:

1. **Given** the System panel is open, **When** the user clicks "New Project", **Then** the URL is updated to `?project=<new-ulid>` and the scene is cleared.
2. **Given** a new project was created, **When** the user adds elements and reloads the URL, **Then** the new project's elements are loaded (not the prior project's).
3. **Given** multiple projects exist, **When** the user navigates to `?project=<old-id>`, **Then** the original project's elements are loaded.

---

### User Story 3 - URL-Driven Project Loading (Priority: P2)

When the app boots, it reads the `?project=<id>` query parameter. If the project ID matches a locally stored project, that project's elements are loaded. If no project ID is in the URL (or the data is missing/corrupt), a fresh empty default project is created. The app never crashes due to corrupted storage — it always falls back to a sane empty state.

**Why this priority**: URL routing is the core mechanism enabling bookmark-able projects and shareable workspace links.

**Independent Test**: Set URL to `?project=<existing-id>` → reload → correct project elements appear. Remove param → reload → fresh empty project. Corrupt a project's JSON in localStorage → reload → app starts clean without errors.

**Acceptance Scenarios**:

1. **Given** a URL `?project=<id>` where the project exists in localStorage, **When** the app loads, **Then** that project's elements are rendered.
2. **Given** a URL with no `project` param, **When** the app loads, **Then** a fresh empty project is created and `?project=<new-id>` is set in the URL via `replaceState`.
3. **Given** a URL `?project=<unknown-id>`, **When** the app loads, **Then** a fresh empty project with that ID is initialized.
4. **Given** a project's localStorage value is corrupt JSON, **When** the app loads that project, **Then** the project loads as empty (sane default) and a console warning is emitted.

---

### User Story 4 - Switch Between Projects (Priority: P3)

The System panel shows a list of saved projects. Clicking a project name navigates to `?project=<id>`, loading that project.

**Why this priority**: Once multiple projects exist, navigation between them completes the project management workflow.

**Independent Test**: Create 2 projects, open System panel → project list shows both → click second project → URL and scene update.

**Acceptance Scenarios**:

1. **Given** multiple projects in localStorage, **When** the System panel is opened, **Then** a "Projects" folder shows all project names.
2. **Given** the project list is visible, **When** the user clicks a project name button, **Then** the URL updates and the correct project elements load.
3. **Given** the active project is in the list, **When** rendered, **Then** the active project is visually indicated.

---

### Edge Cases

- What happens when `localStorage` is full? → `save()` silently warns (existing behaviour); project may not persist but the app continues.
- What happens when rotation Euler angles are `NaN`? → clamp or ignore during renderer sync; log a warning.
- What happens when a project ID in the URL contains invalid characters? → treat as unknown-project, initialize fresh.
- What happens when localStorage data is corrupted? → all storage reads use defensive guards; invalid/corrupt data is treated as missing and the sane default (empty registry / empty project) is used; a `console.warn` is emitted.
- What happens if the user manually edits the URL to a partial/empty ID? → normalize to empty string → create a fresh default project via `replaceState`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `SceneElement` MUST include `rotation_attributes` (array of `OriginAttribute` with keys `rotation.x`, `rotation.y`, `rotation.z` in radians).
- **FR-002**: The viewport MUST expose a gizmo mode toolbar (Translate / Rotate / Scale buttons) visible when an element is selected.
- **FR-003**: Rotation changes from the gizmo MUST be persisted in `rotation_attributes` and saved via `ElementStore.save()`.
- **FR-004**: `ElementRenderer` MUST apply `rotation_attributes` when syncing meshes to the scene (set `mesh.rotation` from stored Euler values).
- **FR-005**: A `Project` entity MUST exist with fields: `id`, `name`, `elements`, `created_at`, `updated_at`.
- **FR-006**: A `ProjectRegistry` MUST be persisted in localStorage (`frameer3d.v1.projects`) listing all known project IDs and names.
- **FR-007**: Individual project data MUST be persisted at key `frameer3d.v1.project.<id>`.
- **FR-008**: On app startup, the `?project=<id>` URL query parameter MUST determine which project is loaded.
- **FR-009**: The System panel MUST include a "New Project" button that generates a project, updates the URL, and reloads the scene.
- **FR-010**: The System panel MUST include a "Projects" folder listing saved project names as clickable navigation buttons.
- **FR-011**: All `localStorage` reads MUST use defensive type guards; if data is missing, malformed, or fails JSON parsing, the sane default (empty registry or empty project) MUST be returned and a `console.warn` MUST be emitted.
- **FR-012**: The URL query param `?project=<id>` MUST be updated (via `history.replaceState`) whenever a project is loaded or created without a full navigation.

### Key Entities

- **Project**: A named workspace. Has `id` (ULID), `name` (string), `elements` (SceneElement[]), `created_at` (ISO string), `updated_at` (ISO string).
- **ProjectRegistry**: An index of all stored projects. Has `projects` (array of `{id, name, created_at, updated_at}`).
- **SceneElement (extended)**: Adds `rotation_attributes: readonly OriginAttribute[]` to the existing type.
- **GizmoToolbar**: A UI component (3 buttons: translate / rotate / scale) rendered inside the viewport container.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can rotate any primitive and reload the page; the object retains its rotation (verifiable by Euler angle equality within 0.001 rad).
- **SC-002**: A new project can be created, elements added, URL saved, and the identical project state is recovered from that URL on next load.
- **SC-003**: Corrupting any project's localStorage value (invalid JSON, wrong type, missing fields) causes the app to load a clean empty project without throwing an unhandled error.
- **SC-004**: The gizmo mode toolbar renders within the viewport and switching modes changes gizmo behaviour without any page reload.
- **SC-005**: 98%+ line/branch/function coverage is maintained after the feature is implemented.

## Assumptions

- Projects are stored locally (localStorage only) — no server synchronization in this feature.
- The URL is the single source of truth for the active project on load; it is not synced in real-time as the user edits.
- `history.replaceState` is available (all modern browsers); no IE11 support required.
- The existing `TransformGizmo` API (`setMode`, `attach`, `detach`, `onObjectChange`, `onDragEnd`) is sufficient; no changes to `TransformGizmo.ts` internals are needed.
- Scale is surfaced in the gizmo toolbar (matching the existing `TransformMode` type) but scale data is NOT persisted in this iteration — it is a display-only mode toggle (out of scope for the data model in this feature, except for rotation).
- Project names default to "Untitled Project" and can be renamed via the System panel (a simple text binding).
