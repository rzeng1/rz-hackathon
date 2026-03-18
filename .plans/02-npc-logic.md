# Module 02: NPC Logic

## Objective
Define two pure-logic systems: (1) Ernesto's gatekeeper mechanic (energy drink dispense),
and (2) the XP-gain system for colleague NPC interactions. Zero PixiJS. Zero XState imports.
These are plain functions that accept state and return state — fully TDD-able.

---

## File Targets
- `src/logic/npc.ts` — NPC interaction logic (proximity check, dialogue trigger, gatekeeper checks)
- `src/logic/promotion.ts` — Promotion eligibility logic (`isEligibleForPromotion`)
- `src/logic/xp.ts` — XP calculation and leveling logic
- `src/logic/inventory.ts` — Inventory mutation helpers
- `src/logic/npc.test.ts`
- `src/logic/promotion.test.ts`
- `src/logic/xp.test.ts`
- `src/logic/inventory.test.ts`

---

## NPC Roster

| ID | Name | Role | Position | Reward |
|---|---|---|---|---|
| `ernesto` | Ernesto | `gatekeeper` | Fridge corner (TBD by world) | 1x Energy Drink per interaction |
| `priya` | Priya | `colleague` | Engineering desk | +10 XP |
| `jake` | Jake | `colleague` | Sales desk | +8 XP |
| `linda` | Linda | `colleague` | HR desk | +12 XP |
| `ceo` | The CEO | `colleague` | Corner office | Triggers `WIN` if player level ≥ 5 |

---

## System 1: Proximity / Interaction Check

### Function: `isInRange(playerPos, npcPos, radius) → boolean`
- Pure geometry: Euclidean distance between two `Vec2` points vs. `radius`.
- Lives in `src/logic/npc.ts`.
- Used by both the machine's guard conditions and the render layer (highlight NPCs).

### Function: `getNearbyNpc(playerPos, npcs) → NPC | null`
- Returns the first NPC whose `interactionRadius` contains `playerPos`.
- Returns `null` if none in range.
- Called every `TICK` event inside the machine to determine if `INTERACT` is available.

---

## System 2: Ernesto / Gatekeeper Logic

### NPC Interaction State

The previous `cooldownNpcIds: string[]` field on `GameState` is **removed**. In its place,
`GameState` gains:

```ts
type NPCState = {
  npcId: string
  hasInteractedThisSession: boolean
  lastInteractionTick: number
}
```

`GameState` shape change:
- **Remove**: `cooldownNpcIds: string[]`
- **Add**: `npcStates: NPCState[]`

> Design rationale: Session-based flag is more robust than position-based reset in a hackathon
> demo — players can re-enter Ernesto's range without accidentally resetting the interaction.

All position-based cooldown reset logic is removed entirely.

### Function: `canCollectFromNpc(npcId: string, npcStates: NPCState[]): boolean`
- Returns `true` if the target NPC's `hasInteractedThisSession` is `false` (or the NPC has
  no entry in `npcStates` yet, which is treated as not yet interacted).
- Replaces the old `canCollectFromNpc(npcId, cooldownNpcIds)` signature.

### Function: `markNpcInteracted(npcId: string, currentTick: number, npcStates: NPCState[]): NPCState[]`
- Returns a **new array** with the target NPC's `hasInteractedThisSession` set to `true` and
  `lastInteractionTick` set to `currentTick`.
- If no entry exists for `npcId`, one is appended.
- Immutable — does not mutate the input array.
- Replaces the old `addNpcCooldown` and `removeNpcCooldown` functions (both are removed).

### Function: `canInteractWithErnesto(player: Player): boolean`
- Lives in `src/logic/npc.ts`.
- Returns `true` only if `player.xp >= 20` (i.e. the player has reached Level 2+).
- Ernesto won't give the good caffeine to junior employees.
- Dialogue hint when check fails: `"You're too junior for the good caffeine."`

---

## System 3: Promotion Eligibility

### Home: `src/logic/promotion.ts`
Placed in its own file for cohesion — the CEO Ascension check involves both XP/level logic
and inventory logic, making it a natural cross-cutting concern separate from basic NPC proximity.

### Function: `isEligibleForPromotion(player: Player, inventory: InventoryItem[]): boolean`
- Returns `true` only when **both** conditions are met:
  1. `calculateLevel(player.xp) >= 5`
  2. `getItemQuantity(inventory, 'energy-drink') >= 3`
