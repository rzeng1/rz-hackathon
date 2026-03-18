import { describe, it, expect } from 'vitest'
import {
  isInRange,
  getNearbyNpc,
  canCollectFromNpc,
  markNpcInteracted,
  canInteractWithErnesto,
} from '../npc'
import type { NPC, NPCState, Player } from '../state'
import { INITIAL_STATE } from '../state'

const basePlayer: Player = INITIAL_STATE.player

// ---------------------------------------------------------------------------
// isInRange
// ---------------------------------------------------------------------------

describe('isInRange', () => {
  it('returns true when player is inside the radius', () => {
    expect(isInRange({ x: 0, y: 0 }, { x: 30, y: 0 }, 60)).toBe(true)
  })

  it('returns false when player is outside the radius', () => {
    expect(isInRange({ x: 0, y: 0 }, { x: 100, y: 0 }, 60)).toBe(false)
  })

  it('returns true when player is exactly on the boundary', () => {
    expect(isInRange({ x: 0, y: 0 }, { x: 60, y: 0 }, 60)).toBe(true)
  })

  it('handles diagonal distance correctly', () => {
    // distance = sqrt(3² + 4²) = 5
    expect(isInRange({ x: 0, y: 0 }, { x: 3, y: 4 }, 5)).toBe(true)
    expect(isInRange({ x: 0, y: 0 }, { x: 3, y: 4 }, 4)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// getNearbyNpc
// ---------------------------------------------------------------------------

describe('getNearbyNpc', () => {
  const npcs: NPC[] = [
    { id: 'ernesto', displayName: 'Ernesto', position: { x: 100, y: 100 }, interactionRadius: 60, role: 'gatekeeper' },
    { id: 'priya',   displayName: 'Priya',   position: { x: 400, y: 300 }, interactionRadius: 60, role: 'colleague' },
  ]

  it('returns the NPC when player is within its interactionRadius', () => {
    const result = getNearbyNpc({ x: 110, y: 100 }, npcs)
    expect(result?.id).toBe('ernesto')
  })

  it('returns null when no NPC is in range', () => {
    expect(getNearbyNpc({ x: 700, y: 700 }, npcs)).toBeNull()
  })

  it('returns the first in-range NPC when multiple overlap', () => {
    const overlapping: NPC[] = [
      { id: 'a', displayName: 'A', position: { x: 0, y: 0 }, interactionRadius: 100, role: 'colleague' },
      { id: 'b', displayName: 'B', position: { x: 0, y: 0 }, interactionRadius: 100, role: 'colleague' },
    ]
    expect(getNearbyNpc({ x: 0, y: 0 }, overlapping)?.id).toBe('a')
  })
})

// ---------------------------------------------------------------------------
// canCollectFromNpc
// ---------------------------------------------------------------------------

describe('canCollectFromNpc', () => {
  it('returns true when npcStates is empty (no entry = not yet interacted)', () => {
    expect(canCollectFromNpc('ernesto', [])).toBe(true)
  })

  it('returns true when NPC entry has hasInteractedThisSession: false', () => {
    const states: NPCState[] = [
      { npcId: 'ernesto', hasInteractedThisSession: false, lastInteractionTick: 0 },
    ]
    expect(canCollectFromNpc('ernesto', states)).toBe(true)
  })

  it('returns false when NPC entry has hasInteractedThisSession: true', () => {
    const states: NPCState[] = [
      { npcId: 'ernesto', hasInteractedThisSession: true, lastInteractionTick: 42 },
    ]
    expect(canCollectFromNpc('ernesto', states)).toBe(false)
  })

  it('ignores entries for other NPCs', () => {
    const states: NPCState[] = [
      { npcId: 'priya', hasInteractedThisSession: true, lastInteractionTick: 10 },
    ]
    expect(canCollectFromNpc('ernesto', states)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// markNpcInteracted
// ---------------------------------------------------------------------------

describe('markNpcInteracted', () => {
  it('does not mutate the original array', () => {
    const original: NPCState[] = [
      { npcId: 'ernesto', hasInteractedThisSession: false, lastInteractionTick: 0 },
    ]
    const copy = [...original]
    markNpcInteracted('ernesto', 100, original)
    expect(original).toEqual(copy)
  })

  it('sets hasInteractedThisSession: true for an existing entry', () => {
    const states: NPCState[] = [
      { npcId: 'ernesto', hasInteractedThisSession: false, lastInteractionTick: 0 },
    ]
    const result = markNpcInteracted('ernesto', 99, states)
    expect(result.find(s => s.npcId === 'ernesto')?.hasInteractedThisSession).toBe(true)
  })

  it('updates lastInteractionTick for an existing entry', () => {
    const states: NPCState[] = [
      { npcId: 'ernesto', hasInteractedThisSession: false, lastInteractionTick: 0 },
    ]
    const result = markNpcInteracted('ernesto', 99, states)
    expect(result.find(s => s.npcId === 'ernesto')?.lastInteractionTick).toBe(99)
  })

  it('appends a new entry when no entry exists for the given npcId', () => {
    const result = markNpcInteracted('priya', 50, [])
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      npcId: 'priya',
      hasInteractedThisSession: true,
      lastInteractionTick: 50,
    })
  })

  it('leaves other NPC entries unchanged', () => {
    const states: NPCState[] = [
      { npcId: 'jake', hasInteractedThisSession: false, lastInteractionTick: 0 },
    ]
    const result = markNpcInteracted('ernesto', 10, states)
    expect(result.find(s => s.npcId === 'jake')?.hasInteractedThisSession).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// canInteractWithErnesto
// ---------------------------------------------------------------------------

describe('canInteractWithErnesto', () => {
  it('returns false when player.xp is 19 (under threshold)', () => {
    expect(canInteractWithErnesto({ ...basePlayer, xp: 19 })).toBe(false)
  })

  it('returns true when player.xp is exactly 20 (at threshold)', () => {
    expect(canInteractWithErnesto({ ...basePlayer, xp: 20 })).toBe(true)
  })

  it('returns true when player.xp is well above threshold', () => {
    expect(canInteractWithErnesto({ ...basePlayer, xp: 140 })).toBe(true)
  })

  it('returns false when player.xp is 0 (fresh start)', () => {
    expect(canInteractWithErnesto(basePlayer)).toBe(false)
  })
})
