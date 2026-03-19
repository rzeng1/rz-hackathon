import type { InventoryItem, Player } from './state'
import type { Task } from './tasks'
import { getItemQuantity } from './inventory'
import { hasPendingTaskOfType } from './tasks'

/**
 * Returns true if the player has at least 1 product-spec in inventory.
 * Guard for Paul's XP award — Paul won't engage without a spec.
 */
export const hasProductSpec = (inventory: InventoryItem[]): boolean =>
  getItemQuantity(inventory, 'product-spec') >= 1

/**
 * Returns true if at least one customer-fire task is pending.
 * Guard to enable Server Rack interaction.
 */
export const hasActiveFire = (tasks: Task[]): boolean =>
  hasPendingTaskOfType(tasks, 'customer-fire')

/**
 * Returns true if the player has at least 1 success-story in inventory.
 * Guard for Rizzo's XP reward and Chaz Butt-Kissing.
 */
export const hasSuccessStory = (inventory: InventoryItem[]): boolean =>
  getItemQuantity(inventory, 'success-story') >= 1

/**
 * Returns true when the player can perform Butt-Kissing with Chaz.
 * Currently delegates entirely to hasSuccessStory.
 * Separated to allow future additional conditions (e.g. min level).
 */
export const canButtKissChaz = (_player: Player, inventory: InventoryItem[]): boolean =>
  hasSuccessStory(inventory)
