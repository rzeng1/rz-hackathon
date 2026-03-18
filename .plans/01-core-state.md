# Module 01: Core State

## Objective
Define the single serializable `GameState` type that lives in `gameMachine` context.
This is the ground truth for the entire game. No module may invent state outside of it.

---

## File Targets
- `src/machines/gameMachine.ts` — XState v5 machine definition
- `src/logic/state.ts` — Exported `GameState` type and initial state constant
- `src/logic/physics.ts` — Pure physics and math utilities (no side effects)
- `src/logic/xp.ts` — Pure XP/level utilities (see Module 02 plan)

---

## Data Shapes (`type`, never `interface`)

### `Vec2`
A reusable 2D coordinate type used everywhere positions appear.
```
{ x: number, y: number }
```

### `Player`
```
{
  id: 'player'
  position: Vec2
  speed: number          // pixels per tick
  xp: number
  level: number          // derived from xp, but stored for quick render lookup
}
```

### `NPC`
```
{
  id: string             // e.g. 'ernesto', 'priya', 'jake'
  displayName: string
  position: Vec2
  interactionRadius: number   // pixels — triggers dialogue when player enters
  role: 'gatekeeper' | 'colleague'
}
```

### `InventoryItem`
```
{
  id: string             // e.g. 'energy-drink'
  displayName: string
  quantity: number
}
```

### `GameStatus`
```
'idle' | 'playing' | 'dialogue' | 'won' | 'lost'
```

### `GameState` (the XState context)
```
{
  status: GameStatus
  player: Player
  npcs: NPC[]
  inventory: InventoryItem[]
  activeDialogueNpcId: string | null
  tickCount: number
}
```

---

## System: Physics Utility (`src/logic/physics.ts`)

All position math is centralised here so the machine never computes movement inline.

### `calculateMovement`
```ts
calculateMovement(currentPos: Vec2, velocity: Vec2, delta: number): Vec2
```
Returns a **new** `Vec2` representing the next position:
```
{ x: currentPos.x + velocity.x * delta,
  y: currentPos.y + velocity.y * delta }
```
Pure function — no mutation, no side effects, no XState dependency.

> **Note on `calculateLevel`:** Level derivation lives in `src/logic/xp.ts` to stay
> consistent with the Module 02 plan, which already owns that file.
> See the `assignXP` action description below for how it is called.

---

## XState Machine Outline (`gameMachine`)

### States
| State | Description |
|---|---|
| `idle` | Title screen / before game starts |
| `playing` | Normal gameplay — movement and tick updates active |
| `dialogue` | Player is in an NPC interaction — movement paused |
| `won` | Player reached CEO — game over (victory) |

### Events
| Event | Payload | Description |
|---|---|---|
| `START_GAME` | — | Transition from `idle` → `playing` |
| `TICK` | `{ delta: number }` | Every animation frame; triggers movement/physics |
| `PLAYER_MOVE` | `{ direction: Vec2 }` | Input from keyboard/gamepad |
| `INTERACT` | `{ npcId: string }` | Player pressed interact near an NPC |
| `DIALOGUE_END` | `{ npcId: string }` | Dialogue dismissed |
| `COLLECT_ITEM` | `{ itemId: string, fromNpcId: string }` | Item added to inventory |
| `WIN` | — | Triggered when win conditions are met; guarded by `canBecomeCEO` |

> **Removed: `GAIN_XP` event.** Level is a derived value, not an event-driven one.
> The machine stays thin by delegating the calculation to a pure utility
> (`calculateLevel` in `src/logic/xp.ts`). XP is incremented inside `assignXP`
> (called on `COLLECT_ITEM` or other rewarding events), and `player.level` is
> re-derived immediately within the same assign — no separate event needed.

### Guards
| Guard | Description |
|---|---|
| `canBecomeCEO` | Returns `true` when `context.inventory` contains at least 1 Energy Drink **and** `calculateLevel(context.player.xp)` meets the level-5 threshold. Referenced on the `playing` → `won` transition via the `WIN` event. |

### XState `assign` Actions (no direct mutation)
- `assignPlayerPosition` — updates `player.position` on `TICK` by calling `calculateMovement(context.player.position, derivedVelocity, event.delta)` from `src/logic/physics.ts`; never computes the new position inline
- `assignXP` — increments `player.xp` by the awarded amount, then immediately derives `player.level` by calling `calculateLevel(newXp)` from `src/logic/xp.ts` within the same assign; no separate `GAIN_XP` event is emitted
- `assignInventory` — pushes/increments item on `COLLECT_ITEM`
- `assignActiveDialogue` — sets `activeDialogueNpcId` on `INTERACT`
- `clearActiveDialogue` — nulls `activeDialogueNpcId` on `DIALOGUE_END`

---

## Initial State Constant
A plain object exported from `src/logic/state.ts` — used both by the machine
and directly in unit tests without instantiating XState.

```
INITIAL_STATE: GameState = {
  status: 'idle',
  player: {
    id: 'player',
    position: { x: 400, y: 300 },
    speed: 3,
    xp: 0,
    level: 1,
  },
  npcs: [
    // Ernesto — fridge corner
    { id: 'ernesto', displayName: 'Ernesto', position: { x: 100, y: 100 },
      interactionRadius: 60, role: 'gatekeeper' },
    // Colleague NPCs (positions TBD in 02-npc-logic)
  ],
  inventory: [],
  activeDialogueNpcId: null,
  tickCount: 0,
}
```

---

## Test Plan (`src/logic/state.test.ts`)
- `INITIAL_STATE` has `status: 'idle'`
- `INITIAL_STATE.player.xp` starts at `0`
- `INITIAL_STATE.inventory` is an empty array
- `INITIAL_STATE.npcs` contains exactly one gatekeeper (`ernesto`)

### Physics Utility (`src/logic/physics.test.ts`)
- `calculateMovement({ x: 0, y: 0 }, { x: 1, y: 0 }, 16)` returns `{ x: 16, y: 0 }`
- `calculateMovement` with zero delta returns the original position unchanged
- `calculateMovement` does not mutate the input `currentPos` object

### `canBecomeCEO` Guard (`src/machines/gameMachine.test.ts`)
The guard predicate should be extracted as a standalone pure function so it can be tested directly:
- Returns `false` when inventory is empty
- Returns `false` when inventory has an Energy Drink but player XP is below the level-5 threshold
- Returns `false` when player XP meets level 5 but no Energy Drink is in inventory
- Returns `true` when inventory has at least 1 Energy Drink AND XP meets the level-5 threshold

---

## Definition of Done
- [ ] `GameState` type compiles with strict TypeScript
- [ ] `INITIAL_STATE` satisfies `GameState`
- [ ] `gameMachine` created with `setup()` API, all events typed
- [ ] All `assign` actions replace context immutably (spread, not mutate)
- [ ] `src/logic/physics.ts` exists and exports `calculateMovement` as a pure function
- [ ] `assignPlayerPosition` calls `calculateMovement` — no inline position math in the machine
- [ ] `assignXP` derives `player.level` via `calculateLevel` from `src/logic/xp.ts` — no `GAIN_XP` event in the machine
- [ ] `canBecomeCEO` guard is defined and referenced on the `playing` → `won` (`WIN`) transition
- [ ] Unit tests for `INITIAL_STATE` shape pass (`npm test`)
- [ ] Unit tests for `calculateMovement` pass
- [ ] Unit tests for `canBecomeCEO` guard predicate pass
