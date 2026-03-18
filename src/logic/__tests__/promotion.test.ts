import { describe, it, expect } from 'vitest'
import { isEligibleForPromotion } from '../promotion'
import { INITIAL_STATE } from '../state'
import type { InventoryItem } from '../state'

const level5Player = { ...INITIAL_STATE.player, xp: 140, level: 5 }
const threeDrinks: InventoryItem[] = [
  { id: 'energy-drink', displayName: 'Energy Drink', quantity: 3 },
]

describe('isEligibleForPromotion', () => {
  it('returns false when inventory is empty (no drinks)', () => {
    expect(isEligibleForPromotion(level5Player, [])).toBe(false)
  })

  it('returns false when level < 5 even with >= 3 drinks', () => {
    const lowLevelPlayer = { ...INITIAL_STATE.player, xp: 89, level: 3 }
    expect(isEligibleForPromotion(lowLevelPlayer, threeDrinks)).toBe(false)
  })

  it('returns false when level >= 5 but drink count is only 2', () => {
    const twoDrinks: InventoryItem[] = [
      { id: 'energy-drink', displayName: 'Energy Drink', quantity: 2 },
    ]
    expect(isEligibleForPromotion(level5Player, twoDrinks)).toBe(false)
  })

  it('returns false when level >= 5 but drink count is 0', () => {
    expect(isEligibleForPromotion(level5Player, [])).toBe(false)
  })

  it('returns true when level >= 5 AND energy-drink quantity >= 3', () => {
    expect(isEligibleForPromotion(level5Player, threeDrinks)).toBe(true)
  })

  it('returns true with more than 3 drinks', () => {
    const manyDrinks: InventoryItem[] = [
      { id: 'energy-drink', displayName: 'Energy Drink', quantity: 5 },
    ]
    expect(isEligibleForPromotion(level5Player, manyDrinks)).toBe(true)
  })

  it('ignores unrelated inventory items', () => {
    const noRelevantDrinks: InventoryItem[] = [
      { id: 'badge', displayName: 'Badge', quantity: 10 },
    ]
    expect(isEligibleForPromotion(level5Player, noRelevantDrinks)).toBe(false)
  })
})
