const ROWS = 20;
const COLS = 10;
const BOX_SIZE = 32;
const BOARD_W = COLS * BOX_SIZE;
const BOARD_H = ROWS * BOX_SIZE;
const PIECE_TYPES = ["4Line", "L", "BackL", "T", "S", "Z", "2by2"];
const POINTS = [0, 100, 300, 500, 800];
const BOSSES = ["rotate"];
const SPRITES = {};

let originX, originY;
let board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
let activePiece = null;
let nextType = null;
let score = 0;
let scoreRequirement = 500;
let scoreIncrement = 250;
let scoreFactor = 2;
let level = 1;
let stage = 1;
let linesCleared = 0;
let gameOver = false;
let paused = false;
let dropInterval = 500;
let lastDrop = 0;
let holdType = null;
let holdUsed = false;
let noRotate = false;
let skipNextBoss = false;
let pieceBag = 30;
let numLockedPieces = 0;

// gameState will tell the program what should be rendered and processed.
// valid states: menu, standard, boss, shop
let gameState = "standard";

let leftHeld = false;
let rightHeld = false;
let downHeld = false;
let lastHorizontalDir = 0;
let nextHorizontalMove = 0;
let nextSoftDrop = 0;
let lockStartedAt = 0;

const HORIZONTAL_REPEAT_DELAY = 140;
const HORIZONTAL_REPEAT_INTERVAL = 55;
const SOFT_DROP_INTERVAL = 45;
const LOCK_DELAY = 450;
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
/**
 * 
 */
function draw() {
    background(30);
    if (gameState === "standard") {
        drawBoard();
        drawGhost();
        drawActivePiece();
        drawSidebar();
        if (!gameOver && !paused) {
            handleHeldInput();
            fall();
        }
    }
    if (gameState === "shop") drawShop();
    if (gameOver) drawGameOver();
    if (paused)   drawPaused();
}

/**
 * 
 * @returns string with a piece type from PIECE_TYPES array.
 */
function randomPiece() {
    return PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
}

/**
 * 
 * @returns a call to the spawnPieceOfType function, generates a random piece with randomPiece()
 */
function spawnPiece() {
    const type = nextType;
    nextType = randomPiece();
    return spawnPieceOfType(type);
}

/**
 * creates a new piece object given type
 * @param type the type of piece to be made. 
 * @returns a new piece object given type.
 */
function spawnPieceOfType(type) {
    const startX = originX + Math.floor((COLS - 4) / 2) * BOX_SIZE;
    const startY = originY;
    const piece = new Piece(startX, startY, type, BOX_SIZE);
    if (collidesWithBoard(piece)) {
        gameOver = true; 
        return null;
    }
    return piece;
}
/**
 * 
 */
function fall() {
    const now = millis();
    if (now - lastDrop >= dropInterval) {
        lastDrop = now;
        if (tryMove(activePiece, 0, BOX_SIZE)) {
            lockStartedAt = 0;
        } else if (lockStartedAt === 0) {
            lockStartedAt = now;
        } else if (now - lockStartedAt >= LOCK_DELAY) {
            lockPiece();
        }
    } else if (lockStartedAt !== 0 && canMove(activePiece, 0, BOX_SIZE)) {
        lockStartedAt = 0;
    }
}
/**
 * 
 */
function handleHeldInput() {
    const now = millis();

    let horizontalDir = 0;
    if (leftHeld && !rightHeld) horizontalDir = -1;
    else if (rightHeld && !leftHeld) horizontalDir = 1;
    else if (leftHeld && rightHeld) {
        if (lastHorizontalDir === -1) horizontalDir = -1;
        if (lastHorizontalDir === 1) horizontalDir = 1;
    }

    if (horizontalDir !== 0 && now >= nextHorizontalMove) {
        if (tryMove(activePiece, horizontalDir * BOX_SIZE, 0)) {
            resetLockDelay();
        }
        nextHorizontalMove = now + HORIZONTAL_REPEAT_INTERVAL;
    }

    if (downHeld && now >= nextSoftDrop) {
        if (tryMove(activePiece, 0, BOX_SIZE)) {
            score += 1;
            lastDrop = now;
            lockStartedAt = 0;
        }
        nextSoftDrop = now + SOFT_DROP_INTERVAL;
    }
}
/**
 * 
 * @param {*} piece 
 * @param {*} x 
 * @param {*} y 
 * @returns 
 */
function canMove(piece, x, y) {
    piece.move(x, y);
    const blocked = collidesWithBoard(piece) || outOfBounds(piece);
    piece.move(-x, -y);
    return !blocked;
}
/**
 * 
 * @returns 
 */
function resetLockDelay() {
    if (!activePiece) return;
    lockStartedAt = 0;
    lastDrop = millis();
}
/**
 * 
 * @param {*} piece 
 * @param {*} x 
 * @param {*} y 
 * @returns 
 */
function tryMove(piece, x, y) {
    if (!canMove(piece, x, y)) {
        return false;
    }
    piece.move(x, y);
    return true;
}
/**
 * 
 * @param {*} piece 
 * @returns 
 */
