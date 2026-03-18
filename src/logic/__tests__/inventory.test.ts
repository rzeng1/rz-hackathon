import { describe, it, expect } from 'vitest'
import { addItem, getItemQuantity } from '../inventory'
import type { InventoryItem } from '../state'

describe('addItem', () => {
  it('adds a new item with quantity 1 to an empty inventory', () => {
    const result = addItem([], 'energy-drink', 'Energy Drink')
    expect(result).toEqual([{ id: 'energy-drink', displayName: 'Energy Drink', quantity: 1 }])
  })

  it('increments quantity when adding a duplicate item', () => {
    const inventory: InventoryItem[] = [
      { id: 'energy-drink', displayName: 'Energy Drink', quantity: 2 },
    ]
    const result = addItem(inventory, 'energy-drink', 'Energy Drink')
    expect(result[0].quantity).toBe(3)
  })

  it('does not mutate the original array', () => {
    const inventory: InventoryItem[] = []
    addItem(inventory, 'energy-drink', 'Energy Drink')
    expect(inventory).toHaveLength(0)
  })

  it('does not mutate existing item objects', () => {
    const original: InventoryItem = { id: 'energy-drink', displayName: 'Energy Drink', quantity: 1 }
    const inventory = [original]
    addItem(inventory, 'energy-drink', 'Energy Drink')
    expect(original.quantity).toBe(1)
  })

  it('appends a new item without affecting existing items', () => {
    const inventory: InventoryItem[] = [
      { id: 'energy-drink', displayName: 'Energy Drink', quantity: 1 },
    ]
    const result = addItem(inventory, 'badge', 'Employee Badge')
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('energy-drink')
    expect(result[1].id).toBe('badge')
  })
})

describe('getItemQuantity', () => {
  it('returns 0 for an item not in inventory', () => {
    expect(getItemQuantity([], 'energy-drink')).toBe(0)
  })

  it('returns the correct quantity for an existing item', () => {
    const inventory: InventoryItem[] = [
      { id: 'energy-drink', displayName: 'Energy Drink', quantity: 3 },
    ]
    expect(getItemQuantity(inventory, 'energy-drink')).toBe(3)
  })

  it('returns 0 when item id does not match', () => {
    const inventory: InventoryItem[] = [
      { id: 'badge', displayName: 'Badge', quantity: 1 },
    ]
    expect(getItemQuantity(inventory, 'energy-drink')).toBe(0)
  })
})
