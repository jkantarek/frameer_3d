# Research: Elements Floating Panel

**Feature**: `002-elements-floating-panel`
**Date**: 2026-04-29

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
