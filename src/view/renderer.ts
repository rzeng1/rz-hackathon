import { Application, Container, Graphics } from 'pixi.js'
import type { GameState } from '../logic/state'
import { INITIAL_STATE } from '../logic/state'
import { getStaticObstacles } from '../logic/world'

// NPC placeholder colours by id
const NPC_COLOURS: Record<string, number> = {
  ernesto: 0xff6b35,
  priya:   0x4caf50,
  jake:    0x4caf50,
  linda:   0x4caf50,
  ceo:     0xffd700,
}

const PLAYER_HALF = 12  // half of 24px player size

/**
 * Creates and owns all PixiJS display objects for the game world.
 * Exposes a single update(state) method — no logic lives here.
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

  // ------------------------------------------------------------------ player
  const playerGfx = new Graphics()
  playerGfx.rect(-PLAYER_HALF, -PLAYER_HALF, PLAYER_HALF * 2, PLAYER_HALF * 2).fill(0x3a7bd5)
  world.addChild(playerGfx)

  // ------------------------------------------------------------------ NPCs
  const npcGfxMap = new Map<string, Graphics>()
  for (const npc of INITIAL_STATE.npcs) {
    const g = new Graphics()
    g.rect(-PLAYER_HALF, -PLAYER_HALF, PLAYER_HALF * 2, PLAYER_HALF * 2)
      .fill(NPC_COLOURS[npc.id] ?? 0x999999)
    g.position.set(npc.position.x, npc.position.y)
    g.zIndex = npc.position.y
    world.addChild(g)
    npcGfxMap.set(npc.id, g)
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

  const winText = new Graphics()
  winOverlay.addChild(winText)
  // Text drawn as large centred message — uses a separate Text object
  // imported lazily to keep this factory free of Text until needed
  let winTextAdded = false

  // ------------------------------------------------------------------ update
  const update = (state: GameState) => {
    // Win screen
    if (state.status === 'won') {
      winOverlay.visible = true
      if (!winTextAdded) {
        // Inline import avoids circular deps; Text is only needed once
        import('pixi.js').then(({ Text }) => {
          const t = new Text({
            text: 'YOU ARE NOW CEO 🎉',
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

    // NPCs — Y-sort (positions are fixed; zIndex still needed for Y-sort correctness)
    for (const npc of state.npcs) {
      const g = npcGfxMap.get(npc.id)
      if (g) g.zIndex = npc.position.y
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
