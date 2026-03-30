const ROWS = 20;
const COLS = 10;
const BOX_SIZE = 32;
const BOARD_W = COLS * BOX_SIZE;
const BOARD_H = ROWS * BOX_SIZE;
const PIECE_TYPES = ["4Line", "L", "BackL", "T", "S", "Z", "2by2"];
const POINTS = [0, 100, 300, 500, 800];
const SPRITES = {};

let originX, originY;
let board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
let activePiece = null;
let nextType = null;
let score = 0;
let level = 1;
let linesCleared = 0;
let gameOver = false;
let paused = false;
let dropInterval = 500;
let lastDrop = 0;
//switched to millis which counts milliseconds instead of frameCount so we can track in time instead of converting and manipulating draw speeds
function setup() {
    createCanvas(windowWidth, windowHeight);
    originX = (width  - BOARD_W) / 2;
    originY = (height - BOARD_H) / 2;
    for (const type of PIECE_TYPES) {
        const clr = Piece.SHAPES[type].color;
        if (!SPRITES[clr]) {
            loadImage(
                "assets/tile_" + clr + ".png",
                img => {SPRITES[clr] = img;},
                ()  => {SPRITES[clr] = null;}
            );
        }
    }
    nextType = randomPiece();
    activePiece = spawnPiece();
    lastDrop = millis();
}

function draw() {
    background(30);
    drawBoard();
    drawGhost();
    drawActivePiece();
    drawSidebar();
    if (!gameOver && !paused) fall();
    if (gameOver) drawGameOver();
    if (paused)   drawPaused();
}

function randomPiece() {
    return PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
}

function spawnPiece() {
    const type = nextType;
    nextType = randomPiece();
    const startX = originX + Math.floor((COLS - 4) / 2) * BOX_SIZE;
    const startY = originY;
    const piece = new Piece(startX, startY, type, BOX_SIZE);
    if (collidesWithBoard(piece)) {
        gameOver = true; 
        return null;
    }
    return piece;
}

function fall() {
    if (millis() - lastDrop >= dropInterval) {
        lastDrop = millis();
        if (!tryMove(activePiece, 0, BOX_SIZE)) lockPiece();
    }
}

function tryMove(piece, x, y) {
    piece.move(x, y);
    if (collidesWithBoard(piece) || outOfBounds(piece)) {
        piece.move(-x, -y);
        return false;
    }
    return true;
}

function outOfBounds(piece) {
    return piece.boxes.some(b =>
        b.x < originX ||
        b.x + BOX_SIZE > originX + BOARD_W ||
        b.y + BOX_SIZE > originY + BOARD_H
    );
}

function collidesWithBoard(piece) {
    return piece.boxes.some(b => {
        const col = Math.round((b.x - originX) / BOX_SIZE);
        const row = Math.round((b.y - originY) / BOX_SIZE);
        if (row < 0) return false;
        if (row >= ROWS || col < 0 || col >= COLS) return true;
        return board[row][col] !== null;
    });
}
//locks pieces on the ground when they "settle", might need to adjust after we decide 
//how much piece sliding we want to allow
function lockPiece() {
    activePiece.boxes.forEach(b => {
        const col = Math.round((b.x - originX) / BOX_SIZE);
        const row = Math.round((b.y - originY) / BOX_SIZE);
        if (row >= 0 && row < ROWS && col >= 0 && col < COLS)
            board[row][col] = {color : activePiece.color};
    });
    updateScore(clearLines());
    activePiece = spawnPiece();
    lastDrop = millis();
}

function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r].every(cell => cell !== null)) {
            //removes full row
            board.splice(r, 1);
            //adds empty row to top
            board.unshift(Array(COLS).fill(null));
            cleared++;
            r++;
        }
    }
    return cleared;
}

function updateScore(cleared) {
    //score is arbitrary rn, can tune balancing and how we want score later
    linesCleared += cleared;
    score += (POINTS[cleared] || 0);
    //sets level based on lines clear rn every 10 lines increase the level 
    level = Math.floor(linesCleared / 10) + 1;
    //drop interval decreases based on level
    dropInterval = Math.max(80, 500 - (level - 1) * 40);
}

//handles ghost pieces (aka the highlight of where the piece will land)
function getGhostPiece() {
    if (!activePiece) return null;
    //simulates a piece without being an actual piece
    const ghost = {
        boxes: activePiece.boxes.map(b => ({x: b.x, y: b.y, size: b.size})),
        color: activePiece.color,
        move(x, y) {this.boxes.forEach(b => {b.x += x; b.y += y;});}
    };
    while (true) {
        ghost.move(0, BOX_SIZE);
        //checks if it hit the bottom
        const notInBounds = ghost.boxes.some(b => b.y + BOX_SIZE > originY + BOARD_H);
        //checks if it hit a locked piece
        const collides = ghost.boxes.some(b => {
            const col = Math.round((b.x - originX) / BOX_SIZE);
            const row = Math.round((b.y - originY) / BOX_SIZE);
            if (row < 0) return false;
            if (row >= ROWS || col < 0 || col >= COLS) return true;
            return board[row][col] !== null;
        });
        if (notInBounds || collides) { 
            ghost.move(0, -BOX_SIZE); 
            break; 
        }
    }
    return ghost;
}

