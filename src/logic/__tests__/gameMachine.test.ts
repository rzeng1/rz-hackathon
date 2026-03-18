import { describe, it, expect } from 'vitest'
import { createActor } from 'xstate'
import { gameMachine } from '../../machines/gameMachine'
import { isEligibleForPromotion } from '../promotion'
import { INITIAL_STATE } from '../state'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const startedActor = () => {
  const actor = createActor(gameMachine)
  actor.start()
  return actor
}

const playingActor = () => {
  const actor = startedActor()
  actor.send({ type: 'START_GAME' })
  return actor
}

// ---------------------------------------------------------------------------
// Machine state transitions
// ---------------------------------------------------------------------------

describe('gameMachine — initial state', () => {
  it('starts in the idle state', () => {
    const actor = startedActor()
    expect(actor.getSnapshot().value).toBe('idle')
  })

  it('context.status mirrors idle state', () => {
    const actor = startedActor()
    expect(actor.getSnapshot().context.status).toBe('idle')
  })
})

describe('gameMachine — START_GAME transition', () => {
  it('transitions from idle to playing', () => {
    const actor = playingActor()
    expect(actor.getSnapshot().value).toBe('playing')
  })

  it('context.status becomes playing', () => {
    const actor = playingActor()
    expect(actor.getSnapshot().context.status).toBe('playing')
  })
})

describe('gameMachine — INTERACT / DIALOGUE_END', () => {
  it('transitions from playing to dialogue on INTERACT', () => {
    const actor = playingActor()
    actor.send({ type: 'INTERACT', npcId: 'priya', xpAmount: 10 })
    expect(actor.getSnapshot().value).toBe('dialogue')
  })

  it('context.status becomes dialogue', () => {
    const actor = playingActor()
    actor.send({ type: 'INTERACT', npcId: 'priya', xpAmount: 10 })
    expect(actor.getSnapshot().context.status).toBe('dialogue')
  })

  it('sets activeDialogueNpcId on INTERACT', () => {
    const actor = playingActor()
    actor.send({ type: 'INTERACT', npcId: 'priya', xpAmount: 10 })
    expect(actor.getSnapshot().context.activeDialogueNpcId).toBe('priya')
  })

  it('awards XP on INTERACT', () => {
    const actor = playingActor()
    actor.send({ type: 'INTERACT', npcId: 'priya', xpAmount: 10 })
    expect(actor.getSnapshot().context.player.xp).toBe(10)
  })

  it('transitions back to playing on DIALOGUE_END', () => {
    const actor = playingActor()
    actor.send({ type: 'INTERACT', npcId: 'priya', xpAmount: 10 })
    actor.send({ type: 'DIALOGUE_END' })
    expect(actor.getSnapshot().value).toBe('playing')
  })

  it('clears activeDialogueNpcId on DIALOGUE_END', () => {
    const actor = playingActor()
    actor.send({ type: 'INTERACT', npcId: 'priya', xpAmount: 10 })
    actor.send({ type: 'DIALOGUE_END' })
    expect(actor.getSnapshot().context.activeDialogueNpcId).toBeNull()
  })
})

