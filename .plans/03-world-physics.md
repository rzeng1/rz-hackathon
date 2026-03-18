# Module 03: World Physics

## Objective
Define the pure-logic layer for player movement and collision detection.
No PixiJS, no XState, no DOM. Input is state; output is state.
Everything here is a candidate for 100% unit test coverage.

---

## Dependencies
- **Module 01** (`src/logic/physics.ts`): `calculateMovement(currentPos, velocity, delta) → Vec2` is already defined there and is the canonical position-stepping function. This module does **not** redefine it.

## File Targets
- `src/logic/movement.ts` — Input-to-velocity conversion and world clamping
- `src/logic/collision.ts` — AABB collision detection and resolution
- `src/logic/world.ts` — Static world layout: walls, furniture bounding boxes
- `src/logic/movement.test.ts`
- `src/logic/collision.test.ts`

---

## Coordinate System
- Origin `(0, 0)` is top-left.
- X increases rightward, Y increases downward.
- World dimensions: **1280 × 720** (matches 16:9 canvas).
- All positions represent the **center** of the entity.

---

## Data Shapes

### `Rect`
```
{ x: number, y: number, width: number, height: number }
```
Used for entity bounds and static collision objects. `x, y` = top-left corner.

### `InputDirection`
```
{ up: boolean, down: boolean, left: boolean, right: boolean }
```
Raw keyboard state; passed into the movement system each tick.

---

## System 1: Movement

### Function: `inputToVelocity(input, speed) → Vec2`
- Converts `InputDirection` booleans to a velocity vector.
- Normalizes diagonal movement (no speed boost on diagonals).
- Returns `{ x: 0, y: 0 }` if no keys are pressed.

> **Instant Stop behaviour (confirmed design choice):** When no keys are held,
> `inputToVelocity` returns `{ x: 0, y: 0 }` and `calculateMovement` therefore
> produces zero displacement — the player stops in the same frame. There is no
> momentum, deceleration curve, or lerp. This is intentional for an office sim:
> "Instant Stop" gives precise, responsive feel. Do not add easing or friction.

> **`applyVelocity` is removed.** Position stepping is handled exclusively by
> `calculateMovement` from `src/logic/physics.ts` (Module 01). The `assignPlayerPosition`
> machine action calls `calculateMovement(currentPos, inputToVelocity(input, speed), delta)`.
> Do not duplicate that logic here.

### Function: `clampToWorld(position, worldWidth, worldHeight, entityHalfSize) → Vec2`
- Prevents the player from walking off the canvas edge.
- Returns a clamped `Vec2`.
- Called after `calculateMovement` and `applyCollisions` to enforce world boundaries as the final step.

---

## System 2: Collision Detection & Resolution (AABB)

### Function: `getEntityRect(position, width, height) → Rect`
- Converts a center-point position + dimensions to a `Rect` (top-left origin).

### Function: `rectsOverlap(a, b) → boolean`
- Standard AABB overlap test.
- Returns `true` if rectangles intersect.

### Function: `resolveAxisX(entityRect, obstacleRect) → number`
- If `entityRect` overlaps `obstacleRect` on the X-axis, returns the corrected `x` position (pushed out).
- Returns the original `x` if no overlap on that axis.

### Function: `resolveAxisY(entityRect, obstacleRect) → number`
- Same as above but for the Y-axis.

### Function: `applyCollisions(position, entitySize, obstacles, velocity) → Vec2`
- Resolution strategy: **per-axis sequential resolution** — prevents corner-sticking and jitter.
- Step 1: Apply X displacement only → `candidateX = calculateMovement(position, {x: velocity.x, y: 0}, delta)`.
- Step 2: Resolve all obstacle overlaps on X → produces `safeX`.
- Step 3: Apply Y displacement only → `candidateY = calculateMovement({x: safeX, y: position.y}, {x: 0, y: velocity.y}, delta)`.
- Step 4: Resolve all obstacle overlaps on Y → produces `safeY`.
- Returns `{ x: safeX, y: safeY }`.

