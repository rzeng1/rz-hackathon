import { setup, assign } from 'xstate'
import type { GameState, Vec2 } from '../logic/state'
import { INITIAL_STATE } from '../logic/state'
import type { TaskType } from '../logic/tasks'
import { calculateLevel } from '../logic/xp'
import { addItem, removeItem } from '../logic/inventory'
import { markNpcInteracted } from '../logic/npc'
import { isEligibleForPromotion } from '../logic/promotion'
import { applyCollisions } from '../logic/collision'
import { clampToWorld } from '../logic/movement'
import { getStaticObstacles, WORLD_WIDTH, WORLD_HEIGHT } from '../logic/world'
import { advanceTime, TICKS_PER_GAME_MINUTE } from '../logic/time'
import { getNpcTarget } from '../logic/npcSchedule'
import { createTask } from '../factories/taskFactory'
import { completeTask, hasPendingTaskOfType } from '../logic/tasks'
import {
  calculatePlayerAttack,
  selectChazMove,
  calculateHeal,
  calculateDodgeDamage,
  clampHP,
  PLAYER_MAX_HP,
  CHAZ_MAX_HP,
} from '../logic/battle'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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
  | { type: 'COLLECT_ITEM'; itemId: string; displayName: string; fromNpcId?: string }
  | { type: 'CONSUME_ITEM'; itemId: string }
  | { type: 'CREATE_TASK'; taskType: TaskType; assignedBy: string }
  | { type: 'COMPLETE_TASK'; taskType: TaskType }
  | { type: 'ENTER_BATTLE' }
  | { type: 'ATTACK' }
  | { type: 'HEAL' }
  | { type: 'DODGE' }
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
    canBecomeCEO: ({ context }) =>
      isEligibleForPromotion(context.player, context.inventory, context.tasks),

    /** Battle entry: player must be Level 10 to challenge Chaz. */
    playerCanBattle: ({ context }) => calculateLevel(context.player.xp) >= 10,

    /** Checked via `always` in the battle state. */
    chazDefeated: ({ context }) => context.chazHP <= 0,
    playerDefeated: ({ context }) => context.playerHP <= 0,
  },

  actions: {
    setStatusIdle:     assign({ status: 'idle'     as const }),
    setStatusPlaying:  assign({ status: 'playing'  as const }),
    setStatusDialogue: assign({ status: 'dialogue' as const }),
    setStatusBattle:   assign({ status: 'battle'   as const }),
    setStatusWon:      assign({ status: 'won'      as const }),
    setStatusLost:     assign({ status: 'lost'     as const }),

    /** Full tick update: movement + time + NPC positions. */
    assignTickUpdate: assign(({ context, event }) => {
      if (event.type !== 'TICK') return {}
      const raw = applyCollisions(
        context.player.position,
        { width: PLAYER_SIZE, height: PLAYER_SIZE },
        getStaticObstacles(),
        event.velocity,
        event.delta,
      )
      const position = clampToWorld(raw, WORLD_WIDTH, WORLD_HEIGHT, PLAYER_HALF)
      const newGameTime = advanceTime(context.gameTime, event.delta / TICKS_PER_GAME_MINUTE)
      const updatedNpcs = context.npcs.map(npc =>
        npc.role === 'location' ? npc : { ...npc, position: getNpcTarget(npc.id, newGameTime) },
      )
      return {
        player: { ...context.player, position },
        tickCount: context.tickCount + 1,
        gameTime: newGameTime,
        npcs: updatedNpcs,
      }
    }),

    assignXP: assign(({ context, event }) => {
      if (event.type !== 'INTERACT') return {}
      const newXp = context.player.xp + event.xpAmount
      return { player: { ...context.player, xp: newXp, level: calculateLevel(newXp) } }
    }),

    assignInventory: assign(({ context, event }) => {
      if (event.type !== 'COLLECT_ITEM') return {}
      const newInventory = addItem(context.inventory, event.itemId, event.displayName)
      const newNpcStates = event.fromNpcId
        ? markNpcInteracted(event.fromNpcId, context.tickCount, context.npcStates)
        : context.npcStates
      return { inventory: newInventory, npcStates: newNpcStates }
    }),

    assignConsumeItem: assign(({ context, event }) => {
      if (event.type !== 'CONSUME_ITEM') return {}
      return { inventory: removeItem(context.inventory, event.itemId) }
    }),

    assignNewTask: assign(({ context, event }) => {
      if (event.type !== 'CREATE_TASK') return {}
      const task = createTask(event.taskType, event.assignedBy, context.tickCount)
      return { tasks: [...context.tasks, task] }
    }),

    assignCompleteTask: assign(({ context, event }) => {
      if (event.type !== 'COMPLETE_TASK') return {}
      const target = context.tasks.find(t => t.type === event.taskType && t.status === 'pending')
      if (!target) return {}
      return { tasks: completeTask(target.id, context.tasks) }
    }),

    assignActiveDialogue: assign(({ event }) => {
      if (event.type !== 'INTERACT') return {}
      return { activeDialogueNpcId: event.npcId }
    }),

    clearActiveDialogue: assign({ activeDialogueNpcId: null }),

    /** Resets HP for a fresh battle each time the player enters. */
    resetBattle: assign({
      playerHP: PLAYER_MAX_HP,
      chazHP: CHAZ_MAX_HP,
      lastBattleMessage: 'Chaz glares at you. "You. Me. Conference room. Now."',
    }),

    /**
     * ATTACK: player deals 15–45 damage, Chaz counter-attacks.
     * Rolls are generated here (action layer); pure functions receive them.
     */
    assignAttack: assign(({ context }) => {
      const atkRoll  = Math.floor(Math.random() * 100)
      const chazRoll = Math.floor(Math.random() * 100)
      const playerDmg = calculatePlayerAttack(atkRoll)
      const chazMove  = selectChazMove(chazRoll)
      const newChazHP   = clampHP(context.chazHP - playerDmg, CHAZ_MAX_HP)
      const newPlayerHP = clampHP(context.playerHP - chazMove.damage, PLAYER_MAX_HP)
      return {
        chazHP: newChazHP,
        playerHP: newPlayerHP,
        lastBattleMessage:
          `You hit for ${playerDmg} dmg. Chaz retaliates: "${chazMove.name}" (-${chazMove.damage} HP)`,
      }
    }),

    /**
     * HEAL: player restores 20–40 HP, Chaz still attacks.
     */
    assignHeal: assign(({ context }) => {
      const healRoll = Math.floor(Math.random() * 100)
      const chazRoll = Math.floor(Math.random() * 100)
      const healAmt  = calculateHeal(healRoll)
      const chazMove = selectChazMove(chazRoll)
      const newPlayerHP = clampHP(context.playerHP + healAmt - chazMove.damage, PLAYER_MAX_HP)
      return {
        playerHP: newPlayerHP,
        lastBattleMessage:
          `You heal ${healAmt} HP. Chaz: "${chazMove.name}" (-${chazMove.damage} HP)`,
      }
    }),

    /**
     * DODGE: absorbs almost all of Chaz's attack (0–5 bleed damage).
     * No damage dealt to Chaz.
     */
    assignDodge: assign(({ context }) => {
      const chazRoll = Math.floor(Math.random() * 100)
      const chazMove  = selectChazMove(chazRoll)
      const bleed     = calculateDodgeDamage(chazRoll)
      const newPlayerHP = clampHP(context.playerHP - bleed, PLAYER_MAX_HP)
      return {
        playerHP: newPlayerHP,
        lastBattleMessage:
          `You dodge! "${chazMove.name}" barely grazes you (-${bleed} HP)`,
      }
    }),
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
        TICK:          { actions: 'assignTickUpdate' },
        INTERACT:      { target: 'dialogue', actions: ['assignXP', 'assignActiveDialogue'] },
        COLLECT_ITEM:  { actions: 'assignInventory' },
        CONSUME_ITEM:  { actions: 'assignConsumeItem' },
        CREATE_TASK:   { actions: 'assignNewTask' },
        COMPLETE_TASK: { actions: 'assignCompleteTask' },
        ENTER_BATTLE:  { target: 'battle', guard: 'playerCanBattle', actions: 'resetBattle' },
        WIN:           { target: 'won', guard: 'canBecomeCEO' },
      },
    },

    dialogue: {
      entry: 'setStatusDialogue',
      on: {
        DIALOGUE_END: { target: 'playing', actions: 'clearActiveDialogue' },
      },
    },

    /**
     * Turn-based battle state.
     * `always` re-evaluates after every event — transitions immediately
     * when chazHP or playerHP crosses zero, without needing extra events.
     */
    battle: {
      entry: ['setStatusBattle', 'resetBattle'],
      always: [
        { guard: 'chazDefeated',  target: 'won',  actions: 'setStatusWon'  },
        { guard: 'playerDefeated', target: 'lost', actions: 'setStatusLost' },
      ],
      on: {
        ATTACK: { actions: 'assignAttack' },
        HEAL:   { actions: 'assignHeal'   },
        DODGE:  { actions: 'assignDodge'  },
      },
    },

    won: {
      type: 'final',
      entry: 'setStatusWon',
    },

    lost: {
      type: 'final',
      entry: 'setStatusLost',
    },
  },
})
