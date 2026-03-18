# Module 05: Temporal System

## Objective
Introduce a game clock that drives NPC schedule behaviour. Time advances every TICK.
At 12:00 PM all NPCs migrate to the Lunch Room. At 13:00 they return to their desks.
No new XState states are introduced — the transition is an internal assignment within
the existing `playing` state, emergent from schedule logic in `src/logic/`.

---

## File Targets
- `src/logic/time.ts` — `GameTime` type, `advanceTime`, `isLunchTime`, `formatTime`, `TICKS_PER_GAME_MINUTE`
- `src/logic/npcSchedule.ts` — `getNpcTarget(npcId, gameTime)`, NPC desk positions, `LUNCH_ROOM`
- `src/logic/state.ts` — Add `gameTime: GameTime` to `GameState` and `INITIAL_STATE`
- `src/machines/gameMachine.ts` — Extend TICK action to advance time + update NPC positions
- `src/logic/__tests__/time.test.ts`
- `src/logic/__tests__/npcSchedule.test.ts`

---

## Data Shapes

### `GameTime`
```ts
type GameTime = {
  hours: number    // 0–23
  minutes: number  // 0–59
}
```
Stored in `GameState`. Start value: `{ hours: 9, minutes: 0 }` (09:00).

### `GameState` additions
```
gameTime: GameTime   // replaces nothing — new field
```
NPC `position` fields in `npcs: NPC[]` remain on `GameState` but are now updated
each TICK by `getNpcTarget` rather than being permanently static.

---

## System 1: Time Progression

### Constant: `TICKS_PER_GAME_MINUTE`
- Tunable integer. Recommended value: `60` (1 real second at 60 FPS = 1 game minute).
- At this rate: 09:00 → 12:00 = 3 real minutes. 09:00 → 18:00 = 9 real minutes.
- Exported from `src/logic/time.ts` so tests can override it.

### Function: `advanceTime(current: GameTime, delta: number): GameTime`
- Adds `delta / TICKS_PER_GAME_MINUTE` minutes to `current`.
- Handles minute overflow into hours (e.g. 60 min → next hour).
- Clamps to 18:00 (end of office day) — time stops there.
- Pure function — returns a new `GameTime`, never mutates.

### Function: `isLunchTime(gameTime: GameTime): boolean`
- Returns `true` when `hours === 12` (12:00–12:59).

### Function: `isPM(gameTime: GameTime): boolean`
- Returns `true` when `hours >= 12`.

### Function: `formatTime(gameTime: GameTime): string`
- Returns a display string, e.g. `"12:05 PM"`. Used by the HUD clock.

### Function: `totalMinutes(gameTime: GameTime): number`
- Returns `hours * 60 + minutes`. Used for schedule comparisons.

---

## System 2: NPC Schedule

### Constant: `LUNCH_ROOM`
```ts
const LUNCH_ROOM: Vec2 = { x: 600, y: 100 }
```

### NPC Desk Positions (canonical — replaces raw values in `INITIAL_STATE`)
Exported from `src/logic/npcSchedule.ts` as `NPC_DESK_POSITIONS`:

| NPC ID | Desk X | Desk Y |
|---|---|---|
| `chaz` | 1040 | 530 |
| `rizzo` | 700 | 350 |
| `paul` | 850 | 230 |
| `matthew` | 450 | 230 |

> These replace the hardcoded positions in `INITIAL_STATE`. `INITIAL_STATE` now
> initialises NPC positions by calling `getNpcTarget(id, INITIAL_GAME_TIME)`.

### Function: `getNpcTarget(npcId: string, gameTime: GameTime): Vec2`
- Returns the NPC's schedule-driven destination:
  - `isLunchTime(gameTime)` → returns `LUNCH_ROOM` for **all** NPCs.
  - `gameTime.hours >= 13` → returns desk position from `NPC_DESK_POSITIONS`.
  - Otherwise (09:00–11:59) → returns desk position.
- Falls back to `LUNCH_ROOM` for unknown NPC ids (safe default).
- Pure function — no side effects.

### NPC Movement Strategy (two options — pick one at implementation time)

