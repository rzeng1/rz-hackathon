import { describe, it, expect } from 'vitest'
import { INITIAL_STATE } from '../state'
import { calculateMovement } from '../physics'

describe('INITIAL_STATE shape', () => {
  it('has status: idle', () => {
    expect(INITIAL_STATE.status).toBe('idle')
  })

  it('player starts with 0 XP', () => {
    expect(INITIAL_STATE.player.xp).toBe(0)
  })

  it('player starts at level 1', () => {
    expect(INITIAL_STATE.player.level).toBe(1)
  })

  it('inventory starts empty', () => {
    expect(INITIAL_STATE.inventory).toEqual([])
  })

  it('npcStates starts empty', () => {
    expect(INITIAL_STATE.npcStates).toEqual([])
  })

  it('activeDialogueNpcId starts null', () => {
    expect(INITIAL_STATE.activeDialogueNpcId).toBeNull()
  })

  it('contains exactly one gatekeeper NPC (ernesto)', () => {
    const gatekeepers = INITIAL_STATE.npcs.filter(n => n.role === 'gatekeeper')
    expect(gatekeepers).toHaveLength(1)
    expect(gatekeepers[0].id).toBe('ernesto')
  })

  it('contains 4 colleague NPCs', () => {
    const colleagues = INITIAL_STATE.npcs.filter(n => n.role === 'colleague')
    expect(colleagues).toHaveLength(4)
  })
})

describe('calculateMovement', () => {
  it('moves position by velocity * delta on x axis', () => {
    expect(calculateMovement({ x: 0, y: 0 }, { x: 1, y: 0 }, 16)).toEqual({ x: 16, y: 0 })
  })

  it('moves position by velocity * delta on y axis', () => {
    expect(calculateMovement({ x: 0, y: 0 }, { x: 0, y: 2 }, 8)).toEqual({ x: 0, y: 16 })
  })

  it('returns original position unchanged when delta is 0', () => {
    expect(calculateMovement({ x: 100, y: 200 }, { x: 5, y: 5 }, 0)).toEqual({ x: 100, y: 200 })
  })

  it('returns original position unchanged when velocity is zero', () => {
    expect(calculateMovement({ x: 50, y: 75 }, { x: 0, y: 0 }, 1)).toEqual({ x: 50, y: 75 })
  })

  it('does not mutate the input position object', () => {
    const pos = { x: 10, y: 20 }
    calculateMovement(pos, { x: 3, y: 3 }, 1)
    expect(pos).toEqual({ x: 10, y: 20 })
  })
})
