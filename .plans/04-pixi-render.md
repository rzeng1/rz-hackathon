# Module 04: PixiJS Render Layer

## Objective
Visualize the game world. This layer is a **pure subscriber** to `gameMachine` state —
it reads state and draws pixels. It never computes logic or mutates state directly.
All world coordinates come from Module 03 constants. All XState events are dispatched
from here (input → event → machine → new state → re-render).

---

## File Targets
- `src/main.ts` — PixiJS app init, machine start, render loop
- `src/view/renderer.ts` — Factory: creates and owns all PixiJS display objects
- `src/view/input.ts` — Keyboard listener → `InputDirection`; dispatches `PLAYER_MOVE`
- `src/view/hud.ts` — Factory: XP bar, inventory display, level indicator
- `src/view/dialogue.ts` — Factory: dialogue popup overlay (reads strings from `src/logic/dialogue.ts`)
- `src/logic/dialogue.ts` — Pure function: resolves the correct dialogue string for a given NPC + player state
- `src/assets/ASSETS_CONSTANTS.ts` — All sprite/asset paths (single source of truth)

> **No logic in this layer.** The render layer must never calculate game logic. It only calls
> pure functions from `src/logic/` to determine what to display. If you find yourself branching
> on `player.xp` or checking inventory inside a view file, move it to `src/logic/`.

---

## Architecture: Reactive Render Loop

```
[PixiJS Ticker TICK]
        │
        ▼
  dispatch TICK event to gameMachine
        │
        ▼
  gameMachine computes new state (via pure logic functions)
        │
        ▼
  renderer.update(newState) — diff & redraw only what changed
```

The machine is the clock. The renderer is the screen.

---

## Factory: `createRenderer(app)`

### Responsibility
Owns all PixiJS `Container`, `Sprite`, `Graphics`, and `Text` objects.
Exposes a single `update(state: GameState): void` method.

### Internal Display Objects
| Object | PixiJS Type | Source |
|---|---|---|
| World container | `Container` | Root scene |
| Floor / background | `Graphics` (filled rect, `#c8b89a`) | Drawn procedurally |
| Static obstacles | `Graphics` (filled rects) | `getStaticObstacles()` from Module 03 |
| Player sprite | `Sprite` | `ASSETS.PLAYER` |
| NPC sprites | `Sprite[]` | `ASSETS.NPC[id]` |
| Interaction highlight ring | `Graphics` (circle outline) | Shown when NPC in range |

### `update(state)` Logic
1. Move player `Sprite` to `state.player.position`.
2. **Y-sort player**: set `playerSprite.zIndex = state.player.position.y`. This ensures the player renders behind a desk when their center is above it (lower Y) and in front when below it (higher Y). Requires the world `Container` to have `sortableChildren = true`.
3. For each NPC, move its `Sprite` to `npc.position`. Apply the same Y-sort: `npcSprite.zIndex = npc.position.y`.
4. Show/hide the highlight ring based on `state.activeDialogueNpcId`.
5. Delegate to `hud.update(state)` and `dialogue.update(state)`.

> **Y-sorting rule**: All world-space sprites (player, NPCs, furniture) must have their `zIndex` set to their center Y position each frame. Static furniture `zIndex` is set once at creation. The `Container` re-sorts automatically. HUD and dialogue layers are in separate top-level containers with fixed high `zIndex` values and are never Y-sorted.

---

## Factory: `createInput(machine)`

### Responsibility
Listens to `keydown`/`keyup` DOM events and maintains an `InputDirection` object.
On every `TICK`, sends `PLAYER_MOVE` to the machine with the current direction.

### Key Bindings
| Key | Direction |
|---|---|
| `ArrowUp` / `W` | up |
| `ArrowDown` / `S` | down |
| `ArrowLeft` / `A` | left |
| `ArrowRight` / `D` | right |
| `E` / `Space` | Interact (dispatches `INTERACT` with nearest NPC id) |

### Teardown
Exposes a `destroy(): void` method that removes all event listeners. Required for
hot-module-reload correctness in Vite dev mode.

---

## Factory: `createHud(app)`

### Responsibility
Renders the non-diegetic UI overlay (always on top of the world scene).

### Elements
| Element | PixiJS Type | Data Source |
|---|---|---|
| XP label | `Text` | `state.player.xp` |
| Level badge | `Text` | `state.player.level` |
| XP progress bar | `Graphics` (two rects) | `xp / xpForNextLevel` ratio |
| Energy Drink count | `Text` + icon | `getItemQuantity(inventory, 'energy-drink')` |
| Debug mode indicator | `Text` ("DEBUG ON") | Internal `debugEnabled` flag |

