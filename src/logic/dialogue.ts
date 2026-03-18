import type { Player, InventoryItem } from './state'
import { canInteractWithErnesto } from './npc'
import { isEligibleForPromotion } from './promotion'

/**
 * All dialogue scripts live here — the view never hardcodes strings.
 * The view calls getDialogueText and renders whatever comes back.
 */
const SCRIPTS = {
  ernesto_eligible: "Yo, you look dead. Here's a Red Bull. Don't tell HR.",
  ernesto_blocked:  "You're too junior for the good caffeine.",
  priya:            "Push to prod? On a Friday? Bold move.",
  jake:             "Bro, I literally closed a deal in my sleep last night.",
  linda:            "I've filed the paperwork. Three times.",
  ceo_eligible:     "The board is ready for you. Welcome to the top.",
  ceo_blocked:      "You're not ready yet. Get more experience — and caffeine.",
} as const

/**
 * Returns the correct dialogue string for a given NPC and current player state.
 * Owns all branching logic — the view never reads player.xp or inventory directly.
 */
export const getDialogueText = (
  npcId: string,
  player: Player,
  inventory: InventoryItem[],
): string => {
  if (npcId === 'ernesto') {
    return canInteractWithErnesto(player)
      ? SCRIPTS.ernesto_eligible
      : SCRIPTS.ernesto_blocked
  }
  if (npcId === 'ceo') {
    return isEligibleForPromotion(player, inventory)
      ? SCRIPTS.ceo_eligible
      : SCRIPTS.ceo_blocked
  }
  return SCRIPTS[npcId as keyof typeof SCRIPTS] ?? `${npcId} has nothing to say.`
}
