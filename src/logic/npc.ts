import type { Vec2, NPC, NPCState, Player } from './state'

// ---------------------------------------------------------------------------
// XP awarded per NPC on successful INTERACT — single source of truth.
// The view layer dispatches INTERACT with the value from this map.
// CEO uses 0 here; the WIN event is dispatched separately by the view.
// ---------------------------------------------------------------------------

export const NPC_XP_AWARDS: Record<string, number> = {
  // Phase 2 roster
  matthew:    0,   // Produces product-specs; no direct XP
  paul:       15,  // Rewards XP for product-spec (guard: hasProductSpec)
  rizzo:      12,  // Rewards XP after fire resolution (guard: hasSuccessStory)
  chaz:       25,  // CEO-track Butt-Kissing XP (guard: canButtKissChaz)
  server_rack: 0,  // Fix location; no XP
  // Phase 1 roster (kept for backward compatibility)
  ernesto: 0,
  priya: 10,
  jake: 8,
  linda: 12,
  ceo: 0,
}

// ---------------------------------------------------------------------------
// System 1: Proximity
// ---------------------------------------------------------------------------

/**
 * Returns true when the Euclidean distance between playerPos and npcPos
 * is less than or equal to radius. Pure geometry — no side effects.
 */
export const isInRange = (playerPos: Vec2, npcPos: Vec2, radius: number): boolean => {
  const dx = playerPos.x - npcPos.x
  const dy = playerPos.y - npcPos.y
  return Math.sqrt(dx * dx + dy * dy) <= radius
}

/**
 * Returns the first NPC whose interactionRadius contains playerPos,
 * or null if no NPC is in range.
 */
export const getNearbyNpc = (playerPos: Vec2, npcs: NPC[]): NPC | null =>
  npcs.find(npc => isInRange(playerPos, npc.position, npc.interactionRadius)) ?? null

// ---------------------------------------------------------------------------
// System 2: NPC Interaction State
// ---------------------------------------------------------------------------

/**
 * Returns true when the player has not yet interacted with the given NPC
 * this session. A missing entry is treated as "not yet interacted".
 */
export const canCollectFromNpc = (npcId: string, npcStates: NPCState[]): boolean => {
  const entry = npcStates.find(s => s.npcId === npcId)
  return entry === undefined || !entry.hasInteractedThisSession
}

/**
 * Returns a new npcStates array with the target NPC marked as interacted.
 * Appends a new entry if none exists. Immutable — never mutates input.
 */
export const markNpcInteracted = (
  npcId: string,
  currentTick: number,
  npcStates: NPCState[],
): NPCState[] => {
  const exists = npcStates.some(s => s.npcId === npcId)
  if (exists) {
    return npcStates.map(s =>
      s.npcId === npcId
        ? { ...s, hasInteractedThisSession: true, lastInteractionTick: currentTick }
        : s,
    )
  }
  return [
    ...npcStates,
    { npcId, hasInteractedThisSession: true, lastInteractionTick: currentTick },
  ]
}

// ---------------------------------------------------------------------------
// System 2: Ernesto Gatekeeper
// ---------------------------------------------------------------------------

/**
 * Returns true only if the player has reached Level 2+ (xp >= 20).
 * Ernesto won't give the good caffeine to junior employees.
 * Dialogue hint on failure: "You're too junior for the good caffeine."
 */
export const canInteractWithErnesto = (player: Player): boolean => player.xp >= 20
