import { Application, Container, Graphics, Text } from 'pixi.js'
import type { GameState } from '../logic/state'

export const STATUS_BAR_HEIGHT = 40

/**
 * Persistent top status bar — "Roots AI Office" branding + live game mode.
 * Clock and coffee counter have moved to the HUD right panel (hud.ts).
 * Lives at zIndex 250 (above HUD at 220) to always sit on top.
 */
export const createStatusBar = (app: Application) => {
  const container = new Container()
  container.zIndex = 250
  app.stage.addChild(container)

  // Dark semi-transparent background
  const bg = new Graphics()
  bg.rect(0, 0, 1280, STATUS_BAR_HEIGHT).fill({ color: 0x1a1a2e, alpha: 0.94 })
  container.addChild(bg)

  // Brand-blue accent line along the bottom edge
  const accent = new Graphics()
  accent.rect(0, STATUS_BAR_HEIGHT - 2, 1280, 2).fill({ color: 0x007AFF, alpha: 0.9 })
  container.addChild(accent)

  // Centred studio title
  const title = new Text({
    text: 'ROOTS AI OFFICE',
    style: { fill: '#007AFF', fontSize: 13, fontWeight: 'bold', letterSpacing: 4 },
  })
  title.anchor.set(0.5, 0.5)
  title.position.set(640, STATUS_BAR_HEIGHT / 2)
  container.addChild(title)

  // Right-side mode indicator — changes during battle/won/lost
  const modeLabel = new Text({
    text: '',
    style: { fill: '#ff9f0a', fontSize: 12, fontWeight: 'bold' },
  })
  modeLabel.anchor.set(1, 0.5)
  modeLabel.position.set(1280 - 16, STATUS_BAR_HEIGHT / 2)
  container.addChild(modeLabel)

  const MODE_TEXT: Partial<Record<string, string>> = {
    battle: '⚔ BATTLE MODE',
    won:    '🏆 CEO ACHIEVED',
    lost:   '💀 GAME OVER',
  }

  const update = (state: GameState) => {
    modeLabel.text = MODE_TEXT[state.status] ?? ''
  }

  return { update }
}