describe('gameMachine — COLLECT_ITEM', () => {
  it('adds a new item to inventory', () => {
    const actor = playingActor()
    actor.send({ type: 'COLLECT_ITEM', itemId: 'energy-drink', displayName: 'Energy Drink' })
    expect(actor.getSnapshot().context.inventory).toHaveLength(1)
    expect(actor.getSnapshot().context.inventory[0].quantity).toBe(1)
  })

  it('increments quantity for duplicate items', () => {
    const actor = playingActor()
    actor.send({ type: 'COLLECT_ITEM', itemId: 'energy-drink', displayName: 'Energy Drink' })
    actor.send({ type: 'COLLECT_ITEM', itemId: 'energy-drink', displayName: 'Energy Drink' })
    expect(actor.getSnapshot().context.inventory[0].quantity).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// canBecomeCEO guard — machine integration
// ---------------------------------------------------------------------------

describe('gameMachine — canBecomeCEO guard (machine integration)', () => {
  it('WIN is blocked when player has no XP and no drinks', () => {
    const actor = playingActor()
    actor.send({ type: 'WIN' })
    expect(actor.getSnapshot().value).toBe('playing')
  })

  it('WIN is blocked when player has 3 drinks but insufficient XP (level < 5)', () => {
    const actor = playingActor()
    actor.send({ type: 'COLLECT_ITEM', itemId: 'energy-drink', displayName: 'Energy Drink' })
    actor.send({ type: 'COLLECT_ITEM', itemId: 'energy-drink', displayName: 'Energy Drink' })
    actor.send({ type: 'COLLECT_ITEM', itemId: 'energy-drink', displayName: 'Energy Drink' })
    actor.send({ type: 'WIN' })
    expect(actor.getSnapshot().value).toBe('playing')
  })

  it('WIN is blocked when player has level 5 XP but fewer than 3 drinks', () => {
    const actor = playingActor()
    // Reach level 5 via a single INTERACT (xpAmount = 140)
    actor.send({ type: 'INTERACT', npcId: 'priya', xpAmount: 140 })
    actor.send({ type: 'DIALOGUE_END' })
    actor.send({ type: 'COLLECT_ITEM', itemId: 'energy-drink', displayName: 'Energy Drink' })
    actor.send({ type: 'COLLECT_ITEM', itemId: 'energy-drink', displayName: 'Energy Drink' })
    actor.send({ type: 'WIN' })
    expect(actor.getSnapshot().value).toBe('playing')
  })

  it('WIN transitions to won when level 5 AND >= 3 drinks', () => {
    const actor = playingActor()
    // Level 5
    actor.send({ type: 'INTERACT', npcId: 'priya', xpAmount: 140 })
    actor.send({ type: 'DIALOGUE_END' })
    // 3 drinks
    actor.send({ type: 'COLLECT_ITEM', itemId: 'energy-drink', displayName: 'Energy Drink' })
    actor.send({ type: 'COLLECT_ITEM', itemId: 'energy-drink', displayName: 'Energy Drink' })
    actor.send({ type: 'COLLECT_ITEM', itemId: 'energy-drink', displayName: 'Energy Drink' })
    actor.send({ type: 'WIN' })
    expect(actor.getSnapshot().value).toBe('won')
  })

  it('context.status becomes won on victory', () => {
    const actor = playingActor()
    actor.send({ type: 'INTERACT', npcId: 'priya', xpAmount: 140 })
    actor.send({ type: 'DIALOGUE_END' })
    actor.send({ type: 'COLLECT_ITEM', itemId: 'energy-drink', displayName: 'Energy Drink' })
    actor.send({ type: 'COLLECT_ITEM', itemId: 'energy-drink', displayName: 'Energy Drink' })
    actor.send({ type: 'COLLECT_ITEM', itemId: 'energy-drink', displayName: 'Energy Drink' })
    actor.send({ type: 'WIN' })
    expect(actor.getSnapshot().context.status).toBe('won')
  })
})

// ---------------------------------------------------------------------------
// isEligibleForPromotion — pure predicate tests (canBecomeCEO's backing fn)
// ---------------------------------------------------------------------------

describe('isEligibleForPromotion (canBecomeCEO predicate)', () => {
  it('returns false when inventory is empty', () => {
    expect(isEligibleForPromotion(INITIAL_STATE.player, [])).toBe(false)
  })

  it('returns false when drinks >= 3 but level < 5', () => {
    const inventory = [{ id: 'energy-drink', displayName: 'Energy Drink', quantity: 3 }]
    expect(isEligibleForPromotion(INITIAL_STATE.player, inventory)).toBe(false)
  })

  it('returns false when level >= 5 but drinks < 3', () => {
    const player = { ...INITIAL_STATE.player, xp: 140, level: 5 }
    const inventory = [{ id: 'energy-drink', displayName: 'Energy Drink', quantity: 2 }]
    expect(isEligibleForPromotion(player, inventory)).toBe(false)
  })

  it('returns true when level >= 5 AND drinks >= 3', () => {
    const player = { ...INITIAL_STATE.player, xp: 140, level: 5 }
    const inventory = [{ id: 'energy-drink', displayName: 'Energy Drink', quantity: 3 }]
    expect(isEligibleForPromotion(player, inventory)).toBe(true)
  })
})
