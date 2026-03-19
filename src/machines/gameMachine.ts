import { setup, assign } from 'xstate'
import { getItemQuantity } from '../logic/inventory'
import type { GameState, Vec2 } from '../logic/state'
import { INITIAL_STATE } from '../logic/state'
import type { TaskType } from '../logic/tasks'
import { calculateLevel, flowStateXpMultiplier } from '../logic/xp'
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
import {
  pickHotZone,
  isInHotZone,
  HOT_ZONE_INTERVAL,
  HOT_ZONE_DURATION,
  VC_VISIT_INTERVAL,
  VC_VISIT_DURATION,
  VC_PENALTY_RADIUS,
} from '../logic/events'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLAYER_SIZE = 24
const PLAYER_HALF = PLAYER_SIZE / 2

/** Energy drained per tick-delta unit — 1 point per 300 ticks ≈ 5 s at 60 fps. */
const ENERGY_DRAIN_RATE = 1 / 300

/** Caffeine boost duration in ticks (≈ 10 s at 60 fps). */
const CAFFEINE_DURATION = 600

/** Energy increase from one Energy Drink. Capped at 100. */
const COFFEE_ENERGY_BOOST = 40

/** Combo streak length required to enter Flow State. */
const FLOW_STATE_THRESHOLD = 3

/** Ticks of inactivity before the combo streak resets (≈ 30 s at 60 fps). */
const COMBO_DECAY_TICKS = 1800

/** Extra energy drain multiplier applied per tick while sprinting (stacks on top of base). */
const SPRINT_EXTRA_DRAIN_MULTIPLIER = 4

/** Energy drain multiplier when Caffeine Aura perk is active (reduces drain). */
const CAFFEINE_AURA_DRAIN_MULTIPLIER = 0.5

/** Extra energy drain while standing in a Hot Zone (per tick). */
const HOT_ZONE_EXTRA_DRAIN = ENERGY_DRAIN_RATE * 3

/** Extra energy drain per tick while inside a VC Visit aura. */
const VC_ENERGY_DRAIN = ENERGY_DRAIN_RATE * 2

/** Level at which the Caffeine Aura perk unlocks. */
const CAFFEINE_AURA_LEVEL = 4

/** Level at which the Sprint perk unlocks. */
const SPRINT_LEVEL = 7

/** Maps level → internal perk id. */
const PERK_BY_LEVEL: Readonly<Record<number, string>> = {
  [CAFFEINE_AURA_LEVEL]: 'caffeine-aura',
  [SPRINT_LEVEL]:        'sprint',
}

/** Maps level → human-readable perk name for the HUD notification. */
const PERK_DISPLAY_NAME: Readonly<Record<number, string>> = {
  [CAFFEINE_AURA_LEVEL]: 'CAFFEINE AURA',
  [SPRINT_LEVEL]:        'SPRINT (SHIFT)',
}

// ---------------------------------------------------------------------------
// Event types
// ---------------------------------------------------------------------------

