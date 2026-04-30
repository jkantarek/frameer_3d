# Research: Elements Floating Panel

**Feature**: `002-elements-floating-panel`
**Date**: 2026-04-29 (updated 2026-04-30)

---

## R1 — ULID Library Selection

**Decision**: Use `ulid` npm package (v3.x)

**Rationale**:
- MIT license, ~2.5 KB minified, zero transitive dependencies.
- 86% TypeScript codebase; ships native types with no `@types/` shim needed.
- Browser-safe: uses `crypto.getRandomValues` (no Node.js built-ins).
- API: `import { ulid } from 'ulid'; const id = ulid();` — one call, no config.
- Encodes millisecond timestamp in first 10 chars of the 26-char Crockford Base32 string,
  providing natural lexicographic chronological ordering without a separate timestamp field.
- Add to `dependencies` (not `devDependencies`) — used at runtime in `PrimitiveFactory`.

**Alternatives Considered**:
- `ulidx` — repository appears deprecated (404 on GitHub); rejected.
- `crypto.randomUUID()` — generates UUID v4, not lexicographically time-sortable; rejected.
- Custom implementation — maintenance burden, unnecessary given the tiny `ulid` package; rejected.

---

## R2 — TypeScript Recursive Interface

**Decision**: Declare `SceneElement` as a TypeScript `interface` with `child_elements: SceneElement[]`.

**Rationale**:
- TypeScript natively supports recursive interfaces; no workarounds needed.
- Works under `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` without issues.
- `JSON.stringify / JSON.parse` handle non-circular trees of any practical depth.
- No circular references in the schema (no parent back-reference needed — elements are
  identified by ULID, so a parent can be found by tree traversal if needed).

**Gotchas to avoid**:
- Never add a `parent?: SceneElement` back-reference; it creates circular JSON.
- `noUncheckedIndexedAccess` means array element access (`arr[0]`) returns `T | undefined`;
  use `arr.at(0)` with a `!== undefined` guard or iterate with `for...of` loops.

---

## R3 — CSS Floating Panel Overlay

**Decision**: `position: absolute` inside a `position: relative` parent container.

**Rationale**:
- Positions the panel relative to `#viewport-container`, not the viewport — survives
  layout changes and resize operations cleanly.
- Absolute-positioned elements are removed from normal flow, so adding items to the panel
  does not trigger layout thrash on the canvas.
- Use `pointer-events: none` on the panel container and `pointer-events: auto` on
  interactive children — clicks on empty panel areas pass through to the Three.js canvas.
- `position: fixed` would lock to viewport and break if the app layout changes; rejected.

**CSS structure**:
```css
#viewport-container { position: relative; }

#elements-panel {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 220px;
  pointer-events: none;
  z-index: 10;
}

#elements-panel > * { pointer-events: auto; }
```

---

## R4 — Tweakpane v4 Dynamic Binding Management

**Decision**: Clear bindings by calling `.dispose()` on each child in a folder, then rebuild.

**Rationale**:
- Tweakpane v4 exposes no bulk-clear API. Iterating `folder.children` and calling
  `blade.dispose()` is the official pattern for clearing all bindings from a folder.
- `folder.addBinding(target, key, options)` where `key` is a runtime string works;
  TypeScript structural typing satisfies the overload.
- If the bound target object is replaced (new element selected), all existing bindings
  silently orphan — **must** dispose-and-rebuild on every selection change.
- Binding `attribute_value` (a string in the store) with type coercion: for `number` type,
  hold a proxy object `{ value: number }` that updates the string attribute on change.

**Pattern for dynamic keying**:
```ts
// Build a proxy object: { [attribute_uri_key]: coercedValue }
const proxy: Record<string, unknown> = {};
for (const attr of element.parametric_attributes) {
  proxy[attr.attribute_uri_key] = coerce(attr.attribute_value, attr.attribute_type);
}
folder.addBinding(proxy, attr.attribute_uri_key, bindingOptions(attr.attribute_type));
```

---

## R5 — localStorage Capacity

**Decision**: 5 MiB per origin; the element tree is safe for thousands of elements.

**Rationale**:
- A single `SceneElement` with all attribute arrays serialises to roughly 300–600 bytes JSON.
- At 5 MiB, that supports ~8,000–16,000 elements — far exceeding practical scene graph needs.
- Wrap `localStorage.setItem` in try-catch to handle `QuotaExceededError` gracefully.
- Store floating-point `dimension_uri_value` as IEEE 754 double (JSON native). No precision
  loss for values in typical 3D coordinate ranges.
- No size-check guard needed in v1 — document the limit and handle the exception.

---

## R6 — Three.js TransformControls Integration

**Decision**: Use `TransformControls` from `three/addons/controls/TransformControls.js`.

**Rationale**:
- Native Three.js addon; zero extra dependencies.
- Supports translate / rotate / scale modes via `setMode('translate' | 'rotate' | 'scale')`.
- `attach(mesh)` / `detach()` API for binding to a selected object.
- `getHelper()` returns the visual gizmo `Object3D`; add it to the scene once at setup
  via `SceneManager.addObject('__transform-gizmo__', helper)`.
- Conflict with OrbitControls is resolved by listening to the `dragging-changed` event:
  ```ts
  tc.addEventListener('dragging-changed', (e) => { orbitControls.enabled = !e.value; });
  ```
- TypeScript import: `import { TransformControls } from 'three/addons/controls/TransformControls.js'`
  — Three.js r169 ships full TypeScript types for addons.

