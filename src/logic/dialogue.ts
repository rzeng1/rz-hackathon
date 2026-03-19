import type { Player, InventoryItem } from './state'
import type { Task } from './tasks'
import { hasProductSpec, hasActiveFire, hasSuccessStory, canButtKissChaz } from './npcBehavior'
import { canInteractWithErnesto } from './npc'

/**
 * All dialogue scripts live here — the view never hardcodes strings.
 * The view calls getDialogueText and renders whatever comes back.
 */
const SCRIPTS = {
  // Ernesto — Energy Drink Gatekeeper (Phase 1)
  ernesto_eligible: "Yo, you look dead. Here's a Celsius. Don't tell HR.",
  ernesto_blocked:  "You're too junior for the good caffeine.",

  // Matthew — Product Manager
  matthew_default: "I've got three specs due by EOD. Here, take one.",

  // Paul — Head of Product
  paul_eligible:   "Nice job developing this PRD!",
  paul_blocked:    "Bring me a spec first. I don't do verbal requirements.",

  // Rizzo — Head of Customer Success
  rizzo_no_fire:   "Oh good, you're here. The client is MELTING DOWN. Go fix the server.",
  rizzo_fire_active: "You've already got a fire going. Focus.",
  rizzo_post_fix:  "Nice save. The client thinks we're heroes. Here's your glory.",

  // Chaz — CEO
  chaz_eligible:   "Love the hustle. Love. It. Take the XP.",
  chaz_blocked:    "Come back when you have something to show me.",
  chaz_repeat:     "Good stuff, but let's not make this a habit. Eyes on the prize.",

  // Server Rack — fix location
  server_rack:     "The server is on fire. Literally. Fixing...",
} as const

/**
 * Returns the correct dialogue string for a given NPC and current game state.
 * Owns all branching logic — the view never reads player.xp or inventory directly.
 * tasks parameter required for Rizzo's 3-state logic.
 */
export const getDialogueText = (
  npcId: string,
  player: Player,
  inventory: InventoryItem[],
  tasks: Task[] = [],
): string => {
  switch (npcId) {
    case 'ernesto':
      return canInteractWithErnesto(player) ? SCRIPTS.ernesto_eligible : SCRIPTS.ernesto_blocked

    case 'matthew':
      return SCRIPTS.matthew_default

    case 'paul':
      return hasProductSpec(inventory) ? SCRIPTS.paul_eligible : SCRIPTS.paul_blocked

    case 'rizzo': {
      if (hasSuccessStory(inventory)) return SCRIPTS.rizzo_post_fix
      if (hasActiveFire(tasks))       return SCRIPTS.rizzo_fire_active
      return SCRIPTS.rizzo_no_fire
    }

    case 'chaz':
      return canButtKissChaz(player, inventory) ? SCRIPTS.chaz_eligible : SCRIPTS.chaz_blocked

    case 'server_rack':
      return SCRIPTS.server_rack

    default:
      return `${npcId} has nothing to say.`
  }
}