function drawBox(x, y, size, clr) {
    const spr = SPRITES[clr];
    if (spr) {
        image(spr, x, y, size, size);
    } else {
        //backup incase SPRITES don't load so the game doesn't crash
        fill(clr);
        stroke(0);
        strokeWeight(1);
        rect(x, y, size, size);
        const lighter = lerpColor(color(clr), color(255), 0.4);
        stroke(lighter);
        strokeWeight(2);
        line(x + 1, y + 1, x + size - 1, y + 1);
        line(x + 1, y + 1, x + 1, y + size - 1);
    }
}

function drawBoard() {
    fill(15); 
    noStroke();
    rect(originX, originY, BOARD_W, BOARD_H);
    for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
            if (board[r][c])
                drawBox(originX + c * BOX_SIZE, originY + r * BOX_SIZE, BOX_SIZE, board[r][c].color);
    stroke(40); 
    strokeWeight(0.5);
    for (let r = 0; r <= ROWS; r++)
        line(originX, originY + r * BOX_SIZE, originX + BOARD_W, originY + r * BOX_SIZE);
    for (let c = 0; c <= COLS; c++)
        line(originX + c * BOX_SIZE, originY, originX + c * BOX_SIZE, originY + BOARD_H);
    noFill(); 
    stroke(200); 
    strokeWeight(2);
    rect(originX, originY, BOARD_W, BOARD_H);
}

function drawGhost() {
    const ghost = getGhostPiece();
    if (!ghost) return;
    ghost.boxes.forEach(b => {
        noFill();
        stroke(ghost.color);
        strokeWeight(2);
        rect(b.x, b.y, b.size, b.size);
    });
}

function drawActivePiece() {
    if (!activePiece) return;
    activePiece.boxes.forEach(b => drawBox(b.x, b.y, b.size, activePiece.color));
}

function drawSidebar() {
    const panelX = originX + BOARD_W + 20;
    const panelY = originY;
    fill(200); 
    noStroke(); 
    textAlign(LEFT, TOP);
    textSize(14); text("SCORE", panelX, panelY);
    textSize(22); text(score, panelX, panelY + 18);
    textSize(14); text("LEVEL", panelX, panelY + 60);
    textSize(22); text(level, panelX, panelY + 78);
    textSize(14); text("LINES", panelX, panelY + 120);
    textSize(22); text(linesCleared, panelX, panelY + 138);
    textSize(14); text("NEXT", panelX, panelY + 190);
    const previewX = panelX;
    const previewY = panelY + 210;
    fill(15); 
    noStroke();
    rect(previewX, previewY, 5 * BOX_SIZE, 4 * BOX_SIZE);
    if (nextType) {
        const cells = Piece.SHAPES[nextType].cells;
        const clr   = Piece.SHAPES[nextType].color;
        cells.forEach(([r, c]) =>
            drawBox(previewX + c * BOX_SIZE, previewY + r * BOX_SIZE, BOX_SIZE, clr)
        );
    }
    textSize(12); 
    fill(140);
    text("← →    move", panelX, panelY + 380);
    text("↑      rotate", panelX, panelY + 398);
    text("↓      soft drop", panelX, panelY + 416);
    text("SPACE  hard drop", panelX, panelY + 434);
    text("ESC    pause", panelX, panelY + 452);
}
//temp game over screen til we have a ui/screen built for it
function drawGameOver() {
    fill(0, 0, 0, 160); 
    noStroke();
    rect(originX, originY, BOARD_W, BOARD_H);
    fill(255, 60, 60); 
    textSize(28); 
    textAlign(CENTER, CENTER);
    text("GAME OVER", originX + BOARD_W / 2, originY + BOARD_H / 2 - 20);
    fill(220); 
    textSize(14);
    text("Press R to restart", originX + BOARD_W / 2, originY + BOARD_H / 2 + 20);
}
//same here, temp pause til we have one designed
function drawPaused() {
    fill(0, 0, 0, 120); noStroke();
    rect(originX, originY, BOARD_W, BOARD_H);
    fill(255); textSize(28); textAlign(CENTER, CENTER);
    text("PAUSED", originX + BOARD_W / 2, originY + BOARD_H / 2);
}

function keyPressed() {
    if (keyCode === 27) {
        paused = !paused; 
        return;
    }
    if (gameOver) {
        if (key === 'r' || key === 'R') {
            resetGame(); 
            return; 
        }
    }
    if (paused || !activePiece) return;
    switch (keyCode) {
        case LEFT_ARROW:
            tryMove(activePiece, -BOX_SIZE, 0);
            break;
        case RIGHT_ARROW: 
            tryMove(activePiece,  BOX_SIZE, 0); 
            break;
        case DOWN_ARROW:
            if (tryMove(activePiece, 0, BOX_SIZE)) score += 1;
            lastDrop = millis();
            break;
        case UP_ARROW:
            activePiece.rotate(COLS, ROWS, originX, originY, board);
            break;
        case 32:
            let dropped = 0;
            while (tryMove(activePiece, 0, BOX_SIZE)) dropped++;
            score += dropped * 2;
            lockPiece();
            break;
    }
}

// restarts the game
function resetGame() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    score = 0;
    level = 1;
    linesCleared = 0;
    dropInterval = 500;
    gameOver = false;
    paused = false;
    nextType = randomPiece();
    activePiece  = spawnPiece();
    lastDrop = millis();
}
//attempt for adjusting for window resize, we need to figure out exactly how we want to handle it whether
//that is with ratios or with cap resolution and show a portion.
//has a few issues with resizing mid piece drop.
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    originX = (width  - BOARD_W) / 2;
    originY = (height - BOARD_H) / 2;
}