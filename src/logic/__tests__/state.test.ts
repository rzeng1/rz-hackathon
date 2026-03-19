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

  it('tasks starts empty', () => {
    expect(INITIAL_STATE.tasks).toEqual([])
  })

  it('gameTime starts at 09:00', () => {
    expect(INITIAL_STATE.gameTime).toEqual({ hours: 9, minutes: 0 })
  })

  it('contains exactly two gatekeeper NPCs (ernesto and chaz)', () => {
    const gatekeepers = INITIAL_STATE.npcs.filter(n => n.role === 'gatekeeper')
    expect(gatekeepers).toHaveLength(2)
    const ids = gatekeepers.map(n => n.id)
    expect(ids).toContain('ernesto')
    expect(ids).toContain('chaz')
  })

  it('contains 3 colleague NPCs', () => {
    const colleagues = INITIAL_STATE.npcs.filter(n => n.role === 'colleague')
    expect(colleagues).toHaveLength(3)
  })

  it('contains 1 location NPC (server_rack)', () => {
    const locations = INITIAL_STATE.npcs.filter(n => n.role === 'location')
    expect(locations).toHaveLength(1)
    expect(locations[0].id).toBe('server_rack')
  })

  it('NPC roster includes ernesto, matthew, paul, rizzo, chaz, server_rack', () => {
    const ids = INITIAL_STATE.npcs.map(n => n.id)
    expect(ids).toContain('ernesto')
    expect(ids).toContain('matthew')
    expect(ids).toContain('paul')
    expect(ids).toContain('rizzo')
    expect(ids).toContain('chaz')
    expect(ids).toContain('server_rack')
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
