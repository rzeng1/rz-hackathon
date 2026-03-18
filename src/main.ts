import { Application } from 'pixi.js'

async function main() {
  const app = new Application()

  await app.init({
    background: '#1a1a2e',
    resizeTo: window,
  })

  document.body.appendChild(app.canvas)
}

main()
