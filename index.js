class GridSquare {
  /**
   * @param {number} size
   * @param {number} xOffset
   * @param {Game['_getCharToPlay']} getCharToPlay
   * @param {Game['_onSquareChanged']} notifySquareChanged
   */
  constructor(size, xOffset, getCharToPlay, notifySquareChanged) {
    this.size = size
    /** @type {Game['_getCharToPlay']} */
    this.getCharToPlay = getCharToPlay
    /** @type {Game['_onSquareChanged']} */
    this.notifySquareChanged = notifySquareChanged
    /** @type {'' | ReturnType<getCharToPlay>} */
    this.char = ''
    this.html = document.createElement('div')
    this.html.className = 'square'
    this.html.style.display = 'inline-block'
    this.html.style.width = this.size
    this.html.style.height = this.size
    this.html.style.position = 'absolute'
    this.html.style.left = xOffset
    this.reset()
  }

  reset() {
    this.html.innerHTML = this.char = ''
    this.html.onclick = () => {
      this.html.innerHTML = this.char = this.getCharToPlay()
      this.html.onclick = null
      this.notifySquareChanged(this.char)
    }
  }
}

class Canvas {
  DIVIDER_WIDTH = 2

  /**
   * @param {Game['_getCharToPlay']} getCharToPlay
   * @param {Game['_onSquareChanged']} notifySquareChanged
   */
  constructor(getCharToPlay, notifySquareChanged) {
    /** @type {Game['_getCharToPlay']} */
    this.getCharToPlay = getCharToPlay
    /** @type {Game['_onSquareChanged']} */
    this.notifySquareChanged = notifySquareChanged
    /** @type {number} */
    this.width = Math.min(window.innerWidth, window.innerHeight)
    /** @type {number} */
    this.height = this.width
    /** @type {number} */
    this.xOffset = (window.innerWidth - this.width) / 2
    /** @type {number} */
    this.yOffset = (window.innerHeight - this.height) / 2
    /** @type {HTMLDivElement} */
    this.html = this._initCanvas()
    /** @type {GridSquare[][]} */
    this.grid = this._initSquares()
  }

  /**
   * @returns {HTMLDivElement}
   */
  _initCanvas() {
    const canvas = document.createElement('div')
    canvas.id = 'canvas'
    canvas.style.display = 'inline-block'
    canvas.style.width = this.width
    canvas.style.height = this.height
    canvas.style.position = 'absolute'
    canvas.style.left = this.xOffset
    canvas.style.top = this.yOffset
    return canvas
  }

  /**
   * @returns {GridSquare[][]}
   */
  _initSquares() {
    const squareSize = (this.width - this.DIVIDER_WIDTH * 2) / 3
    const grid = []
    let rowOffset = 0
    for (let row = 1; row <= 3; ++row) {
      const gridRow = []
      const rowHTML = document.createElement('div')
      rowHTML.style.display = 'inline-block'
      rowHTML.style.height = squareSize
      rowHTML.style.width = this.width
      rowHTML.style.position = 'absolute'
      rowHTML.style.top = rowOffset
      let colOffset = 0
      for (let col = 1; col <= 3; ++col) {
        const square = new GridSquare(
          squareSize,
          colOffset,
          this.getCharToPlay,
          this.notifySquareChanged
        )
        gridRow.push(square)
        rowHTML.appendChild(square.html)
        if (col != 3) {
          rowHTML.appendChild(
            this._newDivider(
              this.DIVIDER_WIDTH,
              squareSize,
              colOffset + squareSize,
              0
            )
          )
        }
        colOffset += squareSize + this.DIVIDER_WIDTH
      }
      this.html.appendChild(rowHTML)
      if (row != 3) {
        this.html.appendChild(
          this._newDivider(
            this.width,
            this.DIVIDER_WIDTH,
            0,
            rowOffset + squareSize
          )
        )
      }
      grid.push(gridRow)
      rowOffset += squareSize + this.DIVIDER_WIDTH
    }
    return grid
  }

  _newDivider(width, height, xOffset, yOffset) {
    const elem = document.createElement('div')
    elem.className = 'divider'
    elem.style.display = 'inline-block'
    elem.style.width = width
    elem.style.height = height
    elem.style.position = 'absolute'
    elem.style.left = xOffset
    elem.style.top = yOffset
    return elem
  }

  reset() {
    for (const gridRow of this.grid) {
      for (const square of gridRow) {
        square.reset()
      }
    }
  }
}

class Game {
  constructor() {
    /** @type {HTMLBodyElement} */
    this.body = document.body
    /** @type {'x' | 'o'} */
    this.charToPlay = this._randomChar()
    /** @type {Canvas} */
    this.canvas = new Canvas(
      () => this._getCharToPlay(),
      newChar => this._onSquareChanged(newChar)
    )
    this.reset(false)
    this._setConfirmReset('Start game?')
  }

  _randomChar() {
    return Math.random() >= 0.5 ? 'o' : 'x'
  }

  /**
   * @returns {'x' | 'o'}
   */
  _getCharToPlay() {
    const char = this.charToPlay
    this.charToPlay = char == 'x' ? 'o' : 'x'
    return char
  }

  /**
   * @param {ReturnType<Game['_getCharToPlay']>} newChar
   * @returns
   */
  _onSquareChanged(newChar) {
    const grid = this.canvas.grid
    const possibleWins = [
      // [row-i, col-i]
      // 3 horizontal
      [
        [0, 0],
        [0, 1],
        [0, 2],
      ],
      [
        [1, 0],
        [1, 1],
        [1, 2],
      ],
      [
        [2, 0],
        [2, 1],
        [2, 2],
      ],
      // 3 vertical
      [
        [0, 0],
        [1, 0],
        [2, 0],
      ],
      [
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      [
        [0, 2],
        [1, 2],
        [2, 2],
      ],
      // 3 diag
      [
        [0, 0],
        [1, 1],
        [2, 2],
      ],
      [
        [0, 2],
        [1, 1],
        [2, 0],
      ],
    ]
    let win = false
    for (const combo of possibleWins) {
      win = true // we will confirm this below
      let prev
      for (const cords of combo) {
        // cords = [row-i, col-i]
        const char = grid[cords[0]][cords[1]].char
        if (char == '' || (prev != undefined && char != prev)) {
          win = false
          break // not 3 in a row
        }
        prev = char
      }
      if (win) break
    }
    const gridFull = grid.every(gridRow => gridRow.every(square => square.char != ''))
    if (win || gridFull) {
      this._setConfirmReset('Restart game?')
      setTimeout(() => {
        if (win) alert(`${newChar} won the game! 🎉`)
        else alert('Nobody won :(')
      })
      return
    }
  }

  _setConfirmReset(prompt) {
    for (const gridRow of this.canvas.grid) {
      for (const square of gridRow) {
        square.html.onclick = () => {
          const restart = confirm(prompt)
          if (restart) this.reset(true)
        }
      }
    }
  }

  reset(start = false) {
    this.charToPlay = this._randomChar()
    while (this.body.lastChild) {
      this.body.removeChild(this.body.lastChild)
    }
    this.canvas.reset()
    this.body.appendChild(this.canvas.html)
    if (start) alert(`Flipping coin.... Done. ${this.charToPlay} plays first`)
  }
}
