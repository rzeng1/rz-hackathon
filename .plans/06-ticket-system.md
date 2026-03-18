# Module 06: Ticket System

## Objective
Introduce a dynamic task economy driven by the new NPC roster. Matthew generates
Product Specs, Paul consumes them for XP. Rizzo creates Customer Fires that must
be resolved at the Server Rack. Chaz rewards Butt-Kissing with CEO-track XP when
the player brings Success Stories. All task state lives in `GameState.tasks`.
All task logic is pure functions — no side effects, fully TDD-able.

---

## Character Roster

| NPC ID | Name | Role | Core Mechanic |
|---|---|---|---|
| `chaz` | Chaz | CEO | Butt-Kissing: consumes `success-story`, awards high CEO-track XP |
| `rizzo` | Rizzo | Head of Customer Success | Issues `customer-fire` tasks; rewards on resolution |
| `paul` | Paul | Head of Product | Consumes `product-spec` items for XP |
| `matthew` | Matthew | Product Manager | Produces `product-spec` items + misc tasks |

> These replace the original `ernesto/priya/jake/linda/ceo` roster for Phase 2.
> The original roster may coexist during transition — plan for both.

---

## File Targets
- `src/logic/tasks.ts` — `Task` type, task helpers (`getPendingTasks`, `completeTask`, `hasPendingTaskOfType`)
- `src/logic/npcBehavior.ts` — Interaction guards: `hasProductSpec`, `hasActiveFire`, `hasSuccessStory`, `canButtKissChaz`
- `src/factories/taskFactory.ts` — `createTask(type, assignedBy, tick)` pure factory
- `src/logic/state.ts` — Add `tasks: Task[]` to `GameState`
- `src/machines/gameMachine.ts` — New events, guards, and actions for ticket loop
- `src/logic/__tests__/tasks.test.ts`
- `src/logic/__tests__/npcBehavior.test.ts`
- `src/factories/__tests__/taskFactory.test.ts`

---

## Data Shapes

### `TaskType`
```ts
type TaskType = 'product-spec' | 'customer-fire' | 'success-story'
```

### `TaskStatus`
```ts
type TaskStatus = 'pending' | 'in-progress' | 'complete'
```

### `Task`
```ts
type Task = {
  id: string
  type: TaskType
  status: TaskStatus
  assignedBy: string   // npcId of the NPC who issued the task
  assignedAt: number   // tickCount when task was issued (for ordering)
}
```

### `GameState` additions
```
tasks: Task[]   // active and recently completed tasks
```

---

## System 1: TaskFactory (`src/factories/taskFactory.ts`)

### Function: `createTask(type: TaskType, assignedBy: string, tick: number): Task`
- Pure factory function. No class. No `new`. No side effects.
- Generates a deterministic `id`: `\`task-${assignedBy}-${type}-${tick}\``
- Returns a `Task` with `status: 'pending'`.

> Lives in `src/factories/` per AGENTS.MD — factory functions for creating entities.

---

## System 2: Task Helpers (`src/logic/tasks.ts`)

### Function: `getPendingTasks(tasks: Task[]): Task[]`
- Filters to tasks with `status: 'pending'`.

### Function: `getPendingTasksOfType(tasks: Task[], type: TaskType): Task[]`
- Filters to pending tasks of a specific type.

### Function: `completeTask(taskId: string, tasks: Task[]): Task[]`
- Returns a new array with the target task's `status` set to `'complete'`.
- Immutable — does not mutate input.

### Function: `hasPendingTaskOfType(tasks: Task[], type: TaskType): boolean`
- Returns `true` if at least one pending task of the given type exists.

### Function: `countTasksOfType(tasks: Task[], type: TaskType): number`
- Returns the count of tasks of a given type regardless of status.
  Used by the HUD to show "fires pending" count.

---

## System 3: NPC Interaction Guards (`src/logic/npcBehavior.ts`)

All functions are pure predicates — extract and test directly, same pattern as `isEligibleForPromotion`.

### Function: `hasProductSpec(inventory: InventoryItem[]): boolean`
- Returns `true` if player has ≥ 1 `product-spec` in inventory.
- Used as guard before Paul awards XP.

### Function: `hasActiveFire(tasks: Task[]): boolean`
- Returns `true` if player has ≥ 1 pending `customer-fire` task.
- Used as guard to enable Server Rack interaction.

