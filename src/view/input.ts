import type { Actor } from 'xstate'
import type { gameMachine } from '../machines/gameMachine'
import type { InputDirection } from '../logic/movement'
import { inputToVelocity } from '../logic/movement'
import { getNearbyNpc, NPC_XP_AWARDS, canCollectFromNpc, canInteractWithErnesto } from '../logic/npc'
import { isEligibleForPromotion } from '../logic/promotion'
import { hasProductSpec, hasActiveFire, hasSuccessStory, canButtKissChaz } from '../logic/npcBehavior'
import { calculateLevel } from '../logic/xp'

type Machine = Actor<typeof gameMachine>

/**
 * Captures keyboard state and dispatches events to the machine.
 * Exposes getVelocity() so main.ts can embed velocity in each TICK event.
 * Exposes destroy() to cleanly remove listeners on HMR.
 */
export const createInput = (machine: Machine) => {
  const dir: InputDirection = { up: false, down: false, left: false, right: false }
  let shiftHeld = false

  const onKeyDown = (e: KeyboardEvent) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault()
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') shiftHeld = true

    const snapshot = machine.getSnapshot()
    const ctx = snapshot.context

    // ---------------------------------------------------------------- battle controls
    if (snapshot.value === 'battle') {
      switch (e.code) {
        case 'Digit1': case 'KeyA': machine.send({ type: 'ATTACK' }); break
        case 'Digit2': case 'KeyH': machine.send({ type: 'HEAL'   }); break
        case 'Digit3': case 'KeyD': machine.send({ type: 'DODGE'  }); break
      }
      return
    }

    switch (e.code) {
      case 'ArrowUp':    case 'KeyW': dir.up    = true; break
      case 'ArrowDown':  case 'KeyS': dir.down  = true; break
      case 'ArrowLeft':  case 'KeyA': dir.left  = true; break
      case 'ArrowRight': case 'KeyD': dir.right = true; break

      // Q / C — drink coffee (only while playing; Q/C are safe: no movement binding)
      case 'KeyQ': case 'KeyC': {
        if (snapshot.value === 'playing') {
          machine.send({ type: 'DRINK_COFFEE' })
        }
        break
      }

      case 'KeyE': case 'Space': {
        // ---------------------------------------------------------------- dialogue state
        if (snapshot.value === 'dialogue') {
          const activeNpcId = ctx.activeDialogueNpcId
          machine.send({ type: 'DIALOGUE_END' })

          // Ernesto energy drink (legacy gatekeeper)
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

          // Matthew → always give product-spec
          if (activeNpcId === 'matthew') {
            machine.send({
              type: 'COLLECT_ITEM',
              itemId: 'product-spec',
              displayName: 'Product Spec',
            })
          }

          // Paul → consume product-spec (XP awarded in INTERACT)
          if (activeNpcId === 'paul' && hasProductSpec(ctx.inventory)) {
            machine.send({ type: 'CONSUME_ITEM', itemId: 'product-spec' })
          }

          // Rizzo → 3-state post-dialogue
          if (activeNpcId === 'rizzo') {
            if (hasSuccessStory(ctx.inventory)) {
              machine.send({ type: 'CONSUME_ITEM', itemId: 'success-story' })
            } else if (!hasActiveFire(ctx.tasks)) {
              machine.send({ type: 'CREATE_TASK', taskType: 'customer-fire', assignedBy: 'rizzo' })
            }
          }

          // Server Rack → fix fire + collect success-story
          if (activeNpcId === 'server_rack' && hasActiveFire(ctx.tasks)) {
            machine.send({ type: 'COMPLETE_TASK', taskType: 'customer-fire' })
            machine.send({
              type: 'COLLECT_ITEM',
              itemId: 'success-story',
              displayName: 'Success Story',
            })
          }

          // Chaz → butt-kissing (consume story, XP in INTERACT)
          if (activeNpcId === 'chaz' && canButtKissChaz(ctx.player, ctx.inventory)) {
            machine.send({ type: 'CONSUME_ITEM', itemId: 'success-story' })
          }

          // Win condition (phase 1 legacy path)
          if (activeNpcId === 'ceo' && isEligibleForPromotion(ctx.player, ctx.inventory, ctx.tasks)) {
            machine.send({ type: 'WIN' })
          }

        // ---------------------------------------------------------------- playing state
        } else if (snapshot.value === 'playing') {
          const nearbyNpc = getNearbyNpc(ctx.player.position, ctx.npcs)
          if (!nearbyNpc) break

          // Server Rack only interactable with active fire
          if (nearbyNpc.id === 'server_rack' && !hasActiveFire(ctx.tasks)) break

          // Chaz at Level 10 → enter boss battle (bypasses normal dialogue)
          if (nearbyNpc.id === 'chaz' && calculateLevel(ctx.player.xp) >= 10) {
            machine.send({ type: 'ENTER_BATTLE' })
            break
          }

          // All other interactions → INTERACT with guarded XP amount
          let xpAmount = NPC_XP_AWARDS[nearbyNpc.id] ?? 0
          if (nearbyNpc.id === 'paul'  && !hasProductSpec(ctx.inventory))             xpAmount = 0
          if (nearbyNpc.id === 'rizzo' && !hasSuccessStory(ctx.inventory))            xpAmount = 0
          if (nearbyNpc.id === 'chaz'  && !canButtKissChaz(ctx.player, ctx.inventory)) xpAmount = 0

          machine.send({ type: 'INTERACT', npcId: nearbyNpc.id, xpAmount })
        }
        break
      }
    }
  }

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') shiftHeld = false
    // Battle state: movement keys irrelevant
    if (machine.getSnapshot().value === 'battle') return
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
    getVelocity: (speed: number) => inputToVelocity(dir, speed),
    isSprinting: () => shiftHeld,
    destroy: () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    },
  }
}
