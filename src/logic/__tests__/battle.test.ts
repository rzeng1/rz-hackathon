import { describe, it, expect } from 'vitest'
import {
  calculatePlayerAttack,
  selectChazMove,
  calculateHeal,
  calculateDodgeDamage,
  clampHP,
  CHAZ_MOVES,
  PLAYER_MAX_HP,
  CHAZ_MAX_HP,
} from '../battle'

describe('calculatePlayerAttack', () => {
  it('returns 15 (weak hit) for roll 0–24', () => {
    expect(calculatePlayerAttack(0)).toBe(15)
    expect(calculatePlayerAttack(24)).toBe(15)
  })

  it('returns 30 (normal hit) for roll 25–74', () => {
    expect(calculatePlayerAttack(25)).toBe(30)
    expect(calculatePlayerAttack(74)).toBe(30)
  })

  it('returns 45 (critical hit) for roll 75–99', () => {
    expect(calculatePlayerAttack(75)).toBe(45)
    expect(calculatePlayerAttack(99)).toBe(45)
  })

  it('always returns positive damage', () => {
    for (let i = 0; i < 100; i++) {
      expect(calculatePlayerAttack(i)).toBeGreaterThan(0)
    }
  })
})

describe('selectChazMove', () => {
  it('returns a valid ChazMove for any roll 0–99', () => {
    for (let i = 0; i < 100; i++) {
      const move = selectChazMove(i)
      expect(move).toHaveProperty('name')
      expect(move).toHaveProperty('damage')
      expect(move.damage).toBeGreaterThan(0)
    }
  })

  it('is deterministic — same roll returns same move', () => {
    expect(selectChazMove(42)).toEqual(selectChazMove(42))
  })

  it('cycles through all available moves', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 100; i++) seen.add(selectChazMove(i).name)
    expect(seen.size).toBe(CHAZ_MOVES.length)
  })
})

describe('calculateHeal', () => {
  it('returns a value between 20 and 40 (inclusive)', () => {
    for (let i = 0; i < 100; i++) {
      const h = calculateHeal(i)
      expect(h).toBeGreaterThanOrEqual(20)
      expect(h).toBeLessThanOrEqual(40)
    }
  })

  it('is deterministic', () => {
    expect(calculateHeal(7)).toBe(calculateHeal(7))
  })
})

describe('calculateDodgeDamage', () => {
  it('returns a value between 0 and 5 (inclusive)', () => {
    for (let i = 0; i < 100; i++) {
      const d = calculateDodgeDamage(i)
      expect(d).toBeGreaterThanOrEqual(0)
      expect(d).toBeLessThanOrEqual(5)
    }
  })
})

describe('clampHP', () => {
  it('clamps below zero to 0', () => {
    expect(clampHP(-10, PLAYER_MAX_HP)).toBe(0)
  })

  it('clamps above maxHp to maxHp', () => {
    expect(clampHP(200, PLAYER_MAX_HP)).toBe(PLAYER_MAX_HP)
  })

  it('returns value unchanged when within range', () => {
    expect(clampHP(50, PLAYER_MAX_HP)).toBe(50)
  })
})

describe('constants', () => {
  it('PLAYER_MAX_HP is 100', () => {
    expect(PLAYER_MAX_HP).toBe(100)
  })

  it('CHAZ_MAX_HP is 500', () => {
    expect(CHAZ_MAX_HP).toBe(500)
  })

  it('CHAZ_MOVES has at least 6 entries', () => {
    expect(CHAZ_MOVES.length).toBeGreaterThanOrEqual(6)
  })
})
