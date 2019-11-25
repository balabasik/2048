// file://desktop/Users/va/Desktop/small_games/2048.html

const graphics = true;

const cellSize = 100;
const space = 6;
var board = [];
var stopped = false;
var boardSide = 100;
var maxScore = 0;
var curScore = 0;
var autoTimeout = undefined;
var autoActive = false;

const dirs = ["left", "right", "up", "down"];
const cellColors = {
  0: "rgb(215, 215, 215)",
  2: "rgb(252, 246, 240)",
  4: "rgb(254, 236, 200)",
  8: "rgb(252, 204, 121)",
  16: "rgb(250, 152, 81)",
  32: "rgb(250, 110, 79)",
  64: "rgb(252, 71, 66)",
  128: "rgb(255, 247, 135)",
  256: "rgb(255, 247, 135)",
  512: "rgb(249, 239, 111)",
  1024: "rgb(249, 237, 91)",
  2048: "rgb(244, 218, 49)",
  4096: "rgb(52, 52, 52)",
  8192: "rgb(34, 34, 34)",
  16384: "rgb(33, 33, 33)",
  32768: "rgb(15, 15, 15)",
  64556: "rgb(20, 20, 20)",
  129012: "rgb(0, 0, 0)"
};

if (graphics) {
  window.addEventListener("load", event => {
    updateMaxScore(0, 0);
    initBoard();
  });

  window.addEventListener("keydown", event => {
    switch (event.keyCode) {
      case 65: // a
        doTurn("left");
        break;
      case 68: // d
        doTurn("right");
        break;
      case 83: // s
        doTurn("down");
        break;
      case 87: // w
        doTurn("up");
        break;
      case 81: // q
        startStopAutoGame();
        break;
    }
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function updateCells() {
  if (!graphics) return;
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      let cell = document.getElementById("cell" + (i + 1) + "" + (j + 1));
      cell.style.width = cell.style.height = cellSize + "px";
      cell.style["background-color"] = cellColors[board[i][j]];
      cell.style.left = space + (space + cellSize) * j + "px";
      cell.style.top = space + (space + cellSize) * i + "px";
      cell.style.color = board[i][j] > 4 ? "white" : "rgb(46, 46, 46)";
      let innerCell = cell.childNodes[0];
      let fontSize = Math.floor(cellSize / 3);
      innerCell.style.top = Math.floor(cellSize / 2 - fontSize / 2) + "px";
      innerCell.style["font-size"] = fontSize + "px";
      innerCell.innerHTML = board[i][j] == 0 ? "" : board[i][j];
    }
  }
}

function initBoard() {
  stopped = false;
  curScore = 0;
  board = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
  if (graphics) {
    let boardEl = document.getElementById("board");
    boardEl.style["background-color"] = "rgb(135, 135, 135)";
    boardSide = 4 * cellSize + 5 * space;
    boardEl.style.width = boardEl.style.height = boardSide + "px";
    updateCells();
  }
  createElement();
  createElement();
}

function getFreeCells() {
  let cells = [];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (board[i][j] == 0) cells.push([i, j]);
    }
  }
  return cells;
}

function gameOver() {
  stopped = true;
  if (graphics) {
    let over = document.getElementById("gameOver");
    over.style["background-color"] = "rgba(159, 159, 159, 0.79)";
    let fontSize = Math.floor(boardSide / 9);
    over.style["font-size"] = fontSize + "px";
    over.style["padding-top"] = Math.floor(boardSide / 2 - fontSize / 2) + "px";
    over.innerHTML = "GAME OVER";
  }
}

function clearOver() {
  if (!graphics) return;
  let over = document.getElementById("gameOver");
  over.style["background-color"] = "";
  over.innerHTML = "";
}

function restart() {
  clearOver();
  initBoard();
}

async function checkGameOver() {
  let temp = copyArray(board);
  for (let i = 0; i < 4; i++) {
    if (moveBoard(temp, dirs[i])) return;
  }
  if (graphics && !autoActive) await sleep(100);
  gameOver();
}

