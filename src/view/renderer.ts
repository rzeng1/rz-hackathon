import { Application, Container, Graphics } from 'pixi.js'
import type { GameState } from '../logic/state'
import { INITIAL_STATE } from '../logic/state'
import { getStaticObstacles, COOLER_RECT } from '../logic/world'

// NPC placeholder colours by id
const NPC_COLOURS: Record<string, number> = {
  ernesto:    0xff6b35,  // orange-red — energy drink gatekeeper
  matthew:    0x4caf50,  // green — product manager
  paul:       0x2196f3,  // blue — head of product
  rizzo:      0xff9800,  // amber — customer success
  chaz:       0xffd700,  // gold — CEO
  server_rack: 0x607d8b, // grey-blue — hardware
}

const PLAYER_HALF = 12  // half of 24px player size
const LERP_SPEED  = 0.12 // cosmetic interpolation factor (per frame)

/**
 * Creates and owns all PixiJS display objects for the game world.
 * Exposes a single update(state) method — no logic lives here.
 * NPC positions are smoothly interpolated toward their state-driven targets.
 */
export const createRenderer = (app: Application) => {
  // ------------------------------------------------------------------ world
  const world = new Container()
  world.sortableChildren = true  // enables Y-sorting via zIndex
  app.stage.addChild(world)

  // Floor
  const floor = new Graphics()
  floor.rect(0, 0, 1280, 720).fill(0xc8b89a)
  floor.zIndex = 0
  world.addChild(floor)

  // Static obstacles — drawn once, cached
  const obstacleGfx = new Graphics()
  for (const r of getStaticObstacles()) {
    obstacleGfx.rect(r.x, r.y, r.width, r.height).fill(0x7a5c2e)
  }
  obstacleGfx.zIndex = 10
  world.addChild(obstacleGfx)

  // Energy Drink Cooler — drawn on top of the obstacle layer with a distinct
  // colour. Coordinates come from COOLER_RECT in world.ts (no hardcoding here).
  const coolerGfx = new Graphics()
  coolerGfx.rect(COOLER_RECT.x, COOLER_RECT.y, COOLER_RECT.width, COOLER_RECT.height)
    .fill(0x00bcd4)  // cyan — unmistakably a fridge
  coolerGfx.zIndex = 11
  world.addChild(coolerGfx)

  // ------------------------------------------------------------------ player
  const playerGfx = new Graphics()
  playerGfx.rect(-PLAYER_HALF, -PLAYER_HALF, PLAYER_HALF * 2, PLAYER_HALF * 2).fill(0x3a7bd5)
  world.addChild(playerGfx)

  // ------------------------------------------------------------------ NPCs
  // Display positions are interpolated toward the logical state positions each frame.
  const npcGfxMap    = new Map<string, Graphics>()
  const npcDisplayPos = new Map<string, { x: number; y: number }>()

  for (const npc of INITIAL_STATE.npcs) {
    const g = new Graphics()
    if (npc.role === 'location') {
      // Server Rack rendered as a rectangle, not a character square
      g.rect(-20, -30, 40, 60).fill(NPC_COLOURS[npc.id] ?? 0x607d8b)
    } else {
      g.rect(-PLAYER_HALF, -PLAYER_HALF, PLAYER_HALF * 2, PLAYER_HALF * 2)
        .fill(NPC_COLOURS[npc.id] ?? 0x999999)
    }
    g.position.set(npc.position.x, npc.position.y)
    g.zIndex = npc.position.y
    world.addChild(g)
    npcGfxMap.set(npc.id, g)
    npcDisplayPos.set(npc.id, { x: npc.position.x, y: npc.position.y })
  }

  // ------------------------------------------------------------------ highlight ring
  const highlight = new Graphics()
  highlight.visible = false
  highlight.zIndex = 500
  world.addChild(highlight)

  // ------------------------------------------------------------------ win overlay
  const winOverlay = new Container()
  winOverlay.visible = false
  winOverlay.zIndex = 1000
  app.stage.addChild(winOverlay)

  const winBg = new Graphics()
  winBg.rect(0, 0, 1280, 720).fill({ color: 0x000000, alpha: 0.75 })
  winOverlay.addChild(winBg)

  let winTextAdded = false

  // ------------------------------------------------------------------ update
  const update = (state: GameState) => {
    // Win screen
    if (state.status === 'won') {
      winOverlay.visible = true
      if (!winTextAdded) {
        import('pixi.js').then(({ Text }) => {
          const t = new Text({
            text: 'YOU ARE NOW CEO',
            style: { fill: '#ffd700', fontSize: 56, fontWeight: 'bold', align: 'center' },
          })
          t.anchor.set(0.5)
          t.position.set(640, 360)
          winOverlay.addChild(t)
          winTextAdded = true
        })
      }
      return
    }

    // Player — position + Y-sort
    playerGfx.position.set(state.player.position.x, state.player.position.y)
    playerGfx.zIndex = state.player.position.y

    // NPCs — lerp display position toward logical position for smooth movement
    for (const npc of state.npcs) {
      const g = npcGfxMap.get(npc.id)
      if (!g) continue

      if (npc.role === 'location') {
        // Locations never move; just ensure position is set
        g.position.set(npc.position.x, npc.position.y)
        g.zIndex = npc.position.y
        continue
      }

      const display = npcDisplayPos.get(npc.id) ?? { x: npc.position.x, y: npc.position.y }
      display.x += (npc.position.x - display.x) * LERP_SPEED
      display.y += (npc.position.y - display.y) * LERP_SPEED
      npcDisplayPos.set(npc.id, display)

      g.position.set(display.x, display.y)
      g.zIndex = display.y
    }

    // Interaction highlight ring — show on active dialogue NPC
    if (state.activeDialogueNpcId) {
      const npc = state.npcs.find(n => n.id === state.activeDialogueNpcId)
      if (npc) {
        highlight.clear()
        highlight.circle(npc.position.x, npc.position.y, npc.interactionRadius + 4)
          .stroke({ color: 0xffff00, width: 2 })
        highlight.visible = true
      }
    } else {
      highlight.visible = false
    }
  }

  return { update }
}