### Debug Overlay (toggle: `\` key)
- `createHud` maintains an internal `debugEnabled: boolean` flag (default `false`).
- Pressing `\` flips the flag and shows/hides the debug layer.
- When `debugEnabled` is `true`, `update(state)` draws every `Rect` from `getStaticObstacles()` as a **semi-transparent red `Graphics` rectangle** (`fill: 0xff0000, alpha: 0.35`) on top of all world sprites.
- Also draws each NPC's `interactionRadius` as a semi-transparent yellow circle outline so proximity can be visually verified.
- Debug graphics are created once and toggled via `visible` — not recreated every frame.
- This is the primary tool for verifying AABB collision placement and NPC interaction radii during playtest.

---

## Factory: `createDialogue(app)`

### Responsibility
Renders the dialogue popup when `state.status === 'dialogue'`.

### Elements
- Semi-transparent dark panel (`Graphics`)
- NPC name header (`Text`)
- Dialogue body (`Text`) — static strings keyed by `npcId`
- "Press E to dismiss" hint (`Text`)

### Dialogue Resolution — `src/logic/dialogue.ts`

Dialogue strings are **not hardcoded in the view**. The view calls a pure function:

```
getDialogueText(npcId: string, player: Player, inventory: InventoryItem[]): string
```

This function owns all branching logic:
- For `ernesto`: calls `canInteractWithErnesto(player)` — returns the success or rejection line.
- For `ceo`: calls `isEligibleForPromotion(player, inventory)` — returns promotion or hint line.
- For all other NPCs: returns their static flavour line.

**Script constants (inside `src/logic/dialogue.ts`):**
```
ernesto_eligible:   "Yo, you look dead. Here's a Celsius. Don't tell HR."
ernesto_blocked:    "You're too junior for the good caffeine."
priya:              "Push to prod? On a Friday? Bold move."
jake:               "Bro, I literally closed a deal in my sleep last night."
linda:              "I've filed the paperwork. Three times."
ceo_eligible:       "The board is ready for you. Welcome to the top."
ceo_blocked:        "You're not ready yet. Get more experience — and caffeine."
```

The view calls `getDialogueText(npcId, state.player, state.inventory)` and renders the result. It never reads `player.xp` or `inventory` directly.

---

## Assets Constants (`src/assets/ASSETS_CONSTANTS.ts`)

All asset paths are defined here. The render layer imports from this file only —
never hardcodes paths inline.

```
ASSETS = {
  PLAYER: '/assets/sprites/player.png',
  NPCS: {
    ernesto: '/assets/sprites/ernesto.png',
    priya:   '/assets/sprites/priya.png',
    jake:    '/assets/sprites/jake.png',
    linda:   '/assets/sprites/linda.png',
    ceo:     '/assets/sprites/ceo.png',
  },
  ITEMS: {
    energyDrink: '/assets/sprites/energy-drink.png',
  },
  TILESET: '/assets/tiles/office-floor.png',
}
```

> For hackathon speed: placeholder colored `Graphics` rectangles are acceptable
> stand-ins for all sprites until art assets exist. The constant file still ships
> on day 1 — just unused until art is ready.

---

## `src/main.ts` Wiring

```
1. Create PixiJS Application, await app.init(...)
2. Append app.canvas to document.body
3. Create gameMachine actor, start it
4. Create renderer = createRenderer(app)
5. Create hud = createHud(app)
6. Create dialogue = createDialogue(app)
7. Create input = createInput(machine)
8. Subscribe to machine state changes → renderer.update(state)
9. Add PixiJS Ticker callback → dispatch TICK { delta: ticker.deltaTime } to machine
10. dispatch START_GAME to machine
```

### Ticker Delta Normalisation
- Pass `ticker.deltaTime` (not `ticker.elapsedMS`) to the `TICK` event.
- PixiJS normalises `deltaTime` to `1.0` at 60 FPS. At 144 Hz it is `~0.42`; at 30 Hz it is `~2.0`.
- `calculateMovement` multiplies `velocity * delta`, so movement speed in pixels-per-second remains consistent across all refresh rates.
- **Never pass raw `ticker.elapsedMS`** — that is in milliseconds and will produce wildly different speeds per frame.

---

## Win / Loss Screen
- On `state.status === 'won'`: overlay a full-screen panel with "YOU ARE NOW CEO 🎉" text.
- No `lost` state in v1 — the game only ends in victory.

---

## Performance Notes
- Do **not** recreate display objects every frame. Create once; update position/visibility each frame.
- NPC sprites are created at startup for all NPCs in `INITIAL_STATE.npcs`.
- Static obstacles are drawn once to a `Graphics` object and cached (`graphics.cacheAsTexture()`).

---

## Testing Note
This module has **no unit tests** — per AGENTS.MD, rendering is verified by manual playtest.
Focus automated test effort on Modules 01–03.

---

## Definition of Done
- [ ] `npm run dev` shows a blank office floor with a movable player square/sprite
- [ ] Player collides with obstacles (cannot walk through desks/walls)
- [ ] Walking up to Ernesto triggers dialogue popup
- [ ] Collecting an energy drink increments the HUD counter
- [ ] Walking up to a colleague NPC shows dialogue and awards XP
- [ ] HUD XP bar fills and level increments correctly
- [ ] Reaching Level 5 and talking to CEO shows win screen
