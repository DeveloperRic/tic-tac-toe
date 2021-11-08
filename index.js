class AgentTree {
  /**
   * @param {GridSquare[][]} grid
   * @param {Game['_searchForWins']} searchForWins
   * @param {undefined | [number, number]} prevPlay
   */
  constructor(grid, searchForWins, prevPlay) {
    /** @type {GridSquare[][]} */
    this.grid = grid
    /** @type {Game['_searchForWins']} */
    this.searchForWins = searchForWins
    /** @type {undefined | [number, number]} */
    this.prevPlay = prevPlay
    /** @type {undefined | [number, number]} */
    this.nextPlay = undefined
    /** @type {AgentTree[]} */
    this.children = []
    /** @type {number} */
    this.alpha = Number.MIN_VALUE
    /** @type {number} */
    this.beta = Number.MAX_VALUE
  }
}

class Agent {
  /**
   * @param {ReturnType<Game['_getCharToPlay']>} agentChar
   * @param {Game['POSSIBLE_WINS']} possibleWins
   * @param {Game['_searchForWins']} searchForWins
   */
  constructor(agentChar, possibleWins, searchForWins) {
    /** @type {ReturnType<Game['_getCharToPlay']>} */
    this.agentChar = agentChar
    /** @type {ReturnType<Game['_getCharToPlay']>} */
    this.opponentChar = this.agentChar == 'x' ? 'o' : 'x'
    /** @type {Game['POSSIBLE_WINS']} */
    this.possibleWins = possibleWins
    /** @type {Game['_searchForWins']} */
    this.searchForWins = searchForWins
  }

  /**
   * @param {GridSquare[][]} grid
   * @returns {GridSquare}
   */
  play(grid) {
    const tree = new AgentTree(grid, this.searchForWins)
    this._populateTree(tree, this.agentChar)
    this._pruneTree(tree, null, true)
    const squareToPlayIn = grid[tree.nextPlay[0]][tree.nextPlay[1]]
    squareToPlayIn.play(this.agentChar)
  }

  /**
   * @param {AgentTree} tree
   * @param {ReturnType<Game['_getCharToPlay']>} nextPlayer
   */
  _populateTree(tree, nextPlayer) {
    /** @type {[number, number, GridSquare][]} */
    const playableSquares = []
    if (this.searchForWins(tree.grid).length == 0) {
      for (let rowI = 0; rowI < tree.grid.length; ++rowI) {
        const row = tree.grid[rowI]
        for (let colI = 0; colI < row.length; ++colI) {
          const square = row[colI]
          if (square.char == '') {
            playableSquares.push([rowI, colI, square])
          }
        }
      }
    }
    for (const [rowI, colI, square] of playableSquares) {
      const newGrid = tree.grid.map(row =>
        row.map(sq => {
          if (sq != square) return sq
          return {
            ...sq,
            char: nextPlayer,
          }
        })
      )
      const child = new AgentTree(newGrid, this.searchForWins, [rowI, colI])
      this._populateTree(child, nextPlayer == 'x' ? 'o' : 'x')
      tree.children.push(child)
    }
  }

  /**
   * @param {AgentTree} tree
   * @param {AgentTree} parent
   * @param {boolean} minimise
   */
  _pruneTree(tree, parent, minimise) {
    if (tree.children.length == 0) {
      tree.alpha = tree.beta = this.getScore(tree, minimise)
      tree.nextPlay = tree.prevPlay
      return
    }
    for (const subtree of tree.children) {
      this._pruneTree(subtree, tree, !minimise)
      if (minimise) {
        const childIsBetter = subtree.alpha < tree.beta
        const childIsEqual = subtree.alpha == tree.beta
        if (childIsBetter || (childIsEqual && Math.random() >= 0.5)) {
          tree.beta = subtree.alpha
          tree.nextPlay = subtree.prevPlay
        }
      } else {
        const childIsBetter = subtree.beta > tree.alpha
        const childIsEqual = subtree.beta == tree.alpha
        if (childIsBetter || (childIsEqual && Math.random() >= 0.5)) {
          tree.alpha = subtree.beta
          tree.nextPlay = subtree.prevPlay
        }
      }
      if (parent) {
        if (minimise) {
          if (tree.beta <= parent.alpha) break
        } else {
          if (tree.alpha >= parent.beta) break
        }
      }
    }
    if (minimise) tree.alpha = tree.beta
    else tree.beta = tree.alpha
  }

  /**
   * @param {AgentTree} tree
   * @returns {number}
   */
  getScore(tree, isAgentsTurn) {
    let xScore = 0
    let oScore = 0
    for (const combo of this.possibleWins) {
      const counts = combo.reduce(
        (counts, loc) => {
          const char = tree.grid[loc[0]][loc[1]].char
          if (char != '') counts[char]++
          return counts
        },
        { x: 0, o: 0 }
      )
      if (counts.x > 0 && counts.o == 0) xScore += counts.x
      if (counts.x == 3) xScore += 2
      if (counts.o > 0 && counts.x == 0) oScore += counts.o
      if (counts.o == 3) oScore += 2
    }
    return this.opponentChar == 'x' ? xScore : oScore
  }
}

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
    this.html.onclick = () => this.play(this.getCharToPlay())
  }

  /**
   * @param {ReturnType<GridSquare['getCharToPlay']>} char
   */
  play(char) {
    this.html.innerHTML = this.char = char
    this.html.onclick = null
    this.notifySquareChanged(this.char)
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
  POSSIBLE_WINS = [
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
    /** @type {Agent} */
    this.agent = undefined
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
    return this.charToPlay
  }

  /**
   * @param {ReturnType<Game['_getCharToPlay']>} newChar
   * @returns
   */
  _onSquareChanged(newChar) {
    const grid = this.canvas.grid
    const wins = this._searchForWins(grid)
    const gridFull = grid.every(gridRow =>
      gridRow.every(square => square.char != '')
    )
    if (wins.length != 0 || gridFull) {
      this._setConfirmReset('Restart game?')
      setTimeout(() => {
        if (wins.length != 0) alert(`You ${newChar == this.charToPlay ? 'won' : 'lost'} the game 🤯😭`)
        else alert('Nobody won :(')
      })
      return
    }
    if (newChar != this.agent.agentChar) {
      this.agent.play(grid)
    }
  }

  /**
   * @param {GridSquare[][]} grid
   * @returns {typeof this.POSSIBLE_WINS} wins that were found
   */
  _searchForWins(grid) {
    return this.POSSIBLE_WINS.filter(combo => {
      let win = true // we will confirm this below
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
      return win
    })
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
    this.agent = new Agent(
      this.charToPlay == 'x' ? 'o' : 'x',
      this.POSSIBLE_WINS,
      grid => this._searchForWins(grid)
    )
    while (this.body.lastChild) {
      this.body.removeChild(this.body.lastChild)
    }
    this.canvas.reset()
    this.body.appendChild(this.canvas.html)
    if (start) alert(`Flipping coin.... Done. ${this.charToPlay} plays first`)
  }
}
