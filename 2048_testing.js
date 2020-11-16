var reader = new FileReader();
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

window.addEventListener("load", event => {
  updateMaxScore(0, 0);
  initBoard();
});

window.addEventListener("keydown", event => {
  switch (event.keyCode) {
    case 65: // a
      doRealTurn(board, "left");
      break;
    case 68: // d
      doRealTurn(board, "right");
      break;
    case 83: // s
      doRealTurn(board, "down");
      break;
    case 87: // w
      doRealTurn(board, "up");
      break;
    case 81: // q
      startStopAutoGame();
      break;
    case 76: // l
      //loadModel();
      break;
  }
});

function getAvailableMoves(b) {
  let ret = [];
  for (let i = 0; i < 4; i++) {
    let temp = copyArray(b);
    if (moveBoard(temp, dirs[i]) != -1) ret.push(dirs[i]);
  }
  return ret;
}

function predictScore(b, resources) {
  let res0 = predictScore0(b);
  //console.log(res0, resources);
  if (resources < 4) return res0;

  // divide resources equally between available candidate moves
  let moves = getAvailableMoves(b);
  let ret = 0;
  if (moves.length == 0) {
    return 0;
  }
  let subRes = resources / 4; //moves.length;
  for (let move of moves) {
    let copy = copyArray(b);
    let score = doTurn(copy, move);
    if (score == -1) {
      console.log("predictScore2", "ERROR!! THIS SHOULD NEVER HAPPEN!!");
      continue;
    }
    let subPred = predictScore(copy, subRes);
    if (score + subPred > ret) {
      ret = subPred + score;
    }
    //console.log(score, subPred.bestScore);

    // TODO: add random override so that we can try to escape from local minimum!
  }

  return ret;
}

function getMove(b) {
  let bestScore = -1;
  let bestMove = "left";
  let moves = getAvailableMoves(b);
  //console.log(moves);
  if (moves.length == 0) return undefined;
  let resources = 1;
  for (let move of moves) {
    let copy = copyArray(b);
    let score = moveBoard(copy, move);
    let pred = predictScore(copy, resources);
    //  console.log(score + pred);
    if (score + pred > bestScore || bestScore == -1) {
      bestMove = move;
      bestScore = score + pred;
    }
  }
  return bestMove;
}

function predictScore0(b) {
  if (model == undefined) {
    //console.log("Using random model");
    return Math.random() * 100;
  }
  //console.log("Using model: ", model);
  //  let input = tf.tensor2d(b);
  let input = tf.tensor4d([b.map(row => row.map(el => [el]))]);
  //console.log(input);
  return model
    .predict(input)
    .asScalar()
    .dataSync()[0];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function updateCells() {
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
  //board = [[0, 0, 32, 64], [0, 0, 16, 128], [0, 0, 8, 256], [0, 2, 4, 512]];
  //board = [[2, 16, 2, 16], [8, 32, 16, 2], [16, 64, 8, 16], [0, 4, 16, 2]];
  //board = [[2, 32, 64, 32], [2, 64, 32, 64], [4, 32, 64, 32], [8, 64, 32, 64]];
  let boardEl = document.getElementById("board");
  boardEl.style["background-color"] = "rgb(135, 135, 135)";
  boardSide = 4 * cellSize + 5 * space;
  boardEl.style.width = boardEl.style.height = boardSide + "px";
  updateCells();

  createElement(board);
  createElement(board);
  updateCells();
}

function getFreeCells(b) {
  let cells = [];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (b[i][j] == 0) cells.push([i, j]);
    }
  }
  return cells;
}

function gameOver() {
  stopped = true;
  clearTimeout(autoTimeout);
  autoActive = false;
  console.log("game over");
  let over = document.getElementById("gameOver");
  over.style.opacity = 1;
}

function clearOver() {
  let over = document.getElementById("gameOver");
  over.style.opacity = 0;
}

function restart() {
  clearOver();
  initBoard();
}

