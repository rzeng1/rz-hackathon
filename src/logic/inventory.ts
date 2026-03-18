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
