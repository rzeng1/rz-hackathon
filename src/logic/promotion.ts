import type { Player, InventoryItem } from './state'
import type { Task } from './tasks'
import { calculateLevel } from './xp'
import { getItemQuantity } from './inventory'
import { hasPendingTaskOfType } from './tasks'

/**
 * The canonical "CEO Ascension" check.
 * Returns true only when ALL conditions are met:
 *   1. Player's derived level is >= 5
 *   2. No pending customer-fire tasks (all fires resolved)
 *   3. Player holds >= 1 success-story (proof of a closed deal)
 *
 * The canBecomeCEO guard in gameMachine MUST delegate to this function.
 * Any change to ascension requirements should only require editing this file.
 */
export const isEligibleForPromotion = (
  player: Player,
  inventory: InventoryItem[],
  tasks: Task[] = [],
): boolean =>
  calculateLevel(player.xp) >= 5 &&
  !hasPendingTaskOfType(tasks, 'customer-fire') &&
  getItemQuantity(inventory, 'success-story') >= 1