### Function: `hasSuccessStory(inventory: InventoryItem[]): boolean`
- Returns `true` if player has ≥ 1 `success-story` in inventory.
- Used as guard for Chaz Butt-Kissing interaction.

### Function: `canButtKissChaz(player: Player, inventory: InventoryItem[]): boolean`
- Returns `true` when `hasSuccessStory(inventory)` is true.
- Separated from `hasSuccessStory` to allow future additional conditions (e.g. min level).

---

## System 4: The Four Interaction Loops

### Loop A — Matthew → Paul (Product Spec Pipeline)
```
1. Player interacts with Matthew
   → Matthew is always available (no guard)
   → COLLECT_ITEM { itemId: 'product-spec', displayName: 'Product Spec', fromNpcId: 'matthew' }
   → Inventory gains 1 product-spec

2. Player interacts with Paul
   → Guard: hasProductSpec(inventory) must be true
   → On success: CONSUME_ITEM { itemId: 'product-spec' } + INTERACT awards XP
   → Paul's XP award: +15 XP
   → If hasProductSpec is false: blocked dialogue "Bring me a spec first."
```

### Loop B — Rizzo → Server Rack → Rizzo (Customer Fire Loop)
```
1. Player interacts with Rizzo
   → If no active fire: Rizzo issues a fire task
     → CREATE_TASK { type: 'customer-fire', assignedBy: 'rizzo' }
     → GameState.tasks gains a new pending customer-fire
   → If active fire already exists: blocked dialogue "You've already got a fire going."

2. Player walks to Server Rack (x: 50, y: 650) — treated as an interactable NPC-like location
   → Guard: hasActiveFire(tasks) must be true
   → On interact: COMPLETE_TASK { type: 'customer-fire' }
     → Marks task complete
     → COLLECT_ITEM { itemId: 'success-story', ... }

3. Player returns to Rizzo
   → Guard: hasSuccessStory(inventory)
   → On interact: CONSUME_ITEM { itemId: 'success-story' } + XP award
   → Rizzo's XP award: +12 XP
```

### Loop C — Chaz Butt-Kissing (CEO-Track XP)
```
1. Player interacts with Chaz
   → Guard: canButtKissChaz(player, inventory) — requires success-story in inventory
   → On success: CONSUME_ITEM { itemId: 'success-story' } + high XP award
   → Chaz's XP award: +25 XP (highest in the game — CEO track)
   → If no success story: blocked dialogue "Come back when you have something to show me."
   → Chaz also flags: hasInteractedThisSession so Butt-Kissing has diminishing returns
     (second interaction same session: +5 XP only)
```

### Loop D — Win Condition Update
The original win condition (Level 5 + 3 energy drinks) is superseded:
```
isEligibleForPromotion now requires:
  calculateLevel(player.xp) >= 5
  AND hasPendingTaskOfType(tasks, 'success-story') === false  (all fires resolved)
  AND getItemQuantity(inventory, 'success-story') >= 1
```
> `isEligibleForPromotion` in `src/logic/promotion.ts` must be updated to reflect this.
> The `canBecomeCEO` guard delegates to it — no machine changes needed.

---

## New Events (added to `GameEvent` in `gameMachine.ts`)

| Event | Payload | Description |
|---|---|---|
| `CREATE_TASK` | `{ type: TaskType; assignedBy: string }` | Issued when NPC assigns a task |
| `COMPLETE_TASK` | `{ type: TaskType }` | Player resolves a task at the fix location |
| `CONSUME_ITEM` | `{ itemId: string }` | Removes one unit of an item (spec, story) from inventory |

---

## New Machine Actions

| Action | Triggered by | Description |
|---|---|---|
| `assignNewTask` | `CREATE_TASK` | Calls `createTask` factory, appends to `context.tasks` |
| `assignCompleteTask` | `COMPLETE_TASK` | Calls `completeTask` on the first matching pending task |
| `assignConsumeItem` | `CONSUME_ITEM` | Decrements or removes item from inventory |

---

## New Machine Guards

