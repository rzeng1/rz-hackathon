import type { InventoryItem } from './state'

/**
 * Returns a new inventory array with the given item added or its quantity incremented.
 * Immutable — never mutates the input array.
 */
export const addItem = (
  inventory: InventoryItem[],
  itemId: string,
  displayName: string,
): InventoryItem[] => {
  const exists = inventory.some(i => i.id === itemId)
  if (exists) {
    return inventory.map(i =>
      i.id === itemId ? { ...i, quantity: i.quantity + 1 } : i,
    )
  }
  return [...inventory, { id: itemId, displayName, quantity: 1 }]
}

/**
 * Returns the quantity of a given item in the inventory, or 0 if not present.
 */
export const getItemQuantity = (inventory: InventoryItem[], itemId: string): number =>
  inventory.find(i => i.id === itemId)?.quantity ?? 0

/**
 * Returns a new inventory array with one unit of the item removed.
 * If quantity reaches 0, the item is removed from the array.
 * Immutable — never mutates the input array. No-op if item not found.
 */
export const removeItem = (inventory: InventoryItem[], itemId: string): InventoryItem[] => {
  const item = inventory.find(i => i.id === itemId)
  if (!item) return inventory
  if (item.quantity <= 1) return inventory.filter(i => i.id !== itemId)
  return inventory.map(i => (i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i))
}
