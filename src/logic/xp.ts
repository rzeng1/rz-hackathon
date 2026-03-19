/**
 * Cumulative XP required to reach each level (index = level - 1).
 * Level 1 = 0 XP … Level 10 = 400 XP.
 *
 * Pacing (Chaz 25 + Paul 15 per fire-loop cycle at ~30s each):
 *   ~10 cycles × 40 XP = 400 XP → Level 10 reachable in ~5 minutes.
 */
export const XP_TABLE = [0, 20, 50, 90, 140, 185, 235, 290, 350, 400] as const

/**
 * Derives the player's current level from total accumulated XP.
 * Returns a value between 1 and 10 (inclusive).
 * Pure function — safe to call inside XState assign actions.
 */
export const calculateLevel = (xp: number): number => {
  for (let i = XP_TABLE.length - 1; i >= 0; i--) {
    if (xp >= XP_TABLE[i]) return i + 1
  }
  return 1
}

/** Alias kept for consistency with Module 02 references. */
export const calcLevel = calculateLevel

/**
 * Returns the XP multiplier to apply while the combo flow state is active.
 * Pure function — safe to call inside XState assign actions.
 */
export const flowStateXpMultiplier = (isFlowState: boolean): number =>
  isFlowState ? 2 : 1

/**
 * Returns a new Player with xp incremented by amount and level re-derived.
 * Does NOT mutate the input player.
 */
export const applyXpGain = <T extends { xp: number; level: number }>(
  player: T,
  amount: number,
): T => {
  const newXp = player.xp + amount
  return { ...player, xp: newXp, level: calculateLevel(newXp) }
}
