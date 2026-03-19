import type { Vec2 } from './state'
import type { GameTime } from './time'
import { isLunchTime } from './time'

/** Where all schedule-following NPCs go at 12:00. */
export const LUNCH_ROOM: Vec2 = { x: 600, y: 100 }

/**
 * Ernesto's permanent post by the Energy Drink Cooler.
 * He is a Gatekeeper — he never joins the 12:00 lunch migration.
 */
export const ERNESTO_POST: Vec2 = { x: 84, y: 100 }

/** Canonical desk positions for schedule-following NPCs. */
export const NPC_DESK_POSITIONS: Record<string, Vec2> = {
  chaz:    { x: 1040, y: 530 },
  rizzo:   { x: 700,  y: 350 },
  paul:    { x: 850,  y: 230 },
  matthew: { x: 450,  y: 230 },
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
