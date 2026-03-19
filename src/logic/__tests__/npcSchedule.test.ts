import { describe, it, expect } from 'vitest'
import { getNpcTarget, LUNCH_ROOM, NPC_DESK_POSITIONS, ERNESTO_POST } from '../npcSchedule'

describe('getNpcTarget', () => {
  it('returns desk position for matthew at 9:00', () => {
    expect(getNpcTarget('matthew', { hours: 9, minutes: 0 })).toEqual(NPC_DESK_POSITIONS.matthew)
  })

  it('returns LUNCH_ROOM for matthew at 12:00', () => {
    expect(getNpcTarget('matthew', { hours: 12, minutes: 0 })).toEqual(LUNCH_ROOM)
  })

  it('returns LUNCH_ROOM for paul at 12:59', () => {
    expect(getNpcTarget('paul', { hours: 12, minutes: 59 })).toEqual(LUNCH_ROOM)
  })

  it('returns LUNCH_ROOM for rizzo at 12:01', () => {
    expect(getNpcTarget('rizzo', { hours: 12, minutes: 1 })).toEqual(LUNCH_ROOM)
  })

  it('returns desk position for rizzo at 13:00 (returned from lunch)', () => {
    expect(getNpcTarget('rizzo', { hours: 13, minutes: 0 })).toEqual(NPC_DESK_POSITIONS.rizzo)
  })

  it('returns desk position for chaz in the morning', () => {
    expect(getNpcTarget('chaz', { hours: 10, minutes: 0 })).toEqual(NPC_DESK_POSITIONS.chaz)
  })

  it('returns LUNCH_ROOM for all NPCs at 12:xx', () => {
    const lunchTime = { hours: 12, minutes: 30 }
    expect(getNpcTarget('matthew', lunchTime)).toEqual(LUNCH_ROOM)
    expect(getNpcTarget('paul',    lunchTime)).toEqual(LUNCH_ROOM)
    expect(getNpcTarget('rizzo',   lunchTime)).toEqual(LUNCH_ROOM)
    expect(getNpcTarget('chaz',    lunchTime)).toEqual(LUNCH_ROOM)
  })

  it('returns same LUNCH_ROOM reference for all NPCs at 12:xx', () => {
    const lunchTime = { hours: 12, minutes: 0 }
    expect(getNpcTarget('matthew', lunchTime)).toBe(LUNCH_ROOM)
    expect(getNpcTarget('paul',    lunchTime)).toBe(LUNCH_ROOM)
  })

  it('returns ERNESTO_POST for ernesto in the morning', () => {
    expect(getNpcTarget('ernesto', { hours: 9, minutes: 0 })).toEqual(ERNESTO_POST)
  })

  it('returns ERNESTO_POST for ernesto at 12:00 — never migrates to lunch', () => {
    expect(getNpcTarget('ernesto', { hours: 12, minutes: 0 })).toEqual(ERNESTO_POST)
  })

  it('returns ERNESTO_POST for ernesto at 12:30 — stays at post during lunch', () => {
    expect(getNpcTarget('ernesto', { hours: 12, minutes: 30 })).toEqual(ERNESTO_POST)
  })

  it('returns safe fallback for unknown NPC id — no crash', () => {
    expect(() => getNpcTarget('unknown-npc', { hours: 9, minutes: 0 })).not.toThrow()
    expect(getNpcTarget('unknown-npc', { hours: 9, minutes: 0 })).toEqual(LUNCH_ROOM)
  })
})
