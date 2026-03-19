import { Application, Container, Text } from 'pixi.js'

type FloatingEntry = {
  text: Text
  vy: number
  life: number
}

/**
 * Factory that manages floating "+N XP" labels that rise from a world position
 * and fade out over 60 frames.
 *
 * Usage:
 *   const ft = createFloatingTextSystem(app, worldContainer)
 *   ft.spawn('+15 XP', 640, 300)
 */
export const createFloatingTextSystem = (app: Application, world: Container) => {
  const entries: FloatingEntry[] = []

  app.ticker.add(() => {
    for (let i = entries.length - 1; i >= 0; i--) {
      const e = entries[i]
      e.text.y -= e.vy
      e.life--
      e.text.alpha = e.life / 60
      if (e.life <= 0) {
        world.removeChild(e.text)
        entries.splice(i, 1)
      }
    }
  })

  return {
    /**
     * Spawns a floating label at (x, y) in world coordinates.
     * The label drifts upward and fades over ~1 second.
     */
    spawn: (label: string, x: number, y: number) => {
      const t = new Text({
        text: label,
        style: { fill: '#ffd700', fontSize: 16, fontWeight: 'bold', dropShadow: true },
      })
      t.anchor.set(0.5, 1)
      t.position.set(x, y - 20)
      t.zIndex = 950
      world.addChild(t)
      entries.push({ text: t, vy: 1.0, life: 60 })
    },
  }
}
