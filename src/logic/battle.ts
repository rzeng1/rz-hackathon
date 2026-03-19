/**
 * Pure battle functions for the Chaz boss fight.
 * All functions accept a `roll` parameter (0–99) so the action layer
 * can inject Math.random() while keeping these functions testable.
 */

export const PLAYER_MAX_HP = 100
export const CHAZ_MAX_HP   = 500

export type ChazMove = {
  name: string
  damage: number
}

/** All of Chaz's corporate buzzword attacks. */
export const CHAZ_MOVES: ChazMove[] = [
  { name: 'Synergy Blast',         damage: 28 },
  { name: 'Restructuring',         damage: 22 },
  { name: 'Pivot to Mobile',       damage: 35 },
  { name: 'Disruptive Innovation', damage: 18 },
  { name: 'Circle Back',           damage: 12 },
  { name: 'Boil the Ocean',        damage: 30 },
  { name: 'Agile Methodology',     damage: 15 },
  { name: 'Thought Leadership',    damage: 25 },
]

/**
 * Calculates player attack damage from a random roll (0–99).
 * - 75–99: Critical hit — 45 dmg
 * - 25–74: Normal hit  — 30 dmg
 * -  0–24: Weak hit    — 15 dmg
 */
export const calculatePlayerAttack = (roll: number): number => {
  if (roll >= 75) return 45
  if (roll >= 25) return 30
  return 15
}

/**
 * Selects a Chaz move for a given random roll (0–99).
 * Index is roll modulo array length — deterministic given the roll.
 */
export const selectChazMove = (roll: number): ChazMove =>
  CHAZ_MOVES[roll % CHAZ_MOVES.length]

/**
 * Calculates HP healed by the HEAL action from a random roll (0–99).
 * Range: 20–40 HP.
 */
export const calculateHeal = (roll: number): number => 20 + (roll % 21)

/**
 * Calculates the residual damage that bleeds through a successful DODGE (0–99).
 * Range: 0–5 HP — nearly zero.
 */
export const calculateDodgeDamage = (roll: number): number => roll % 6

/**
 * Clamps an HP value to the valid range [0, maxHp].
 * Pure — used by action layer to prevent underflow or overflow.
 */
export const clampHP = (hp: number, maxHp: number): number =>
  Math.max(0, Math.min(maxHp, hp))