> This replaces the previous "least penetration axis" single-pass strategy.
> Sequential per-axis resolution means the player slides along walls instead of stopping dead,
> and never gets stuck in corners.

---

## System 3: Static World Layout

### Office Dimensions
- Canvas: `1280 × 720`
- Playable area: full canvas minus a 16px border wall on all sides.

### Static Obstacle Map (initial layout — subject to art revision)

| Object | x | y | w | h | Notes |
|---|---|---|---|---|---|
| Border walls | 0 | 0 | 1280 | 16 | Top |
| Border walls | 0 | 704 | 1280 | 16 | Bottom |
| Border walls | 0 | 0 | 16 | 720 | Left |
| Border walls | 1264 | 0 | 16 | 720 | Right |
| Reception desk | 100 | 80 | 160 | 60 | Near entrance |
| Fridge | 60 | 60 | 48 | 80 | Ernesto's post — collision box is ~15% smaller than visual to keep interaction radius accessible |
| Engineering desks (row) | 300 | 200 | 300 | 60 | Priya's area |
| Sales desks (row) | 700 | 200 | 300 | 60 | Jake's area |
| HR desk | 300 | 450 | 160 | 60 | Linda's area |
| CEO office wall | 900 | 400 | 300 | 16 | Separating wall |
| CEO office door gap | 1000 | 400 | 60 | 16 | Passable gap |
| CEO desk | 950 | 500 | 180 | 60 | Final boss desk — collision box is ~15% smaller than visual to keep interaction radius accessible |

> These coordinates are **logic constants** exported from `src/logic/world.ts`.
> The render layer reads them to draw sprites — single source of truth.

> **Interaction Buffer Rule (enforced in `world.ts`):** Collision bounding boxes for
> NPC-adjacent furniture (Fridge, CEO Desk) must be **10–20% smaller** than the
> visual sprite footprint. This ensures the player can enter the NPC's `interactionRadius`
> without being blocked by the obstacle geometry. Document this ratio as a comment on
> each affected `Rect` constant in code.

### Function: `getStaticObstacles() → Rect[]`
- Returns the full array of static obstacle `Rect` objects.
- Pure — no side effects, same output every call.

---

## Input System Note
Raw keyboard state is captured in `src/view/` (DOM event listeners) and converted
to an `InputDirection` object. That object is passed into `inputToVelocity` — keeping
DOM concerns in the view layer and math in the logic layer.

---

## Test Plan

### `src/logic/movement.test.ts`
- `inputToVelocity` with `up: true` → `{ x: 0, y: -speed }`
- `inputToVelocity` with `right: true` → `{ x: speed, y: 0 }`
- `inputToVelocity` with `up: true, right: true` → magnitude equals `speed` (diagonal normalised)
- `inputToVelocity` with no input → `{ x: 0, y: 0 }`
- `clampToWorld` prevents position from exceeding world boundaries
- `clampToWorld` accounts for `entityHalfSize` so entity never partially exits the world

### `src/logic/collision.test.ts`
- `rectsOverlap` returns `true` for overlapping rects
- `rectsOverlap` returns `false` for adjacent (touching) rects
- `rectsOverlap` returns `false` for non-overlapping rects
- `resolveAxisX` pushes entity clear of obstacle on X when overlapping
- `resolveAxisX` returns original `x` when no X overlap
- `resolveAxisY` pushes entity clear of obstacle on Y when overlapping
- `resolveAxisY` returns original `y` when no Y overlap
- `applyCollisions` with zero obstacles returns unchanged position
- `applyCollisions` with one obstacle resolves X then Y (player slides along wall, does not stop dead)
- `applyCollisions` — player approaching a corner does not get stuck (both axes resolve independently)

---

## Definition of Done
- [ ] All functions are pure — no globals, no DOM, no imports from PixiJS/XState
- [ ] Static obstacle map exported as a typed constant
- [ ] Diagonal normalisation verified by test
- [ ] All tests listed above pass (`npm test`)
