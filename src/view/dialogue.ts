import { Application, Container, Graphics, Text } from 'pixi.js'
import type { GameState } from '../logic/state'
import { getDialogueText } from '../logic/dialogue'

const PANEL_X = 200
const PANEL_Y = 490
const PANEL_W = 880
const PANEL_H = 180

/**
 * Renders the dialogue popup when state.status === 'dialogue'.
 * Calls getDialogueText from src/logic/dialogue.ts for all strings —
 * never reads player.xp or inventory directly.
 */
export const createDialogue = (app: Application) => {
  const container = new Container()
  container.zIndex = 300
  container.visible = false
  app.stage.addChild(container)

  // Panel background
  const panel = new Graphics()
  panel.rect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H).fill({ color: 0x111111, alpha: 0.88 })
  container.addChild(panel)

  // NPC name header
  const nameText = new Text({
    text: '',
    style: { fill: '#ffd700', fontSize: 20, fontWeight: 'bold' },
  })
  nameText.position.set(PANEL_X + 20, PANEL_Y + 14)
  container.addChild(nameText)

  // Separator line
  const sep = new Graphics()
  sep.rect(PANEL_X + 20, PANEL_Y + 44, PANEL_W - 40, 1).fill(0x444444)
  container.addChild(sep)

  // Dialogue body
  const bodyText = new Text({
    text: '',
    style: {
      fill: '#ffffff',
      fontSize: 16,
      wordWrap: true,
      wordWrapWidth: PANEL_W - 40,
    },
  })
  bodyText.position.set(PANEL_X + 20, PANEL_Y + 54)
  container.addChild(bodyText)

  // Dismiss hint
  const hintText = new Text({
    text: 'Press E to dismiss',
    style: { fill: '#666666', fontSize: 13 },
  })
  hintText.position.set(PANEL_X + 20, PANEL_Y + PANEL_H - 24)
  container.addChild(hintText)

  // ------------------------------------------------------------------ update
  const update = (state: GameState) => {
    const active = state.status === 'dialogue' && state.activeDialogueNpcId !== null
    container.visible = active
    if (!active) return

    const npc = state.npcs.find(n => n.id === state.activeDialogueNpcId)
    if (!npc) return

    nameText.text = npc.displayName
    bodyText.text = getDialogueText(state.activeDialogueNpcId!, state.player, state.inventory)
  }

  return { update }
}
