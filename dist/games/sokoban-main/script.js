import { directions, keys } from './constants.js'
import Sokoban from './Sokoban.js'

// init
const sokoban = new Sokoban({ level: 1 })
sokoban.render({ restart: true })

function move(direction) {
  const playerCoords = sokoban.findPlayerCoords()

  sokoban.move(playerCoords, direction)
  sokoban.render()
}

// Keyboard controls
document.addEventListener('keydown', (event) => {
  let direction

  switch (event.key) {
    case keys.up:
    case keys.w:
      direction = directions.up
      break
    case keys.down:
    case keys.s:
      direction = directions.down
      break
    case keys.left:
    case keys.a:
      direction = directions.left
      break
    case keys.right:
    case keys.d:
      direction = directions.right
      break
    default:
      return
  }

  event.preventDefault()
  move(direction)
})

document.querySelector('#restart').addEventListener('click', () => {
  sokoban.render({ restart: true })
})

document.querySelectorAll('[data-direction]').forEach((button) => {
  button.addEventListener('click', () => move(directions[button.dataset.direction]))
})
