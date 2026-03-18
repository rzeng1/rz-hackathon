import type { Player, InventoryItem } from './state'
import { calculateLevel } from './xp'
import { getItemQuantity } from './inventory'

/**
 * The canonical "CEO Ascension" check.
 * Returns true only when BOTH conditions are met:
 *   1. Player's derived level is >= 5
 *   2. Inventory contains >= 3 energy drinks
 *
 * The canBecomeCEO guard in gameMachine MUST delegate to this function.
 * Any change to ascension requirements should only require editing this file.
 */
export const isEligibleForPromotion = (
  player: Player,
  inventory: InventoryItem[],
): boolean =>
  calculateLevel(player.xp) >= 5 && getItemQuantity(inventory, 'energy-drink') >= 3
