import type { Actor } from 'xstate'
import type { gameMachine } from '../machines/gameMachine'
import type { InputDirection } from '../logic/movement'
import { inputToVelocity } from '../logic/movement'
import { getNearbyNpc, NPC_XP_AWARDS, canCollectFromNpc, canInteractWithErnesto } from '../logic/npc'
import { isEligibleForPromotion } from '../logic/promotion'

type Machine = Actor<typeof gameMachine>

/**
 * Captures keyboard state and dispatches events to the machine.
 * Exposes getVelocity() so main.ts can embed velocity in each TICK event.
 * Exposes destroy() to cleanly remove listeners on HMR.
 */
export const createInput = (machine: Machine) => {
  const dir: InputDirection = { up: false, down: false, left: false, right: false }

  const onKeyDown = (e: KeyboardEvent) => {
    // Prevent page scrolling on arrow keys during gameplay
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault()
    }

    switch (e.code) {
      case 'ArrowUp':    case 'KeyW': dir.up    = true; break
      case 'ArrowDown':  case 'KeyS': dir.down  = true; break
      case 'ArrowLeft':  case 'KeyA': dir.left  = true; break
      case 'ArrowRight': case 'KeyD': dir.right = true; break

      case 'KeyE': case 'Space': {
        const snapshot = machine.getSnapshot()
        const ctx = snapshot.context

        if (snapshot.value === 'dialogue') {
          const activeNpcId = ctx.activeDialogueNpcId

          // Dismiss dialogue
          machine.send({ type: 'DIALOGUE_END' })

          // Post-dialogue item collection for Ernesto
          if (
            activeNpcId === 'ernesto' &&
            canInteractWithErnesto(ctx.player) &&
            canCollectFromNpc('ernesto', ctx.npcStates)
          ) {
            machine.send({
              type: 'COLLECT_ITEM',
              itemId: 'energy-drink',
              displayName: 'Energy Drink',
              fromNpcId: 'ernesto',
            })
          }

          // Post-dialogue WIN dispatch for CEO
          if (activeNpcId === 'ceo' && isEligibleForPromotion(ctx.player, ctx.inventory)) {
            machine.send({ type: 'WIN' })
          }
        } else if (snapshot.value === 'playing') {
          const nearbyNpc = getNearbyNpc(ctx.player.position, ctx.npcs)
          if (nearbyNpc) {
            machine.send({
              type: 'INTERACT',
              npcId: nearbyNpc.id,
              xpAmount: NPC_XP_AWARDS[nearbyNpc.id] ?? 0,
            })
          }
        }
        break
      }
    }
  }

  const onKeyUp = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'ArrowUp':    case 'KeyW': dir.up    = false; break
      case 'ArrowDown':  case 'KeyS': dir.down  = false; break
      case 'ArrowLeft':  case 'KeyA': dir.left  = false; break
      case 'ArrowRight': case 'KeyD': dir.right = false; break
    }
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)

  return {
    /** Returns the current velocity Vec2 based on held keys and player speed. */
    getVelocity: (speed: number) => inputToVelocity(dir, speed),

    /** Removes all event listeners. Call on HMR teardown. */
    destroy: () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    },
  }
}