**Suppressing renderer.sync during drag**:
- `ElementRenderer.sync()` recreates all meshes (removes + re-adds via `addObject`).
  Calling it while TransformControls is attached would silently detach the gizmo.
- Solution: `ElementPanel.commit()` accepts a `{ skipRender: boolean }` option; when
  `true`, only `save()` is called. The `objectChange` event uses `skipRender: true`;
  the `mouseUp` event calls `commit()` without the flag to do a final sync.

**Alternatives Considered**:
- `OutlinePass` + `EffectComposer`: requires replacing `renderer.render()` with
  `composer.render()`, breaking the `SceneRenderer` interface. Too invasive for this
  feature.
- Manual drag with raycasting: significantly more code; rejecting in favour of the
  first-party addon.

---

## R7 — Selection Outline / Highlight

**Decision**: Double-mesh BackSide technique.

**Rationale**:
- Works with the existing direct-render `SceneRenderer` interface — zero postprocessing.
- Implementation:
  ```ts
  const outlineGeo = mesh.geometry.clone();
  const outlineMat = new THREE.MeshBasicMaterial({ color: 0x00aaff, side: THREE.BackSide });
  const outline = new THREE.Mesh(outlineGeo, outlineMat);
  outline.scale.multiplyScalar(1.015);
  outline.name = '__selection-outline__';
  mesh.add(outline); // follows all parent transforms automatically
  ```
- Detach by removing the named child:
  ```ts
  const child = mesh.getObjectByName('__selection-outline__');
  if (child) mesh.remove(child);
  ```
- No render-loop changes. No additional draw calls per frame beyond the mesh itself.

**Alternatives Considered**:
- `OutlinePass` — rejected (EffectComposer refactor required, see R6).
- `EdgesGeometry + LineSegments` — only highlights edges, not a solid outline. Less
  visually distinctive for the typical box/sphere shapes in this app.
- Color tinting the material on selection — mutates the element's mesh material, making
  it hard to reset to the data-driven color; rejected.

---

## R8 — Tweakpane v4 Color and Label Bindings

**Decision**: Bind hex string directly for color; plain `addBinding` for label text.

**Rationale (color)**:
- Tweakpane v4 auto-detects a CSS hex string (e.g., `'#888888'`) and renders a color
  picker automatically. `{ view: 'color' }` is only required for numeric hex values.
- `ev.value` in the `onChange` callback is a hex string in the same format as the input.
  No conversion needed — store it as-is in `attribute_value`.

**Rationale (label)**:
- `addBinding(proxy, 'label')` creates a text input automatically for string values.
- The display name `label` shown in the Tweakpane row can be customised with the option
  `{ label: 'Name' }` to avoid confusion with the internal binding key.
- `PARAMS.label` (the data field) and `options.label` (the display title) are passed to
  different type positions in Tweakpane's API; no conflict.

**Programmatic refresh**:
- To update a binding's displayed value without re-creating it, mutate the proxy object
  and call `folder.refresh()`. There is no per-binding `refresh()` method in v4.

**Alternatives Considered**:
- `{ view: 'text' }` — undocumented in v4; plain `addBinding` is sufficient.
- Per-binding disposal and recreation on every label change — works but wasteful; the
  `folder.refresh()` pattern is cheaper.

---

## R9 — Plane Primitive

**Decision**: `THREE.PlaneGeometry(width, height)` with `THREE.DoubleSide` material.

**Rationale**:
- Default orientation: XY plane, normal pointing toward +Z. Visible from the front
  out of the box when the camera is in positive Z space.
- `DoubleSide` material ensures the plane is visible from both sides — essential since
  users may orbit the camera to any angle.
- Add `geometry.width` and `geometry.height` as `parametric_attributes` (number).
- `geometry.type` fixed attribute: `"plane"`.
- Position at origin, same as other primitives.

**Gotchas**:
- `PlaneGeometry` vertices span `[-w/2, w/2] × [-h/2, h/2]` — centred by default.
- `noUncheckedIndexedAccess`: access `geometry.parameters` via helper or optional
  chaining rather than direct index.

---

## R10 — CSS Dark / Light Theme

**Decision**: `data-theme` attribute on `<html>` drives CSS custom properties.

**Rationale**:
- Setting `document.documentElement.dataset['theme'] = 'dark' | 'light'` on startup
  eliminates flash before any JS runs if set early in `main.ts`.
- CSS custom properties declared on `:root` with dark-mode defaults:
  ```css
  :root { --bg: #1a1a2e; --fg: #e8e8e8; --panel-bg: #16213e; }
  [data-theme="light"] { --bg: #f0f0f0; --fg: #1a1a1a; --panel-bg: #ffffff; }
  ```
- localStorage key `frameer3d.v1.settings` persists `{ theme, followSystem }`.
- System passthrough: `window.matchMedia('(prefers-color-scheme: dark)')` checked on
  load when `followSystem: true`. `matchMedia.addEventListener('change', ...)` used to
  track live OS changes.
- Tweakpane and Three.js background colour must also respond to the theme toggle:
  - Tweakpane: reads CSS variables automatically if its container uses the same variables.
  - Three.js background: `SceneManager.setBackground(color)` — `main.ts` registers a
    theme-change callback to update it.

**Alternatives Considered**:
- `class="dark"` on `<body>` — functionally equivalent; `data-theme` chosen because it
  is semantically clearer and avoids polluting the class list.
- CSS `prefers-color-scheme` media query only (no JS toggle) — cannot be overridden by
  user preference in the settings panel; rejected.
