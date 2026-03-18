import { setup, assign } from 'xstate'
import type { GameState, Vec2 } from '../logic/state'
import { INITIAL_STATE } from '../logic/state'
import { calculateLevel } from '../logic/xp'
import { addItem } from '../logic/inventory'
import { markNpcInteracted } from '../logic/npc'
import { isEligibleForPromotion } from '../logic/promotion'
import { applyCollisions } from '../logic/collision'
import { clampToWorld } from '../logic/movement'
import { getStaticObstacles, WORLD_WIDTH, WORLD_HEIGHT } from '../logic/world'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Player collision box size in pixels (matches the rendered placeholder). */
const PLAYER_SIZE = 24
const PLAYER_HALF = PLAYER_SIZE / 2

// ---------------------------------------------------------------------------
// Event types
// ---------------------------------------------------------------------------

export type GameEvent =
  | { type: 'START_GAME' }
  | { type: 'TICK'; delta: number; velocity: Vec2 }
  | { type: 'INTERACT'; npcId: string; xpAmount: number }
  | { type: 'DIALOGUE_END' }
  | { type: 'COLLECT_ITEM'; itemId: string; displayName: string; fromNpcId: string }
  | { type: 'WIN' }

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const gameMachine = setup({
  types: {
    context: {} as GameState,
    events: {} as GameEvent,
  },

  guards: {
    /**
     * Delegates entirely to the pure isEligibleForPromotion function.
     * Never re-implements the level/drink conditions inline.
     */
    canBecomeCEO: ({ context }) =>
      isEligibleForPromotion(context.player, context.inventory),
  },

  actions: {
    setStatusIdle:     assign({ status: 'idle'     as const }),
    setStatusPlaying:  assign({ status: 'playing'  as const }),
    setStatusDialogue: assign({ status: 'dialogue' as const }),
    setStatusWon:      assign({ status: 'won'      as const }),

    /**
     * Full movement pipeline on each TICK:
     *   1. applyCollisions  — per-axis sequential AABB resolution (Module 03)
     *   2. clampToWorld     — hard-clamp to canvas boundary (Module 03)
     * calculateMovement is called internally by applyCollisions (Module 01).
     * No position math lives in this action.
     */
    assignPlayerPosition: assign(({ context, event }) => {
      if (event.type !== 'TICK') return {}
      const raw = applyCollisions(
        context.player.position,
        { width: PLAYER_SIZE, height: PLAYER_SIZE },
        getStaticObstacles(),
        event.velocity,
        event.delta,
      )
      const position = clampToWorld(raw, WORLD_WIDTH, WORLD_HEIGHT, PLAYER_HALF)
      return {
        player: { ...context.player, position },
        tickCount: context.tickCount + 1,
      }
    }),

    /**
     * Increments XP and re-derives level in one assign.
     * No GAIN_XP event — level is always derived, never event-driven.
     */
    assignXP: assign(({ context, event }) => {
      if (event.type !== 'INTERACT') return {}
      const newXp = context.player.xp + event.xpAmount
      return {
        player: {
          ...context.player,
          xp: newXp,
          level: calculateLevel(newXp),
        },
      }
    }),

    /**
     * Adds or increments the item, then marks the source NPC as interacted
     * so session-based cooldown prevents duplicate collection.
     */
    assignInventory: assign(({ context, event }) => {
      if (event.type !== 'COLLECT_ITEM') return {}
      return {
        inventory: addItem(context.inventory, event.itemId, event.displayName),
        npcStates: markNpcInteracted(event.fromNpcId, context.tickCount, context.npcStates),
      }
    }),

    /** Records which NPC triggered the dialogue. */
    assignActiveDialogue: assign(({ event }) => {
      if (event.type !== 'INTERACT') return {}
      return { activeDialogueNpcId: event.npcId }
    }),

    /** Clears active dialogue NPC on dismiss. */
    clearActiveDialogue: assign({ activeDialogueNpcId: null }),
  },
}).createMachine({
  id: 'game',
  initial: 'idle',
  context: INITIAL_STATE,

  states: {
    idle: {
      entry: 'setStatusIdle',
      on: { START_GAME: { target: 'playing' } },
    },

    playing: {
      entry: 'setStatusPlaying',
      on: {
        TICK:     { actions: 'assignPlayerPosition' },
        INTERACT: { target: 'dialogue', actions: ['assignXP', 'assignActiveDialogue'] },
        COLLECT_ITEM: { actions: 'assignInventory' },
        WIN:      { target: 'won', guard: 'canBecomeCEO' },
      },
    },

    dialogue: {
      entry: 'setStatusDialogue',
      on: {
        DIALOGUE_END: { target: 'playing', actions: 'clearActiveDialogue' },
      },
    },

    won: {
      type: 'final',
      entry: 'setStatusWon',
    },
  },
})