function outOfBounds(piece) {
    return piece.boxes.some(b =>
        b.x < originX ||
        b.x + BOX_SIZE > originX + BOARD_W ||
        b.y + BOX_SIZE > originY + BOARD_H
    );
}
/**
 * 
 * @param {*} piece 
 * @returns 
 */
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
    //increment numLockedpieces.
    numLockedPieces++;
    //check if numLockedPieces is less than the bag.
    if (numLockedPieces >= pieceBag) {
        gameOver = true;
        return;
    }
    activePiece = spawnPiece();
    holdUsed = false;
    lockStartedAt = 0;
    lastDrop = millis();

}
/**
 * 
 * @returns 
 */
function holdPiece() {
    if (!activePiece || holdUsed) return;

    const currentType = activePiece.type;
    if (holdType === null) {
        holdType = currentType;
        activePiece = spawnPiece();
    } else {
        const swapType = holdType;
        holdType = currentType;
        activePiece = spawnPieceOfType(swapType);
    }

    holdUsed = true;
    lockStartedAt = 0;
    lastDrop = millis();
}
/**
 * 
 * @returns 
 */
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
/**
 * 
 * @param {*} cleared 
 */
function updateScore(cleared) {
    //score is arbitrary rn, can tune balancing and how we want score later
    linesCleared += cleared;
    score += (POINTS[cleared] || 0);
    if (score >= scoreRequirement) {
        updateLevel();
    }
}
/**
 * updates level, will increment stage if level == 3.
 * also increases score
 * calls softReset()
 */
function updateLevel() {
    console.log("updating level!");
    switch (level) {
        case 3 : 
            updateStage();
            noRotate = false;
            gameState = "shop";
            initShop();
            return;
        case 2 : 
            activateBoss();
        default :
            level++;
            scoreRequirement += scoreIncrement;
            //test
            gameState = "shop";
            initShop();
    }
    softReset();
    //drop interval decreases based on Stage (and level?)
    dropInterval = Math.max(80, 500 - (stage - 1) * 100);
}

function activateBoss() {
    if (skipNextBoss) {
        skipNextBoss = false;
        return;
    }
    let boss = BOSSES[Math.floor(Math.random() * BOSSES.length)];
    switch (boss) {
        case "rotate" : 
            noRotate = true;
            break;
    }
}
/**
 * updates Stage
 * increases score as well as the factor by which score increases.
 * softReset() is called by updateLevel().
 */