**Option A — Instant Teleport** (recommended for hackathon):
The TICK action assigns `npc.position = getNpcTarget(npc.id, newGameTime)` directly.
NPCs snap to their new position the frame time crosses 12:00. Simple, no pathfinding.

**Option B — Smooth Walk** (stretch goal):
Store `npc.targetPosition: Vec2` separately. Each tick apply a lerp toward target.
Requires `moveToward(current, target, speed, delta)` utility. Deferred to post-launch.

**Decision: implement Option A first. Option B is a named upgrade path.**

---

## Machine Integration — How 12:00 PM Transition Works Without Interrupting `playing`

The TICK action is extended from `assignPlayerPosition` to a broader `assignTickUpdate`:

```
TICK event received
  │
  ├─ advanceTime(context.gameTime, event.delta) → newGameTime
  │
  ├─ applyCollisions + clampToWorld → newPlayerPosition  (unchanged from Module 01)
  │
  └─ for each NPC:
       getNpcTarget(npc.id, newGameTime) → npc.position
  │
  assign({ player: { position: newPlayerPosition }, gameTime: newGameTime, npcs: updatedNpcs })
  │
  machine stays in 'playing' ← no state transition, no event raised
```

The 12:00 crossing is not a special event. It is simply the tick where
`getNpcTarget` starts returning `LUNCH_ROOM` instead of a desk coordinate.
The machine is entirely unaware of the concept of "lunch" — it only knows that
`npcs[i].position` changed, which triggers a re-render in the view layer.

**No new XState states. No new events. No timers. Zero side effects.**

---

## HUD Clock Addition
The HUD (`src/view/hud.ts`) should display the current time string.
Add a `Text` element that calls `formatTime(state.gameTime)` on each `update`.
This is the only place `formatTime` is called — never in logic.

---

## GameState delta to `INITIAL_STATE`
```ts
// Add to INITIAL_STATE:
gameTime: { hours: 9, minutes: 0 }

// Update each NPC's initial position:
// position: getNpcTarget(npc.id, { hours: 9, minutes: 0 })
// (resolves to their desk position at startup)
```

---

## Test Plan

### `src/logic/__tests__/time.test.ts`
- `advanceTime({ hours: 9, minutes: 0 }, 60)` → `{ hours: 10, minutes: 0 }` (at 60 ticks/min)
- `advanceTime` handles minute overflow into next hour
- `advanceTime` clamps at 18:00 — does not exceed end of day
- `advanceTime` does not mutate input object
- `isLunchTime({ hours: 12, minutes: 0 })` → `true`
- `isLunchTime({ hours: 11, minutes: 59 })` → `false`
- `isLunchTime({ hours: 13, minutes: 0 })` → `false`
- `formatTime({ hours: 9, minutes: 5 })` → `"09:05 AM"`
- `formatTime({ hours: 12, minutes: 30 })` → `"12:30 PM"`
- `totalMinutes({ hours: 10, minutes: 30 })` → `630`

### `src/logic/__tests__/npcSchedule.test.ts`
- `getNpcTarget('matthew', { hours: 9, minutes: 0 })` → desk position
- `getNpcTarget('matthew', { hours: 12, minutes: 0 })` → `LUNCH_ROOM`
- `getNpcTarget('paul', { hours: 12, minutes: 59 })` → `LUNCH_ROOM`
- `getNpcTarget('rizzo', { hours: 13, minutes: 0 })` → desk position (returned from lunch)
- `getNpcTarget` returns same reference for `LUNCH_ROOM` for all NPCs at 12:xx
- `getNpcTarget` for unknown id → safe fallback (no crash)

---

## Definition of Done
- [ ] `GameTime` type and `INITIAL_STATE.gameTime` defined
- [ ] `advanceTime` clamps at 18:00 and is immutable
- [ ] `getNpcTarget` returns `LUNCH_ROOM` for all NPCs between 12:00–12:59
- [ ] TICK action updates `gameTime` and NPC positions atomically in one `assign`
- [ ] Machine stays in `playing` through the 12:00 transition — verified by test
- [ ] HUD displays formatted time via `formatTime`
- [ ] All unit tests pass (`npm test`)
