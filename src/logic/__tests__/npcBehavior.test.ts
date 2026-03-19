import { describe, it, expect } from 'vitest'
import {
  hasProductSpec,
  hasActiveFire,
  hasSuccessStory,
  canButtKissChaz,
} from '../npcBehavior'
import type { Task } from '../tasks'
import type { InventoryItem, Player } from '../state'
import { INITIAL_STATE } from '../state'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const emptyInventory: InventoryItem[] = []

const withSpec: InventoryItem[] = [{ id: 'product-spec', displayName: 'Product Spec', quantity: 1 }]
const withStory: InventoryItem[] = [{ id: 'success-story', displayName: 'Success Story', quantity: 1 }]

const pendingFire: Task = {
  id: 'task-rizzo-customer-fire-1',
  type: 'customer-fire',
  status: 'pending',
  assignedBy: 'rizzo',
  assignedAt: 1,
}

const completedFire: Task = { ...pendingFire, status: 'complete' }

const player: Player = INITIAL_STATE.player

// ---------------------------------------------------------------------------
// hasProductSpec
// ---------------------------------------------------------------------------

describe('hasProductSpec', () => {
  it('returns false when inventory is empty', () => {
    expect(hasProductSpec(emptyInventory)).toBe(false)
  })

  it('returns true when product-spec quantity >= 1', () => {
    expect(hasProductSpec(withSpec)).toBe(true)
  })

  it('returns false when only other items present', () => {
    const inv: InventoryItem[] = [{ id: 'energy-drink', displayName: 'Energy Drink', quantity: 3 }]
    expect(hasProductSpec(inv)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// hasActiveFire
// ---------------------------------------------------------------------------

describe('hasActiveFire', () => {
  it('returns false when no tasks exist', () => {
    expect(hasActiveFire([])).toBe(false)
  })

  it('returns false when no pending fires exist', () => {
    expect(hasActiveFire([completedFire])).toBe(false)
  })

  it('returns true with one pending fire', () => {
    expect(hasActiveFire([pendingFire])).toBe(true)
  })

  it('returns true even when some fires are complete', () => {
    expect(hasActiveFire([completedFire, pendingFire])).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// hasSuccessStory
// ---------------------------------------------------------------------------

describe('hasSuccessStory', () => {
  it('returns false when inventory is empty', () => {
    expect(hasSuccessStory(emptyInventory)).toBe(false)
  })

  it('returns true when success-story quantity >= 1', () => {
    expect(hasSuccessStory(withStory)).toBe(true)
  })

  it('returns false when only other items present', () => {
    expect(hasSuccessStory(withSpec)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// canButtKissChaz
// ---------------------------------------------------------------------------

describe('canButtKissChaz', () => {
  it('delegates to hasSuccessStory — returns false without story', () => {
    expect(canButtKissChaz(player, emptyInventory)).toBe(false)
  })

  it('delegates to hasSuccessStory — returns true with story', () => {
    expect(canButtKissChaz(player, withStory)).toBe(true)
  })

  it('returns false when player has spec but no story', () => {
    expect(canButtKissChaz(player, withSpec)).toBe(false)
  })
})
