import { Application, Container, Graphics, Text } from 'pixi.js'
import type { GameState } from '../logic/state'
import { PLAYER_MAX_HP, CHAZ_MAX_HP } from '../logic/battle'

const W = 1280
const H = 720

/**
 * Full-screen battle overlay — shown when state.status === 'battle' | 'lost'.
 * Hides the office world; renders a classic RPG battle screen.
 * No game logic lives here — all values read from GameState.
 */
export const createBattleView = (app: Application) => {
  const container = new Container()
  container.zIndex = 400   // above world (0), HUD (200), dialogue (300)
  container.visible = false
  app.stage.addChild(container)

  // ------------------------------------------------------------------ background
  const bg = new Graphics()
  bg.rect(0, 0, W, H).fill(0x0d0d1a)
  container.addChild(bg)

  // ---- arena ground strip ----
  const ground = new Graphics()
  ground.rect(0, H * 0.6, W, H * 0.4).fill(0x1a1a2e)
  container.addChild(ground)

  // ------------------------------------------------------------------ player sprite (left)
  const playerSprite = new Graphics()
  playerSprite.rect(0, 0, 80, 100).fill(0x3a7bd5)
  playerSprite.position.set(200, H * 0.6 - 100)
  container.addChild(playerSprite)

  const playerLabel = new Text({
    text: 'YOU',
    style: { fill: '#3a7bd5', fontSize: 14, fontWeight: 'bold' },
  })
  playerLabel.anchor.set(0.5, 0)
  playerLabel.position.set(240, H * 0.6 - 120)
  container.addChild(playerLabel)

  // ------------------------------------------------------------------ Chaz sprite (right)
  const chazSprite = new Graphics()
  chazSprite.rect(0, 0, 100, 130).fill(0xffd700)
  chazSprite.position.set(W - 320, H * 0.6 - 130)
  container.addChild(chazSprite)

  const chazLabel = new Text({
    text: 'CHAZ — CEO',
    style: { fill: '#ffd700', fontSize: 14, fontWeight: 'bold' },
  })
  chazLabel.anchor.set(0.5, 0)
  chazLabel.position.set(W - 270, H * 0.6 - 150)
  container.addChild(chazLabel)

  // ------------------------------------------------------------------ HP bars
  const HP_BAR_W = 300
  const HP_BAR_H = 18

  // Player HP
  const playerHpBg = new Graphics()
  playerHpBg.rect(160, H * 0.6 + 16, HP_BAR_W, HP_BAR_H).fill(0x333333)
  container.addChild(playerHpBg)

  const playerHpFill = new Graphics()
  container.addChild(playerHpFill)

  const playerHpText = new Text({
    text: `HP: ${PLAYER_MAX_HP} / ${PLAYER_MAX_HP}`,
    style: { fill: '#ffffff', fontSize: 13 },
  })
  playerHpText.position.set(160, H * 0.6 + 38)
  container.addChild(playerHpText)

  // Chaz HP
  const chazHpBg = new Graphics()
  chazHpBg.rect(W - 460, H * 0.6 + 16, HP_BAR_W, HP_BAR_H).fill(0x333333)
  container.addChild(chazHpBg)

  const chazHpFill = new Graphics()
  container.addChild(chazHpFill)

  const chazHpText = new Text({
    text: `HP: ${CHAZ_MAX_HP} / ${CHAZ_MAX_HP}`,
    style: { fill: '#ffd700', fontSize: 13 },
  })
  chazHpText.position.set(W - 460, H * 0.6 + 38)
  container.addChild(chazHpText)

  // ------------------------------------------------------------------ battle log
  const logPanel = new Graphics()
  logPanel.rect(W / 2 - 300, H * 0.6 + 8, 600, 60).fill({ color: 0x000000, alpha: 0.6 })
  container.addChild(logPanel)

  const logText = new Text({
    text: '',
    style: {
      fill: '#ffffff',
      fontSize: 14,
      wordWrap: true,
      wordWrapWidth: 580,
      align: 'center',
    },
  })
  logText.anchor.set(0.5, 0.5)
  logText.position.set(W / 2, H * 0.6 + 38)
  container.addChild(logText)

  // ------------------------------------------------------------------ action menu
  const menuY = H * 0.6 + 82

  const menuBg = new Graphics()
  menuBg.rect(W / 2 - 320, menuY, 640, 52).fill({ color: 0x111111, alpha: 0.9 })
  container.addChild(menuBg)

  const menuText = new Text({
    text: '[1] ATTACK    [2] HEAL    [3] DODGE',
    style: { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', letterSpacing: 2 },
  })
  menuText.anchor.set(0.5, 0.5)
  menuText.position.set(W / 2, menuY + 26)
  container.addChild(menuText)

  // ------------------------------------------------------------------ title banner
  const titleText = new Text({
    text: 'BOSS BATTLE',
    style: { fill: '#ff4444', fontSize: 28, fontWeight: 'bold', letterSpacing: 4 },
  })
  titleText.anchor.set(0.5, 0)
  titleText.position.set(W / 2, 20)
  container.addChild(titleText)

  // ------------------------------------------------------------------ game-over overlay
  const gameOverContainer = new Container()
  gameOverContainer.visible = false
  container.addChild(gameOverContainer)

  const gameOverBg = new Graphics()
  gameOverBg.rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.8 })
  gameOverContainer.addChild(gameOverBg)

  const gameOverText = new Text({
    text: 'YOU WERE RESTRUCTURED OUT',
    style: { fill: '#ff4444', fontSize: 42, fontWeight: 'bold', align: 'center' },
  })
  gameOverText.anchor.set(0.5)
  gameOverText.position.set(W / 2, H / 2 - 30)
  gameOverContainer.addChild(gameOverText)

  const gameOverSub = new Text({
    text: 'Chaz wins. Refresh to try again.',
    style: { fill: '#888888', fontSize: 20 },
  })
  gameOverSub.anchor.set(0.5)
  gameOverSub.position.set(W / 2, H / 2 + 30)
  gameOverContainer.addChild(gameOverSub)

  // ------------------------------------------------------------------ update
  const update = (state: GameState) => {
    const visible = state.status === 'battle' || state.status === 'lost'
    container.visible = visible
    if (!visible) return

    // Player HP bar
    const playerRatio = Math.max(0, state.playerHP / PLAYER_MAX_HP)
    const playerColor = playerRatio > 0.5 ? 0x4caf50 : playerRatio > 0.25 ? 0xff9800 : 0xff4444
    playerHpFill.clear()
    if (playerRatio > 0) {
      playerHpFill.rect(160, H * 0.6 + 16, HP_BAR_W * playerRatio, HP_BAR_H).fill(playerColor)
    }
    playerHpText.text = `HP: ${Math.max(0, state.playerHP)} / ${PLAYER_MAX_HP}`

    // Chaz HP bar
    const chazRatio = Math.max(0, state.chazHP / CHAZ_MAX_HP)
    chazHpFill.clear()
    if (chazRatio > 0) {
      chazHpFill.rect(W - 460, H * 0.6 + 16, HP_BAR_W * chazRatio, HP_BAR_H).fill(0xffd700)
    }
    chazHpText.text = `HP: ${Math.max(0, state.chazHP)} / ${CHAZ_MAX_HP}`

    // Battle log
    logText.text = state.lastBattleMessage

    // Game-over overlay
    gameOverContainer.visible = state.status === 'lost'
  }

  return { update }
}