| Guard | Predicate function | Description |
|---|---|---|
| `playerHasProductSpec` | `hasProductSpec(context.inventory)` | Gates Paul XP award |
| `playerHasActiveFire` | `hasActiveFire(context.tasks)` | Gates Server Rack interaction |
| `playerCanButtKissChaz` | `canButtKissChaz(context.player, context.inventory)` | Gates Chaz XP award |

---

## Static World Additions (`src/logic/world.ts`)

| Object | x | y | w | h | Notes |
|---|---|---|---|---|---|
| Server Rack | 30 | 630 | 40 | 60 | Interactable fix location for customer fires |
| Lunch Room table | 540 | 80 | 120 | 40 | Visual only — no collision |

> Server Rack is treated as a pseudo-NPC in `INITIAL_STATE.npcs` with `role: 'location'`
> so the existing `getNearbyNpc` / `isInRange` / `INTERACT` pipeline works without new code.

---

## Dialogue Script Additions (`src/logic/dialogue.ts`)

| Key | Script |
|---|---|
| `matthew_default` | "I've got three specs due by EOD. Here, take one." |
| `paul_eligible` | "Finally. A spec with my name on it." |
| `paul_blocked` | "Bring me a spec first. I don't do verbal requirements." |
| `rizzo_no_fire` | "Oh good, you're here. The client is MELTING DOWN. Go fix the server." |
| `rizzo_fire_active` | "You've already got a fire going. Focus." |
| `rizzo_post_fix` | "Nice save. The client thinks we're heroes. Here's your glory." |
| `chaz_eligible` | "Love the hustle. Love. It. Take the XP." |
| `chaz_blocked` | "Come back when you have something to show me." |
| `chaz_repeat` | "Good stuff, but let's not make this a habit. Eyes on the prize." |
| `server_rack` | "The server is on fire. Literally. Fixing..." |

---

## Dialogue Logic Update (`getDialogueText`)
```
npcId === 'matthew'      → matthew_default (always)
npcId === 'paul'         → paul_eligible if hasProductSpec else paul_blocked
npcId === 'rizzo'        → rizzo_no_fire / rizzo_fire_active / rizzo_post_fix (3-state)
npcId === 'chaz'         → chaz_eligible / chaz_blocked / chaz_repeat
npcId === 'server_rack'  → server_rack (always — just flavour text)
```
> `getDialogueText` signature gains a `tasks: Task[]` parameter so Rizzo state can be resolved.
> View layer passes `state.tasks` — never re-implements the logic inline.

---

## Test Plan

### `src/factories/__tests__/taskFactory.test.ts`
- `createTask('customer-fire', 'rizzo', 100)` returns a Task with correct fields
- `createTask` generates a deterministic `id`
- `createTask` always returns `status: 'pending'`
- `createTask` does not mutate any input

### `src/logic/__tests__/tasks.test.ts`
- `getPendingTasks` filters out completed tasks
- `hasPendingTaskOfType` returns `true` when match exists, `false` otherwise
- `completeTask` sets target task to `'complete'`, returns new array
- `completeTask` does not mutate original array
- `completeTask` does not affect other tasks
- `countTasksOfType` counts correctly across statuses

### `src/logic/__tests__/npcBehavior.test.ts`
- `hasProductSpec` returns `false` when inventory is empty
- `hasProductSpec` returns `true` when `product-spec` quantity ≥ 1
- `hasActiveFire` returns `false` when no pending fires
- `hasActiveFire` returns `true` with one pending fire
- `hasSuccessStory` returns `false` when inventory is empty
- `hasSuccessStory` returns `true` when `success-story` quantity ≥ 1
- `canButtKissChaz` delegates to `hasSuccessStory`

---

## Definition of Done
- [ ] `Task` type and `tasks: Task[]` present on `GameState`
- [ ] `createTask` factory is a pure function in `src/factories/taskFactory.ts`
- [ ] All task helpers in `tasks.ts` are immutable
- [ ] All NPC behavior guards are pure and tested directly
- [ ] `CREATE_TASK`, `COMPLETE_TASK`, `CONSUME_ITEM` events wired in machine
- [ ] Matthew → Paul spec pipeline playable end-to-end
- [ ] Rizzo → Server Rack → Rizzo fire loop playable end-to-end
- [ ] Chaz Butt-Kissing awards XP on success-story consumption
- [ ] `getDialogueText` updated with `tasks` parameter and all new scripts
- [ ] All unit tests pass (`npm test`)
