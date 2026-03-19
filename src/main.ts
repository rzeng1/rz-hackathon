import { Application } from 'pixi.js'
import { createActor } from 'xstate'
import { gameMachine } from './machines/gameMachine'
import { createRenderer } from './view/renderer'
import { createHud } from './view/hud'
import { createDialogue } from './view/dialogue'
import { createBattleView } from './view/battle'
import { createInput } from './view/input'

async function main() {
  // 1. PixiJS Application — fixed 1280×720 canvas
  const app = new Application()
  await app.init({
    width: 1280,
    height: 720,
    background: '#1a1a2e',
    antialias: true,
  })
  document.body.appendChild(app.canvas)

  app.stage.sortableChildren = true

  // 2. Machine actor
  const machine = createActor(gameMachine)

  // 3–6. View factories
  const renderer    = createRenderer(app)
  const hud         = createHud(app)
  const dialogue    = createDialogue(app)
  const battleView  = createBattleView(app)
  const input       = createInput(machine)

  // 7. Subscribe to all state changes → update all view layers
  machine.subscribe(snapshot => {
    const state = snapshot.context
    renderer.update(state)
    hud.update(state)
    dialogue.update(state)
    battleView.update(state)
  })

  // 8. Ticker → TICK only while playing (not during dialogue or battle)
  app.ticker.add(ticker => {
    const snapshot = machine.getSnapshot()
    if (snapshot.value !== 'playing') return

    const velocity = input.getVelocity(snapshot.context.player.speed)
    machine.send({ type: 'TICK', delta: ticker.deltaTime, velocity })
  })

  // 9. Start machine
  machine.start()
  machine.send({ type: 'START_GAME' })

  // HMR teardown
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      input.destroy()
      hud.destroy()
      app.destroy(true)
    })
  }
}

main()