export type GameEvent =
  | { type: 'START_GAME' }
  | { type: 'TICK'; delta: number; velocity: Vec2; isSprinting?: boolean }
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
  | { type: 'DRINK_COFFEE' }
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

    /** DRINK_COFFEE guard — requires at least one energy-drink in inventory. */
    hasCoffeeInInventory: ({ context }) =>
      getItemQuantity(context.inventory, 'energy-drink') > 0,
  },

  actions: {
    setStatusIdle:     assign({ status: 'idle'     as const }),
    setStatusPlaying:  assign({ status: 'playing'  as const }),
    setStatusDialogue: assign({ status: 'dialogue' as const }),
    setStatusBattle:   assign({ status: 'battle'   as const }),
    setStatusWon:      assign({ status: 'won'      as const }),
    setStatusLost:     assign({ status: 'lost'     as const }),

    /** Full tick update: movement + time + NPC positions + energy drain + office events. */
    assignTickUpdate: assign(({ context, event }) => {
      if (event.type !== 'TICK') return {}
      const raw = applyCollisions(
        context.player.position,
        { width: PLAYER_SIZE, height: PLAYER_SIZE },
        getStaticObstacles(),
        event.velocity,
        event.delta,
      )
      const position    = clampToWorld(raw, WORLD_WIDTH, WORLD_HEIGHT, PLAYER_HALF)
      const newGameTime = advanceTime(context.gameTime, event.delta / TICKS_PER_GAME_MINUTE)
      const updatedNpcs = context.npcs.map(npc =>
        npc.role === 'location' ? npc : { ...npc, position: getNpcTarget(npc.id, newGameTime) },
      )
      const newTick = context.tickCount + 1

      // ---- Caffeine timer --------------------------------------------------
      const newCaffeineTimer = Math.max(0, context.player.caffeineTimer - event.delta)
      const newIsCaffeinated = newCaffeineTimer > 0

      // ---- Energy drain modifiers ------------------------------------------
      const hasCaffeineAura = context.unlockedPerks.includes('caffeine-aura')
      const isSprinting     = (event.isSprinting ?? false) && context.unlockedPerks.includes('sprint')
      let drainRate = ENERGY_DRAIN_RATE
      if (hasCaffeineAura) drainRate *= CAFFEINE_AURA_DRAIN_MULTIPLIER
      if (isSprinting)     drainRate += ENERGY_DRAIN_RATE * SPRINT_EXTRA_DRAIN_MULTIPLIER

      // Hot zone extra drain
      if (context.activeHotZone && isInHotZone(position.x, position.y, context.activeHotZone)) {
        drainRate += HOT_ZONE_EXTRA_DRAIN
      }

      // VC visit proximity drain
      if (context.vcVisitActive) {
        const chaz = updatedNpcs.find(n => n.id === 'chaz')
        if (chaz) {
          const dx = position.x - chaz.position.x
          const dy = position.y - chaz.position.y
          if (dx * dx + dy * dy <= VC_PENALTY_RADIUS * VC_PENALTY_RADIUS) {
            drainRate += VC_ENERGY_DRAIN
          }
        }
      }

      const newEnergy = Math.max(0, context.player.energy - drainRate * event.delta)

      // ---- Combo decay -----------------------------------------------------
      let newComboCount      = context.player.comboCount
      let newIsFlowState     = context.player.isFlowState
      let newComboDecayTimer = context.player.comboDecayTimer
      if (newComboDecayTimer > 0) {
        newComboDecayTimer = Math.max(0, newComboDecayTimer - event.delta)
        if (newComboDecayTimer === 0 && newComboCount > 0) {
          newComboCount  = 0
          newIsFlowState = false
        }
      }

      // ---- Hot zone lifecycle ----------------------------------------------
      let newActiveHotZone       = context.activeHotZone
      let newHotZoneExpiresAtTick = context.hotZoneExpiresAtTick
      // Expire current hot zone
      if (newActiveHotZone && newTick >= newHotZoneExpiresAtTick) {
        newActiveHotZone = null
      }
      // Spawn new hot zone on interval
      if (!newActiveHotZone && newTick > 0 && newTick % HOT_ZONE_INTERVAL === 0) {
        newActiveHotZone       = pickHotZone(Math.random())
        newHotZoneExpiresAtTick = newTick + HOT_ZONE_DURATION
      }

      // ---- VC Visit lifecycle ----------------------------------------------
      let newVcVisitActive       = context.vcVisitActive
      let newVcVisitExpiresAtTick = context.vcVisitExpiresAtTick
      if (newVcVisitActive && newTick >= newVcVisitExpiresAtTick) {
        newVcVisitActive = false
      }
      if (!newVcVisitActive && newTick > 0 && newTick % VC_VISIT_INTERVAL === 0) {
        newVcVisitActive       = true
        newVcVisitExpiresAtTick = newTick + VC_VISIT_DURATION
      }

      return {
        player: {
          ...context.player,
          position,
          energy:          newEnergy,
          caffeineTimer:   newCaffeineTimer,
          isCaffeinated:   newIsCaffeinated,
          comboCount:      newComboCount,
          isFlowState:     newIsFlowState,
          comboDecayTimer: newComboDecayTimer,
        },
        tickCount:             newTick,
        gameTime:              newGameTime,
        npcs:                  updatedNpcs,
        activeHotZone:         newActiveHotZone,
        hotZoneExpiresAtTick:  newHotZoneExpiresAtTick,
        vcVisitActive:         newVcVisitActive,
        vcVisitExpiresAtTick:  newVcVisitExpiresAtTick,
      }
    }),

    assignXP: assign(({ context, event }) => {
      if (event.type !== 'INTERACT') return {}
      const multiplier     = flowStateXpMultiplier(context.player.isFlowState)
      const effectiveAmount = Math.floor(event.xpAmount * multiplier)
      const newXp          = context.player.xp + effectiveAmount
      const newLevel       = calculateLevel(newXp)

      // Check for perk unlock on level-up
      const perkId    = PERK_BY_LEVEL[newLevel]
      const didUnlock = perkId !== undefined && !context.unlockedPerks.includes(perkId)
      const newUnlockedPerks   = didUnlock ? [...context.unlockedPerks, perkId] : context.unlockedPerks
      const newLatestPerkUnlock = didUnlock ? (PERK_DISPLAY_NAME[newLevel] ?? null) : context.latestPerkUnlock
      const newPerkUnlockedAtTick = didUnlock ? context.tickCount : context.perkUnlockedAtTick

      // Record for floating text spawn
      const npc = context.npcs.find(n => n.id === event.npcId)

      return {
        player: { ...context.player, xp: newXp, level: newLevel },
        unlockedPerks:      newUnlockedPerks,
        latestPerkUnlock:   newLatestPerkUnlock,
        perkUnlockedAtTick: newPerkUnlockedAtTick,
        lastXpGained:       effectiveAmount,
        lastXpGainTick:     context.tickCount,
        lastXpGainPos:      npc ? { ...npc.position } : null,
      }
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
      const newCombo     = context.player.comboCount + 1
      const newFlowState = newCombo >= FLOW_STATE_THRESHOLD
      return {
        tasks: completeTask(target.id, context.tasks),
        player: {
          ...context.player,
          comboCount:      newCombo,
          isFlowState:     newFlowState,
          comboDecayTimer: COMBO_DECAY_TICKS,
        },
      }
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
     * DRINK_COFFEE: consume one energy-drink from inventory.
     * Restores COFFEE_ENERGY_BOOST energy (capped at 100) and starts the
     * caffeine timer. Refreshes if already caffeinated (doesn't stack duration).
     * Guard hasCoffeeInInventory must be satisfied before this runs.
     */
    assignDrinkCoffee: assign(({ context }) => ({
      player: {
        ...context.player,
        energy:          Math.min(100, context.player.energy + COFFEE_ENERGY_BOOST),
        isCaffeinated:   true,
        caffeineTimer:   CAFFEINE_DURATION,
        comboCount:      0,
        isFlowState:     false,
        comboDecayTimer: 0,
      },
      inventory: removeItem(context.inventory, 'energy-drink'),
    })),

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
        DRINK_COFFEE:  { guard: 'hasCoffeeInInventory', actions: 'assignDrinkCoffee' },
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
