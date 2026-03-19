import { describe, it, expect } from 'vitest'
import { calcLevel, calculateLevel, applyXpGain, XP_TABLE } from '../xp'
import { INITIAL_STATE } from '../state'

describe('XP_TABLE', () => {
  it('has 10 entries (levels 1–10)', () => {
    expect(XP_TABLE).toHaveLength(10)
  })

  it('starts at 0 (Level 1 threshold)', () => {
    expect(XP_TABLE[0]).toBe(0)
  })

  it('Level 5 threshold is still 140 (unchanged from Phase 1)', () => {
    expect(XP_TABLE[4]).toBe(140)
  })

  it('Level 10 threshold is 400', () => {
    expect(XP_TABLE[9]).toBe(400)
  })

  it('thresholds are strictly increasing', () => {
    for (let i = 1; i < XP_TABLE.length; i++) {
      expect(XP_TABLE[i]).toBeGreaterThan(XP_TABLE[i - 1])
    }
  })
})

describe('calcLevel / calculateLevel', () => {
  it('calcLevel(0) returns 1', () => {
    expect(calcLevel(0)).toBe(1)
  })

  it('calcLevel(19) returns 1 (just below level 2 threshold)', () => {
    expect(calcLevel(19)).toBe(1)
  })

  it('calcLevel(20) returns 2 (exactly at level 2 threshold)', () => {
    expect(calcLevel(20)).toBe(2)
  })

  it('calcLevel(49) returns 2', () => {
    expect(calcLevel(49)).toBe(2)
  })

  it('calcLevel(50) returns 3', () => {
    expect(calcLevel(50)).toBe(3)
  })

  it('calcLevel(90) returns 4', () => {
    expect(calcLevel(90)).toBe(4)
  })

  it('calcLevel(140) returns 5', () => {
    expect(calcLevel(140)).toBe(5)
  })

  it('calcLevel(399) returns 9 (just below level 10 threshold)', () => {
    expect(calcLevel(399)).toBe(9)
  })

  it('calcLevel(400) returns 10 (exactly at level 10 threshold)', () => {
    expect(calcLevel(400)).toBe(10)
  })

  it('calcLevel(999) returns 10 (capped at max level)', () => {
    expect(calcLevel(999)).toBe(10)
  })

  it('calcLevel and calculateLevel are the same function', () => {
    expect(calcLevel(50)).toBe(calculateLevel(50))
  })
})

describe('applyXpGain', () => {
  it('returns a new object (does not mutate input)', () => {
    const player = INITIAL_STATE.player
    const result = applyXpGain(player, 10)
    expect(result).not.toBe(player)
    expect(player.xp).toBe(0)
  })

  it('increments xp by the given amount', () => {
    const result = applyXpGain(INITIAL_STATE.player, 10)
    expect(result.xp).toBe(10)
  })

  it('keeps level at 1 when xp stays below threshold', () => {
    const result = applyXpGain(INITIAL_STATE.player, 19)
    expect(result.level).toBe(1)
  })

  it('correctly updates level when xp crosses a threshold', () => {
    const result = applyXpGain(INITIAL_STATE.player, 20)
    expect(result.level).toBe(2)
  })

  it('correctly reaches level 5 with enough xp', () => {
    const result = applyXpGain(INITIAL_STATE.player, 140)
    expect(result.level).toBe(5)
  })

  it('correctly reaches level 10 with 400 xp', () => {
    const result = applyXpGain(INITIAL_STATE.player, 400)
    expect(result.level).toBe(10)
  })

  it('accumulates correctly over multiple gains', () => {
    const step1 = applyXpGain(INITIAL_STATE.player, 50)
    const step2 = applyXpGain(step1, 90)
    expect(step2.xp).toBe(140)
    expect(step2.level).toBe(5)
  })
})
