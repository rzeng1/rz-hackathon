import { Application } from 'pixi.js'
import { playerEffectiveSpeed } from './logic/physics'
import { createActor } from 'xstate'
import { gameMachine } from './machines/gameMachine'
import { createRenderer } from './view/renderer'
import { createHud } from './view/hud'
import { createDialogue } from './view/dialogue'
import { createBattleView } from './view/battle'
import { createStatusBar } from './view/statusBar'
import { createInput } from './view/input'

const CANVAS_W = 1280
const CANVAS_H = 720

/**
 * Maintains a fixed 16:9 letterbox — scales the canvas element via CSS
 * to fill the viewport while preserving aspect ratio (black bars if needed).
 * The PixiJS render target stays at 1280×720 at all times.
 */
const applyLetterbox = (canvas: HTMLCanvasElement) => {
  const vw   = window.innerWidth
  const vh   = window.innerHeight
  const vRatio = vw / vh
  const tRatio = CANVAS_W / CANVAS_H  // 16:9

  let w: number, h: number
  if (vRatio > tRatio) {
    // Viewport wider than 16:9 → pillarbox (black bars left/right)
    h = vh
    w = Math.floor(h * tRatio)
  } else {
    // Viewport taller than 16:9 → letterbox (black bars top/bottom)
    w = vw
    h = Math.floor(w / tRatio)
  }

  canvas.style.width  = `${w}px`
  canvas.style.height = `${h}px`
}

async function main() {
  // 1. PixiJS Application — fixed 1280×720 internal resolution
  const app = new Application()
  await app.init({
    width:      CANVAS_W,
    height:     CANVAS_H,
    background: '#000000',
    antialias:  true,
  })
  document.body.appendChild(app.canvas)

  // 2. Letterbox — apply now and on every resize
  applyLetterbox(app.canvas)
  window.addEventListener('resize', () => applyLetterbox(app.canvas))

  app.stage.sortableChildren = true

  // 3. Machine actor
  const machine = createActor(gameMachine)

  // 4. View factories
  const renderer   = createRenderer(app)
  const hud        = createHud(app)
  const dialogue   = createDialogue(app)
  const battleView = createBattleView(app)
  const statusBar  = createStatusBar(app)
  const input      = createInput(machine)

  // 5. Subscribe to all state changes → update all view layers
  machine.subscribe(snapshot => {
    const state = snapshot.context
    renderer.update(state)
    hud.update(state)
    dialogue.update(state)
    battleView.update(state)
    statusBar.update(state)
  })

  // 6. Ticker → TICK only while playing (not during dialogue or battle)
  app.ticker.add(ticker => {
    const snapshot = machine.getSnapshot()
    if (snapshot.value !== 'playing') return

    const sprinting = input.isSprinting() && snapshot.context.unlockedPerks.includes('sprint')
    const velocity  = input.getVelocity(playerEffectiveSpeed(snapshot.context.player, sprinting))
    machine.send({ type: 'TICK', delta: ticker.deltaTime, velocity, isSprinting: sprinting })
  })

  // 7. Start machine
  machine.start()
  machine.send({ type: 'START_GAME' })

  // HMR teardown
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      window.removeEventListener('resize', () => applyLetterbox(app.canvas))
      input.destroy()
      hud.destroy()
      app.destroy(true)
    })
  }
}

main()
