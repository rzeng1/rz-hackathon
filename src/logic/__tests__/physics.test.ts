import { describe, it, expect } from 'vitest'
import { calcEffectiveSpeed, playerEffectiveSpeed } from '../physics'
import { INITIAL_STATE } from '../state'

// ---------------------------------------------------------------------------
// calcEffectiveSpeed — pure speed modifier
// ---------------------------------------------------------------------------

describe('calcEffectiveSpeed — no modifiers', () => {
  it('returns base speed when energy is normal and not caffeinated', () => {
    expect(calcEffectiveSpeed(3, 50, false)).toBe(3)
  })

  it('returns base speed when energy is exactly 20 (boundary — not exhausted)', () => {
    expect(calcEffectiveSpeed(4, 20, false)).toBe(4)
  })

  it('returns base speed when energy is 100', () => {
    expect(calcEffectiveSpeed(3, 100, false)).toBe(3)
  })
})

describe('calcEffectiveSpeed — exhaustion (energy < 20)', () => {
  it('halves speed at energy = 19 (just below threshold)', () => {
    expect(calcEffectiveSpeed(4, 19, false)).toBe(2)
  })

  it('halves speed at energy = 0', () => {
    expect(calcEffectiveSpeed(6, 0, false)).toBe(3)
  })

  it('halves speed at energy = 1', () => {
    expect(calcEffectiveSpeed(4, 1, false)).toBe(2)
  })
})

describe('calcEffectiveSpeed — caffeine boost', () => {
  it('multiplies speed by 1.5 when caffeinated and energy is normal', () => {
    expect(calcEffectiveSpeed(4, 50, true)).toBe(6)
  })

  it('multiplies speed by 1.5 at energy = 100', () => {
    expect(calcEffectiveSpeed(2, 100, true)).toBe(3)
  })
})

describe('calcEffectiveSpeed — stacked modifiers', () => {
  it('applies both: exhausted (×0.5) + caffeinated (×1.5) = ×0.75', () => {
    // 4 * 0.5 * 1.5 = 3
    expect(calcEffectiveSpeed(4, 10, true)).toBe(3)
  })

  it('stacked result is less than caffeinated-only result', () => {
    const caffeOnly   = calcEffectiveSpeed(4, 50, true)   // 6
    const bothActive  = calcEffectiveSpeed(4, 10, true)   // 3
    expect(bothActive).toBeLessThan(caffeOnly)
  })

  it('stacked result is less than uncaffeinated normal speed', () => {
    const normal  = calcEffectiveSpeed(4, 50, false)  // 4
    const stacked = calcEffectiveSpeed(4, 10, true)   // 3
    expect(stacked).toBeLessThan(normal)
  })
})

describe('calcEffectiveSpeed — sprint boost', () => {
  it('doubles speed when isSprinting is true and energy is normal', () => {
    expect(calcEffectiveSpeed(4, 50, false, true)).toBe(8)
  })

  it('sprint stacks with caffeine (×1.5 × ×2.0 = ×3.0)', () => {
    // 4 * 1.5 * 2.0 = 12
    expect(calcEffectiveSpeed(4, 50, true, true)).toBe(12)
  })

  it('sprint stacks with exhaustion (×0.5 × ×2.0 = ×1.0)', () => {
    // 4 * 0.5 * 2.0 = 4
    expect(calcEffectiveSpeed(4, 10, false, true)).toBe(4)
  })

  it('no sprint effect when isSprinting=false (backward compatible default)', () => {
    expect(calcEffectiveSpeed(4, 50, false, false)).toBe(calcEffectiveSpeed(4, 50, false))
  })
})

describe('calcEffectiveSpeed — determinism', () => {
  it('is a pure function — same inputs always produce same output', () => {
    expect(calcEffectiveSpeed(3, 15, true)).toBe(calcEffectiveSpeed(3, 15, true))
  })

  it('does not mutate inputs (speed is primitive — sanity check)', () => {
    const base = 3
    calcEffectiveSpeed(base, 50, false)
    expect(base).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// playerEffectiveSpeed — convenience wrapper
// ---------------------------------------------------------------------------

describe('playerEffectiveSpeed', () => {
  it('returns base speed for the initial player (energy=80, not caffeinated)', () => {
    expect(playerEffectiveSpeed(INITIAL_STATE.player)).toBe(INITIAL_STATE.player.speed)
  })

  it('halves speed when player energy is below 20', () => {
    const lowEnergyPlayer = { ...INITIAL_STATE.player, energy: 10 }
    expect(playerEffectiveSpeed(lowEnergyPlayer)).toBe(INITIAL_STATE.player.speed * 0.5)
  })

  it('boosts speed when player is caffeinated', () => {
    const caffPlayer = { ...INITIAL_STATE.player, isCaffeinated: true }
    expect(playerEffectiveSpeed(caffPlayer)).toBe(INITIAL_STATE.player.speed * 1.5)
  })

  it('delegates to calcEffectiveSpeed consistently', () => {
    const p = { ...INITIAL_STATE.player, energy: 10, isCaffeinated: true }
    expect(playerEffectiveSpeed(p)).toBe(calcEffectiveSpeed(p.speed, p.energy, p.isCaffeinated))
  })
})
