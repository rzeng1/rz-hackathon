import { Application, Container, Graphics, Text } from 'pixi.js'
import type { GameState } from '../logic/state'
import { INITIAL_STATE } from '../logic/state'
import { getItemQuantity } from '../logic/inventory'
import { XP_TABLE } from '../logic/xp'
import { getStaticObstacles } from '../logic/world'

const BAR_WIDTH = 200
const BAR_HEIGHT = 12

/**
 * Non-diegetic UI overlay — XP bar, level badge, drink counter.
 * Also owns the debug overlay (\ key toggle).
 * No game logic lives here; all values come from GameState or pure logic calls.
 */
export const createHud = (app: Application) => {
  let debugEnabled = false

  // ------------------------------------------------------------------ HUD container
  const hud = new Container()
  hud.zIndex = 200
  app.stage.addChild(hud)

  const xpLabel = new Text({ text: 'XP: 0', style: { fill: '#ffffff', fontSize: 16 } })
  xpLabel.position.set(16, 16)
  hud.addChild(xpLabel)

  const levelLabel = new Text({ text: 'Lv 1', style: { fill: '#ffd700', fontSize: 20, fontWeight: 'bold' } })
  levelLabel.position.set(16, 40)
  hud.addChild(levelLabel)

  // XP bar background
  const barBg = new Graphics()
  barBg.rect(16, 68, BAR_WIDTH, BAR_HEIGHT).fill(0x444444)
  hud.addChild(barBg)

  // XP bar fill — redrawn each update
  const barFill = new Graphics()
  hud.addChild(barFill)

  const drinkLabel = new Text({ text: '☕ x0', style: { fill: '#00e5ff', fontSize: 16 } })
  drinkLabel.position.set(16, 88)
  hud.addChild(drinkLabel)

  // Debug mode indicator (top-right)
  const debugLabel = new Text({ text: 'DEBUG ON', style: { fill: '#ff4444', fontSize: 13 } })
  debugLabel.position.set(1280 - 90, 16)
  debugLabel.visible = false
  hud.addChild(debugLabel)

  // ------------------------------------------------------------------ debug overlay
  // Created once, toggled via visible — never recreated per frame.
  const debugContainer = new Container()
  debugContainer.zIndex = 150
  debugContainer.visible = false
  app.stage.addChild(debugContainer)

  // AABB collision boxes in semi-transparent red
  const debugCollision = new Graphics()
  for (const r of getStaticObstacles()) {
    debugCollision.rect(r.x, r.y, r.width, r.height).fill({ color: 0xff0000, alpha: 0.35 })
  }
  debugContainer.addChild(debugCollision)

  // NPC interaction radii in semi-transparent yellow
  const debugRadii = new Graphics()
  for (const npc of INITIAL_STATE.npcs) {
    debugRadii.circle(npc.position.x, npc.position.y, npc.interactionRadius)
      .stroke({ color: 0xffff00, width: 1 })
  }
  debugContainer.addChild(debugRadii)

  // ------------------------------------------------------------------ debug key listener
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Backslash') {
      debugEnabled = !debugEnabled
      debugContainer.visible = debugEnabled
      debugLabel.visible = debugEnabled
    }
  }
  window.addEventListener('keydown', onKeyDown)

  // ------------------------------------------------------------------ update
  const update = (state: GameState) => {
    xpLabel.text = `XP: ${state.player.xp}`
    levelLabel.text = `Lv ${state.player.level}`

    // XP progress bar
    const lvl = state.player.level
    const xpFloor = XP_TABLE[lvl - 1] ?? 0
    const xpCeil  = XP_TABLE[lvl]     ?? XP_TABLE[XP_TABLE.length - 1]
    const progress = lvl >= 5 ? 1 : (state.player.xp - xpFloor) / (xpCeil - xpFloor)
    const fillW = Math.max(0, Math.floor(BAR_WIDTH * progress))

    barFill.clear()
    if (fillW > 0) barFill.rect(16, 68, fillW, BAR_HEIGHT).fill(0x4caf50)

    const drinks = getItemQuantity(state.inventory, 'energy-drink')
    drinkLabel.text = `☕ x${drinks}`
  }

  const destroy = () => window.removeEventListener('keydown', onKeyDown)

  return { update, destroy }
}
