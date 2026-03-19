# Agent Instructions & Project Conventions

## Render / Logic Boundary
**The Render layer (PixiJS) must never calculate game logic; it only calls pure functions from `src/logic/` to determine what to display.**
- Dialogue strings are resolved by `getDialogueText(npcId, player, inventory)` in `src/logic/dialogue.ts` — never branched on `player.xp` inside a view file.
- Collision, XP, promotion eligibility, and gatekeeper checks all live in `src/logic/`. The view reads state and calls logic helpers; it never re-implements them.
- **Ticker delta**: Always pass `ticker.deltaTime` (PixiJS normalised, 1.0 at 60 FPS) to the `TICK` event. Never pass `ticker.elapsedMS`. This keeps movement speed frame-rate independent.
- **Y-sorting**: All world-space sprites set `zIndex = position.y` each frame. The world `Container` must have `sortableChildren = true`. HUD/dialogue containers are separate and never Y-sorted.
- **Debug overlay**: `createHud` exposes a `\` key toggle. When active, all AABB `Rect` obstacles render as semi-transparent red and NPC interaction radii render as yellow circle outlines. Used exclusively for playtest verification — no game logic lives in the debug layer.

## Core Architecture
- **Paradigm**: Functional-Reactive. Strictly **no classes**. Use Factory Functions with closures for private state.
- **State Management**: The "Single Source of Truth" is the `gameMachine` (XState v5). Its context is the serializable `GameState` type.
- **Systems**: Logic (XP calculation, Inventory, NPC AI) must be pure functions that accept `state` and return a modified `state`.
- **Transitions**: **All state transitions must happen via XState events.** Never mutate context directly outside of XState `assign` actions.
- **Thin Machine**: The `gameMachine` must not compute logic inline. All math and derivations are delegated to pure utilities in `src/logic/`.
- **Movement feel**: Instant Stop is the confirmed design. `inputToVelocity` returns `{ x: 0, y: 0 }` when no keys are held; `calculateMovement` produces zero displacement. No momentum, easing, or friction — ever.
- **Collision resolution**: Per-axis sequential (X first, then Y). Never single-pass least-penetration. This prevents corner-sticking and gives wall-sliding for free.
- **Interaction buffers**: Collision boxes for NPC-adjacent furniture (Fridge, CEO Desk) must be 10–20% smaller than the visual sprite footprint so the player can enter the NPC's `interactionRadius` without being blocked.
- **Derived State**: Level is derived from XP via `calculateLevel(xp)` — it is not an event. It is re-derived inside `assignXP` and stored on `player.level` for fast render access. There is no `GAIN_XP` event.
- **Guards**: Win-condition logic must be expressed as named XState guards backed by pure, testable predicate functions (e.g. `canBecomeCEO`).

## Tech Stack
- **Engine**: PixiJS (Rendering Only)
- **State Machine**: XState v5 (`setup()` API)
- **Logic**: TypeScript + Vitest (TDD)
- **Bundler**: Vite

## Project Structure
- `/src/logic`: Pure game logic (TDD enforced). No PixiJS imports here.
  - `physics.ts` — position math (`calculateMovement`)
  - `xp.ts` — leveling utilities (`calculateLevel` / `calcLevel`, leveling table)
  - `npc.ts` — proximity (`isInRange`, `getNearbyNpc`), gatekeeper (`canInteractWithErnesto`, `canCollectFromNpc`, `markNpcInteracted`)
  - `npcSchedule.ts` — `getNpcTarget(npcId, gameTime)`: derives NPC destination from schedule
  - `dialogue.ts` — `getDialogueText(npcId, player, inventory)`: single source of truth for all NPC dialogue strings and branching
  - `promotion.ts` — CEO Ascension check (`isEligibleForPromotion`)
  - `inventory.ts` — inventory helpers (`addItem`, `getItemQuantity`)
  - `tasks.ts` — `Task` type and pure task-state helpers
  - `npcBehavior.ts` — NPC-specific interaction guards (`hasProductSpec`, `hasActiveFire`, `hasSuccessStory`, `canButtKissChaz`)
  - `time.ts` — `GameTime` type, `advanceTime`, `isLunchTime`, `formatTime`
  - `world.ts` — static obstacle map + interactable location constants (shared with render layer)
  - `state.ts` — `GameState` type and `INITIAL_STATE` constant
- `/src/machines`: XState machine definitions. No PixiJS imports here.
- `/src/view`: PixiJS rendering code.
- `/src/factories`: Factory functions for creating entities (Players, NPCs, Items, Tasks).
  - `taskFactory.ts` — `createTask(type, assignedBy, tick)`: pure factory for Task objects
- `.plans/`: Module-specific execution plans.

## Code Conventions
- Use `type` instead of `interface` for data shapes.
- All coordinates and physics must be calculated in the logic layer (`src/logic/physics.ts`). The machine calls these utilities — it never computes positions inline.
- Assets: All sprite paths must be defined in a central `ASSETS_CONSTANTS.ts`.
- Guard predicates must be extractable as standalone pure functions so they can be unit tested independently of XState.
- **Win condition**: `isEligibleForPromotion(player, inventory)` in `src/logic/promotion.ts` is the single source of truth for CEO Ascension. Requires Level 5 AND ≥ 3 energy drinks. The `canBecomeCEO` guard must delegate to it — never re-implement inline.
- **Gatekeeper rule**: `canInteractWithErnesto(player)` gates Ernesto's energy drink behind `player.xp >= 20` (Level 2+). Junior employees get the "You're too junior for the good caffeine" rejection.
- **NPC interaction state**: Use `NPCState { npcId, hasInteractedThisSession, lastInteractionTick }` on `GameState` instead of position-based cooldowns. `cooldownNpcIds` must not appear anywhere in the codebase.
- **Temporal State**: `GameState` must include a `gameTime: GameTime` object. The day starts at 09:00. Time advances via `advanceTime(gameTime, delta)` called inside the TICK action — never mutated inline in the machine.
- **Derived NPC Positions**: NPC positions are no longer static after game start. Each TICK, `getNpcTarget(npcId, gameTime)` returns the NPC's schedule-driven destination. The machine assigns updated NPC positions as part of the TICK action — no new XState state is needed for time-of-day transitions.
- **TaskFactory**: Task objects (Product Specs, Customer Fires, Success Stories) are created via `createTask(type, assignedBy, tick)` in `src/factories/taskFactory.ts`. This is a pure factory function — no class, no `new`. Tasks are stored in `GameState.tasks: Task[]` and consumed/completed via XState actions backed by pure helpers in `src/logic/tasks.ts`.

- **Styling Rules**: All UI layout values (padding, bar heights, font sizes) must be stored in the central `src/view/layout_constants.ts` file. Do not use magic numbers for positioning display objects.

- **Coordinate Decoupling**: Entity positions (NPCs) and World Object positions (Desks/Coolers) must be distinct. Changing an NPC's home coordinate should automatically move their associated static collision box to match

## Testing Approach
- **Logic**: 100% Unit Test coverage via Vitest.
- **Machine guards**: Guard predicates extracted as pure functions and tested directly.
- **Rendering**: Manual playtest verification.