- This is the canonical "CEO Ascension" check.
- The `canBecomeCEO` guard in `gameMachine` **must delegate to this function** — it must not
  re-implement the level/drink conditions inline. Any change to ascension requirements should
  only require editing `isEligibleForPromotion`.

---

## System 4: XP Gain

### Leveling Table
| Level | XP Required (cumulative) |
|---|---|
| 1 | 0 |
| 2 | 20 |
| 3 | 50 |
| 4 | 90 |
| 5 | 140 |

### Function: `calcLevel(xp) → number`
- Accepts total XP, returns current level (1–5).
- Pure lookup against the leveling table constant.
- Also exported as `calculateLevel` for use by `isEligibleForPromotion`.

### Function: `applyXpGain(player, amount) → Player`
- Returns a new `Player` with `xp` incremented and `level` recalculated via `calcLevel`.
- Does NOT mutate input.

### XP Awards Per NPC
- Ernesto: 0 XP (item reward only)
- Priya: +10 XP
- Jake: +8 XP
- Linda: +12 XP
- CEO: triggers `WIN` event if `player.level >= 5`, otherwise +0 XP with hint dialogue

---

## System 5: Inventory

### Function: `addItem(inventory, itemId, displayName) → InventoryItem[]`
- If item exists, increments `quantity`. Otherwise appends new entry.
- Returns a new array — never mutates.

### Function: `getItemQuantity(inventory, itemId) → number`
- Returns quantity of a given item, or `0` if not present.

---

## Test Plan

### `src/logic/npc.test.ts`
- `isInRange` returns `true` when distance < radius
- `isInRange` returns `false` when distance > radius
- `isInRange` returns `true` on exact boundary (edge case)
- `getNearbyNpc` returns correct NPC when player overlaps one
- `getNearbyNpc` returns `null` when no NPC in range
- `canCollectFromNpc` returns `true` when NPC has no entry in `npcStates`
- `canCollectFromNpc` returns `true` when NPC entry has `hasInteractedThisSession: false`
- `canCollectFromNpc` returns `false` when NPC entry has `hasInteractedThisSession: true`
- `markNpcInteracted` returns a new array (does not mutate input)
- `markNpcInteracted` sets `hasInteractedThisSession: true` and updates `lastInteractionTick` for existing NPC
- `markNpcInteracted` appends a new entry when no entry exists for the given `npcId`
- `canInteractWithErnesto` returns `false` when `player.xp = 19` (under threshold)
- `canInteractWithErnesto` returns `true` when `player.xp = 20` (at threshold)

### `src/logic/promotion.test.ts`
- `isEligibleForPromotion` returns `false` when level < 5 and drinks >= 3
- `isEligibleForPromotion` returns `false` when level >= 5 but `energy-drink` quantity < 3
- `isEligibleForPromotion` returns `false` when drinks >= 3 but level < 5
- `isEligibleForPromotion` returns `true` when `calculateLevel(player.xp) >= 5` AND `energy-drink` quantity >= 3

### `src/logic/xp.test.ts`
- `calcLevel(0)` → `1`
- `calcLevel(19)` → `1`
- `calcLevel(20)` → `2`
- `calcLevel(140)` → `5`
- `applyXpGain` returns a new object (referential inequality check)
- `applyXpGain` correctly updates `level` when XP crosses threshold

### `src/logic/inventory.test.ts`
- `addItem` to empty inventory creates entry with `quantity: 1`
- `addItem` duplicate item increments `quantity`
- `getItemQuantity` returns `0` for missing item
- `addItem` does not mutate original array

---

## Definition of Done
- [ ] All logic functions are pure (no side effects, no imports from PixiJS or XState)
- [ ] All functions use `type` parameters, not `interface`
- [ ] `calcLevel` / `calculateLevel` and leveling table exported as constants for render use
- [ ] `canInteractWithErnesto` implemented in `src/logic/npc.ts` with xp >= 20 guard
- [ ] `isEligibleForPromotion` implemented in `src/logic/promotion.ts`; `canBecomeCEO` guard in `gameMachine` delegates to it
- [ ] `NPCState` type defined; `npcStates: NPCState[]` present on `GameState`; `cooldownNpcIds` removed
- [ ] `canCollectFromNpc` and `markNpcInteracted` implemented; old `addNpcCooldown`/`removeNpcCooldown` removed
- [ ] All tests listed above pass (`npm test`)
