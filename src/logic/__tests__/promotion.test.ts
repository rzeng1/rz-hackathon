import { describe, it, expect } from 'vitest'
import { isEligibleForPromotion } from '../promotion'
import { INITIAL_STATE } from '../state'
import type { InventoryItem } from '../state'
import type { Task } from '../tasks'

const level5Player = { ...INITIAL_STATE.player, xp: 140, level: 5 }

const withStory: InventoryItem[] = [
  { id: 'success-story', displayName: 'Success Story', quantity: 1 },
]

const pendingFire: Task = {
  id: 'task-rizzo-customer-fire-1',
  type: 'customer-fire',
  status: 'pending',
  assignedBy: 'rizzo',
  assignedAt: 1,
}

describe('isEligibleForPromotion', () => {
  it('returns false when inventory is empty', () => {
    expect(isEligibleForPromotion(level5Player, [], [])).toBe(false)
  })

  it('returns false when level < 5 even with success-story', () => {
    const lowLevelPlayer = { ...INITIAL_STATE.player, xp: 89, level: 3 }
    expect(isEligibleForPromotion(lowLevelPlayer, withStory, [])).toBe(false)
  })

  it('returns false when level >= 5 but no success-story', () => {
    expect(isEligibleForPromotion(level5Player, [], [])).toBe(false)
  })

  it('returns false when level >= 5 + success-story but pending fire exists', () => {
    expect(isEligibleForPromotion(level5Player, withStory, [pendingFire])).toBe(false)
  })

  it('returns true when level >= 5 AND success-story AND no pending fires', () => {
    expect(isEligibleForPromotion(level5Player, withStory, [])).toBe(true)
  })

  it('returns true when completed fire exists but no pending fires', () => {
    const completedFire: Task = { ...pendingFire, status: 'complete' }
    expect(isEligibleForPromotion(level5Player, withStory, [completedFire])).toBe(true)
  })

  it('ignores unrelated inventory items', () => {
    const noStory: InventoryItem[] = [{ id: 'badge', displayName: 'Badge', quantity: 10 }]
    expect(isEligibleForPromotion(level5Player, noStory, [])).toBe(false)
  })
})