function createElement(b) {
  let cells = getFreeCells(b);
  if (cells.length == 0) {
    gameOver();
    return;
  }

  // FIXME: NOTE THIS IS JUST FOR TESTING!!!!
  // UNCOMMENT THE RANDOM CREATION!!!
  //let cell = cells[Math.floor(Math.random() * cells.length)];
  //let value = Math.random() < 0.1 ? 4 : 2;
  let cell = cells[0];
  let value = 2;
  b[cell[0]][cell[1]] = value;
}

function createElementReal(b) {
  let cells = getFreeCells(b);
  if (cells.length == 0) {
    gameOver();
    return;
  }

  // FIXME: NOTE THIS IS JUST FOR TESTING!!!!
  // UNCOMMENT THE RANDOM CREATION!!!
  let cell = cells[Math.floor(Math.random() * cells.length)];
  //let value = Math.random() < 0.1 ? 4 : 2;
  //let cell = cells[0];
  let value = 2;
  b[cell[0]][cell[1]] = value;
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

function flattenBoard(b) {
  let ret = [];
  for (let i = 0; i < b.length; i++)
    for (let j = 0; j < b[0].length; j++) ret.push(b[i][j]);
  return ret;
}

function moveColUp(b, j) {
  let score = 0;
  let moved = false;
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
      moved = true;
    } else if (!merged && empty > 0 && b[empty - 1][j] == b[i][j]) {
      merged = true;
      b[empty - 1][j] = 2 * b[i][j];
      score += b[i][j];
      b[i][j] = 0;
      moved = true;
    }
  }
  return moved ? score : -1;
}

function moveRowLeft(b, i) {
  let score = 0;
  let moved = false;
  let merged = false;
  for (let j = 1; j < 4; j++) {
    if (b[i][j] == 0) continue;
    let empty = j;
    while (empty > 0 && b[i][empty - 1] == 0) empty--;
    // move tile
    if (
      b[i][empty] == 0 &&
      (empty == 0 || merged || b[i][empty - 1] != b[i][j])
    ) {
      b[i][empty] = b[i][j];
      b[i][j] = 0;
      merged = false;
      moved = true;
    } else if (!merged && empty > 0 && b[i][empty - 1] == b[i][j]) {
      merged = true;
      b[i][empty - 1] = 2 * b[i][j];
      score += b[i][j];
      b[i][j] = 0;
      moved = true;
    }
  }
  return moved ? score : -1;
}

function moveColDown(b, j) {
  let score = 0;
  let moved = false;
  let merged = false;
  for (let i = 2; i >= 0; i--) {
    if (b[i][j] == 0) continue;
    let empty = i;
    while (empty < 3 && b[empty + 1][j] == 0) empty++;
    // move tile
    if (
      b[empty][j] == 0 &&
      (empty == 3 || merged || b[empty + 1][j] != b[i][j])
    ) {
      b[empty][j] = b[i][j];
      b[i][j] = 0;
      merged = false;
      moved = true;
    } else if (!merged && empty < 3 && b[empty + 1][j] == b[i][j]) {
      merged = true;
      b[empty + 1][j] = 2 * b[i][j];
      score += b[i][j];
      b[i][j] = 0;
      moved = true;
    }
  }
  return moved ? score : -1;
}

function moveRowRight(b, i) {
  let score = 0;
  let moved = false;
  let merged = false;
  for (let j = 2; j >= 0; j--) {
    if (b[i][j] == 0) continue;
    let empty = j;
    while (empty < 3 && b[i][empty + 1] == 0) empty++;
    // move tile
    if (
      b[i][empty] == 0 &&
      (empty == 3 || merged || b[i][empty + 1] != b[i][j])
    ) {
      b[i][empty] = b[i][j];
      b[i][j] = 0;
      merged = false;
      moved = true;
    } else if (!merged && empty < 3 && b[i][empty + 1] == b[i][j]) {
      merged = true;
      b[i][empty + 1] = 2 * b[i][j];
      score += b[i][j];
      b[i][j] = 0;
      moved = true;
    }
  }
  return moved ? score : -1;
}