function createElement() {
  let cells = getFreeCells();
  if (cells.length == 0) {
    gameOver();
    return;
  }

  let cell = cells[Math.floor(Math.random() * cells.length)];
  let value = Math.random() < 0.1 ? 4 : 2;
  board[cell[0]][cell[1]] = value;
  if (graphics) updateCells();
}

function getOppositeDir(dir) {
  if (dir == "left") return "right";
  if (dir == "right") return "left";
  if (dir == "up") return "down";
  if (dir == "down") return "up";
}

const rotMatrix = [
  [[0, 3], [1, 3], [2, 3], [3, 3]],
  [[0, 2], [1, 2], [2, 2], [3, 2]],
  [[0, 1], [1, 1], [2, 1], [3, 1]],
  [[0, 0], [1, 0], [2, 0], [3, 0]]
];

function copyArray(a) {
  return a.map(function(arr) {
    return arr.slice();
  });
}

function rotateClockwise(b) {
  let temp = copyArray(b);
  for (let i = 0; i < b.length; i++)
    for (let j = 0; j < b[0].length; j++)
      b[rotMatrix[i][j][0]][rotMatrix[i][j][1]] = temp[i][j];
}

function getNRot(dir) {
  if (dir == "left") return 1;
  else if (dir == "up") return 0;
  else if (dir == "right") return 3;
  else if (dir == "down") return 2;
}

function rotateBoard(b, nRot) {
  for (let i = 0; i < nRot; i++) rotateClockwise(b);
}

function moveRowUp(b, j, updateScore) {
  let ret = false;
  let merged = false;
  for (let i = 1; i < 4; i++) {
    if (b[i][j] == 0) continue;
    let empty = i;
    while (empty > 0 && b[empty - 1][j] == 0) empty--;
    // move tile
    if (
      b[empty][j] == 0 &&
      (empty == 0 || merged || b[empty - 1][j] != b[i][j])
    ) {
      b[empty][j] = b[i][j];
      b[i][j] = 0;
      merged = false;
      ret = true;
    } else if (!merged && b[empty - 1][j] == b[i][j]) {
      merged = true;
      b[empty - 1][j] = 2 * b[i][j];
      if (updateScore == true) curScore += b[i][j];
      b[i][j] = 0;
      ret = true;
    }
  }
  return ret;
}

function moveBoardUp(b, updateScore) {
  let ret = false;

  for (let j = 0; j < 4; j++) {
    let ret2 = moveRowUp(b, j, updateScore);
    ret = ret || ret2;
  }

  return ret;
}

// return true if at least one tile moved
function moveBoard(b, dir, updateScore) {
  let ret = false;

  // rotate board such that dir points up
  let nRot = getNRot(dir);
  rotateBoard(b, nRot);

  // perform move up
  ret = moveBoardUp(b, updateScore);

  // rotate board back
  rotateBoard(b, (4 - nRot) % 4);
  return ret;
}

function updateMaxScore(score1, score2) {
  let el = document.getElementById("maxScore");
  el.innerHTML = "MAX SCORE: " + score1 + "    CUR SCORE: " + score2;
}

async function doTurn(dir) {
  if (stopped) {
    if (!autoActive) restart();
    return true;
  }
  let ret = moveBoard(board, dir, true /*updateScore*/);
  if (ret) {
    if (curScore > maxScore) maxScore = curScore;
    if (graphics) {
      updateMaxScore(maxScore, curScore);
      updateCells();
      if (!autoActive) await sleep(50);
    }
    createElement();
    if (graphics) updateCells();
  }
  checkGameOver();
  return ret;
}

// magic function to compute next move
function getAutoMove(b) {
  return Math.floor(Math.random() * 4);
}

function startStopAutoGame() {
  autoActive = !autoActive;
  if (autoTimeout != undefined) clearTimeout(autoTimeout);
  if (autoActive) autoGame();
}

function autoGame() {
  if (!autoActive) return;
  // move in [0,1,2,3]
  let move = getAutoMove(board);
  let ret = doTurn(dirs[move]);
  if (!ret) {
    badMoves++;
    console.log(badMoves);
  } else badMoves = 0;
  // if game is stuck trying to do the bad move all the time we return game over.
  if (badMoves > 20) gameOver();
  autoTimeout = setTimeout(() => autoGame(), 20);
}
