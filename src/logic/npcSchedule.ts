import type { Vec2 } from './state'
import type { GameTime } from './time'
import { isLunchTime } from './time'

/** Where all schedule-following NPCs go at 12:00. */
export const LUNCH_ROOM: Vec2 = { x: 600, y: 110 }

/**
 * Ernesto's permanent post by the Energy Drink Cooler (bottom-left).
 * He is a Gatekeeper — he never joins the 12:00 lunch migration.
 * Bottom-left placement keeps the top-left corner clear for the HUD.
 */
export const ERNESTO_POST: Vec2 = { x: 133, y: 630 }

/**
 * Canonical desk positions for schedule-following NPCs.
 * Aligned with STATIC_OBSTACLES desk rows (world.ts) after +20% vertical spacing.
 */
export const NPC_DESK_POSITIONS: Record<string, Vec2> = {
  chaz:    { x: 1040, y: 605 },
  rizzo:   { x: 700,  y: 420 },
  paul:    { x: 850,  y: 274 },
  matthew: { x: 450,  y: 274 },
}

/**
 * Returns the schedule-driven destination for an NPC at a given game time.
 * - 'ernesto'    → ERNESTO_POST always (gatekeeper; ignores lunch migration)
 * - 12:00–12:59  → LUNCH_ROOM for all other NPCs
 * - Otherwise    → desk position from NPC_DESK_POSITIONS
 * Falls back to LUNCH_ROOM for unknown NPC ids (safe, no crash).
 * Pure — no side effects.
 */
export const getNpcTarget = (npcId: string, gameTime: GameTime): Vec2 => {
  if (npcId === 'ernesto') return ERNESTO_POST
  if (isLunchTime(gameTime)) return LUNCH_ROOM
  return NPC_DESK_POSITIONS[npcId] ?? LUNCH_ROOM
}