function moveBoardUp(b) {
  let moved = false;
  let score = 0;
  for (let j = 0; j < 4; j++) {
    let addScore = moveColUp(b, j);
    if (addScore != -1) {
      moved = true;
      score += addScore;
    }
  }
  return moved ? score : -1;
}

function moveBoardDown(b) {
  let moved = false;
  let score = 0;
  for (let j = 0; j < 4; j++) {
    let addScore = moveColDown(b, j);
    if (addScore != -1) {
      moved = true;
      score += addScore;
    }
  }
  return moved ? score : -1;
}

function moveBoardLeft(b) {
  let moved = false;
  let score = 0;
  for (let i = 0; i < 4; i++) {
    let addScore = moveRowLeft(b, i);
    if (addScore != -1) {
      moved = true;
      score += addScore;
    }
  }
  return moved ? score : -1;
}

function moveBoardRight(b) {
  let moved = false;
  let score = 0;
  for (let i = 0; i < 4; i++) {
    let addScore = moveRowRight(b, i);
    if (addScore != -1) {
      moved = true;
      score += addScore;
    }
  }
  return moved ? score : -1;
}

// return extra score that you get during move, or -1, if move was bad
function moveBoardOld(b, dir) {
  let nRot = getNRot(dir);
  rotateBoard(b, nRot);
  let ret = moveBoardUp(b);
  rotateBoard(b, (4 - nRot) % 4);
  return ret;
}

function moveBoard(b, dir) {
  if (dir == "left") return moveBoardLeft(b);
  if (dir == "right") return moveBoardRight(b);
  if (dir == "up") return moveBoardUp(b);
  //if (dir == "down")
  return moveBoardDown(b);
}

function updateMaxScore(score1, score2) {
  let el = document.getElementById("maxScore");
  el.innerHTML = "MAX SCORE: " + score1 + "    CUR SCORE: " + score2;
}

function doTurn(b, dir) {
  let ret = moveBoard(b, dir);
  if (ret != -1) createElement(b);
  return ret;
}

var model = undefined;
async function loadModel() {
  //model = await tf.loadLayersModel("localstorage://latest_model");
  let files = document.getElementById("uploadModel").files;
  if (files.length != 2) {
    console.log("Error: Please select exactly 2 files");
    return;
  }
  console.log(files);
  let jsonFile = undefined;
  let binFile = undefined;

  for (let file of files) {
    if (file.name.includes(".json")) jsonFile = file;
    else if (file.name.includes(".bin")) binFile = file;
  }

  if (binFile == undefined || jsonFile == undefined) {
    console.log("Error: Please select one bin and one json file.");
    return;
  }

  model = await tf.loadLayersModel(tf.io.browserFiles([jsonFile, binFile]));
  console.log(model);
}

// magic function to compute next move
function getAutoMove(b) {
  //  if (model == undefined) return dirs[Math.floor(Math.random() * 4)];
  return getMove(b);
}

function startStopAutoGame() {
  if (stopped && !autoActive) {
    restart();
  }
  autoActive = !autoActive;
  if (autoTimeout != undefined) clearTimeout(autoTimeout);
  if (autoActive) {
    if (model == undefined) console.log("Using random model.");
    else console.log("Using uploaded model.");
    autoGame();
  }
}

async function doRealTurn(b, move) {
  if (stopped) {
    restart();
    return;
  }
  let ret = moveBoard(b, move);
  updateCells();
  if (!autoActive) await sleep(50);
  if (ret != -1) createElementReal(b);
  updateCells();
  if (ret == -1) return false;
  curScore += ret;
  if (maxScore < curScore) maxScore = curScore;
  updateMaxScore(maxScore, curScore);
  return true;
}

async function autoGame() {
  //console.log(autoActive);
  if (!autoActive) return;
  // move in [0,1,2,3]
  let move = getAutoMove(board);
  //console.log(move);
  if (move == undefined) {
    gameOver();
    return;
  }
  //console.log(move);
  await doRealTurn(board, move);
  autoTimeout = setTimeout(() => autoGame(), model == undefined ? 30 : 0);
}