function updateStage() {
    console.log("updating stage!");
    level = 1;
    stage++;
    scoreRequirement *= scoreFactor;
    scoreIncrement *= scoreFactor;
    scoreFactor *= 2;
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
/**
 * 
 * @param {*} x 
 * @param {*} y 
 * @param {*} size 
 * @param {*} clr 
 */
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
/**
 * 
 */
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
/**
 * 
 * @returns 
 */
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
/**
 * 
 * @returns 
 */
function drawActivePiece() {
    if (!activePiece) return;
    activePiece.boxes.forEach(b => drawBox(b.x, b.y, b.size, activePiece.color));
}
/**
 * 
 */
function drawSidebar() {
    const leftPanelX = originX - (5 * BOX_SIZE) - 24;
    const rightPanelX = originX + BOARD_W + 20;
    const panelY = originY;
    const previewW = 5 * BOX_SIZE;
    const previewH = 4 * BOX_SIZE;

    function drawPreviewPiece(type, x, y) {
        if (!type) return;
        const cells = Piece.SHAPES[type].cells;
        const clr = Piece.SHAPES[type].color;
        const rows = cells.map(([r]) => r);
        const cols = cells.map(([, c]) => c);
        const minRow = Math.min(...rows);
        const maxRow = Math.max(...rows);
        const minCol = Math.min(...cols);
        const maxCol = Math.max(...cols);
        const shapeW = (maxCol - minCol + 1) * BOX_SIZE;
        const shapeH = (maxRow - minRow + 1) * BOX_SIZE;
        const offsetX = Math.floor((previewW - shapeW) / 2) - minCol * BOX_SIZE;
        const offsetY = Math.floor((previewH - shapeH) / 2) - minRow * BOX_SIZE;

        cells.forEach(([r, c]) =>
            drawBox(x + offsetX + c * BOX_SIZE, y + offsetY + r * BOX_SIZE, BOX_SIZE, clr)
        );
    }

    fill(255); 
    noStroke(); 
    textAlign(LEFT, TOP);
    textSize(14); text("HOLD", leftPanelX, panelY);
    const holdPreviewX = leftPanelX;
    const holdPreviewY = panelY + 20;
    fill(15); 
    noStroke();
    rect(holdPreviewX, holdPreviewY, previewW, previewH);
    drawPreviewPiece(holdType, holdPreviewX, holdPreviewY);

    fill(255);
    // UI elements here should have a distance of 20, between their descriptor and value
    // and a distance of 50 between other descriptors
    textSize(14); text("GOAL", leftPanelX, panelY + 160);
    textSize(22); text(scoreRequirement, leftPanelX, panelY + 180);
    textSize(14); text("SCORE", leftPanelX, panelY + 210);
    textSize(22); text(score, leftPanelX, panelY + 230);
    textSize(14); text("LEVEL", leftPanelX, panelY + 260);
    textSize(22); text(level, leftPanelX, panelY + 280);
    textSize(14); text("LINES", leftPanelX, panelY + 310);
    textSize(22); text(linesCleared, leftPanelX, panelY + 330);
    textSize(14); text("PIECES LEFT", leftPanelX, panelY + 360);
    textSize(22); text(pieceBag - numLockedPieces, leftPanelX, panelY + 380);

    textSize(14); text("NEXT", rightPanelX, panelY);
    const nextPreviewX = rightPanelX;
    const nextPreviewY = panelY + 20;
    fill(15);
    noStroke();
    rect(nextPreviewX, nextPreviewY, previewW, previewH);
    drawPreviewPiece(nextType, nextPreviewX, nextPreviewY);

    textSize(12); 
    fill(255);
    text("← →    move", rightPanelX, panelY + 170);
    text("↑      rotate", rightPanelX, panelY + 188);
    text("↓      soft drop", rightPanelX, panelY + 206);
    text("SPACE  hard drop", rightPanelX, panelY + 224);
    text("C      hold", rightPanelX, panelY + 242);
    text("ESC    pause", rightPanelX, panelY + 260);
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

function mouseMoved() {
    if (gameState === "shop") shopMouseMoved();
}

function mouseClicked() {
    if (gameState === "shop") shopMouseClicked();
}

function keyPressed() {
    if (keyCode === 27) {
        paused = !paused; 
        return;
    }
    if (gameState === "shop") {
        shopKeyPressed(key);
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
            leftHeld = true;
            lastHorizontalDir = -1;
            if (tryMove(activePiece, -BOX_SIZE, 0)) resetLockDelay();
            nextHorizontalMove = millis() + HORIZONTAL_REPEAT_DELAY;
            break;
        case RIGHT_ARROW: 
            rightHeld = true;
            lastHorizontalDir = 1;
            if (tryMove(activePiece,  BOX_SIZE, 0)) resetLockDelay(); 
            nextHorizontalMove = millis() + HORIZONTAL_REPEAT_DELAY;
            break;
        case DOWN_ARROW:
            downHeld = true;
            if (tryMove(activePiece, 0, BOX_SIZE)) {
                score += 1;
                lockStartedAt = 0;
            }
            lastDrop = millis();
            nextSoftDrop = millis() + SOFT_DROP_INTERVAL;
            break;
        case UP_ARROW:
            if (!noRotate && activePiece.rotate(COLS, ROWS, originX, originY, board)) resetLockDelay();
            break;
            // spacebar
        case 32:
            let dropped = 0;
            //
            while (tryMove(activePiece, 0, BOX_SIZE)) dropped++;
            score += dropped * 2;
            lockPiece();
            break;
            // "c"
        case 67:
            holdPiece();
            break;
    }
}

function keyReleased() {
    if (keyCode === LEFT_ARROW) {
        leftHeld = false;
        if (rightHeld) {
            lastHorizontalDir = 1;
            nextHorizontalMove = millis() + HORIZONTAL_REPEAT_DELAY;
        }
    } else if (keyCode === RIGHT_ARROW) {
        rightHeld = false;
        if (leftHeld) {
            lastHorizontalDir = -1;
            nextHorizontalMove = millis() + HORIZONTAL_REPEAT_DELAY;
        }
    } else if (keyCode === DOWN_ARROW) {
        downHeld = false;
    }
}

// restarts the game
function resetGame() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    score = 0;
    scoreRequirement = 500;
    scoreIncrement = 500;
    scoreFactor = 2;
    level = 1;
    linesCleared = 0;
    numLockedPieces = 0;
    dropInterval = 500;
    gameOver = false;
    paused = false;
    holdType = null;
    holdUsed = false;
    leftHeld = false;
    rightHeld = false;
    downHeld = false;
    lastHorizontalDir = 0;
    nextHorizontalMove = 0;
    nextSoftDrop = 0;
    lockStartedAt = 0;
    nextType = randomPiece();
    activePiece  = spawnPiece();
    lastDrop = millis();
}

// restarts the game, but keeps various variables. Used for progressing levels and stages.
function softReset() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    score = 0;
    numLockedPieces = 0;
    holdType = null;
    holdUsed = false;
    leftHeld = false;
    rightHeld = false;
    downHeld = false;
    noRotate = false;
    lastHorizontalDir = 0;
    nextHorizontalMove = 0;
    nextSoftDrop = 0;
    lockStartedAt = 0;
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

function closeShop() {
    gameState = "standard";
    activateBoss();
    softReset();
    dropInterval = Math.max(80, 500 - (stage - 1) * 100);
}