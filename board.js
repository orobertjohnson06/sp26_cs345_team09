import { initFirebase, submitScore } from './firebase.js';
import { initShop, drawShop, shopMouseMoved, shopMouseClicked, shopKeyPressed, preloadRelicSprites } from './shop.js';
const ROWS = 20;
const COLS = 10;
const BOX_SIZE = 32;
const BOARD_W = COLS * BOX_SIZE;
const BOARD_H = ROWS * BOX_SIZE;
const PIECE_TYPES = ["4Line", "L", "BackL", "T", "S", "Z", "2by2"];
const POINTS = [0, 100, 300, 500, 800];
const BOSSES = ["rotate"];
const SPRITES = {};
const DEFAULT_RECOLLECTION = 5;

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
let recollection = DEFAULT_RECOLLECTION;
let recollectionUsed = 0;
export let relicsHeld = [];

// gameState will tell the program what should be rendered and processed
// valid states: menu, standard, boss, shop, stageIntro
let gameState = "standard";
let stageIntroStartedAt = 0;
let stageIntroNextState = "standard";

let leftHeld = false;
let rightHeld = false;
let downHeld = false;
let lastHorizontalDir = 0;
let nextHorizontalMove = 0;
let nextSoftDrop = 0;
let lockStartedAt = 0;
let pauseSettingsOpen = false;
let settingsModalOpen = false;
let settingsModalProgress = 0;
let settingsTab = "general";
let kbScrollY = 0;
let dragSlider = null;
let settingsRegions = [];
let settingsSliders = [
    {label: "Master Volume", value: 80},
    {label: "Music Volume", value: 60},
    {label: "SFX Volume", value: 75},
];
//leader board
let scoreSubmitted = false;

let binds = [
  {action:'Move Left', key:'A'},
  {action:'Move Right', key:'D'},
  {action:'Soft Drop', key:'S'},
  {action:'Hard Drop', key:' '},
  {action:'Rotate', key:'W'},
  {action:'Hold Piece', key:'C'},
  {action:'Pause', key:'P'},
];
let keyMap = {};

//relic vars
export let sqrBonus = 0;
export let sqrBonusActive = false;
export let PerfectionBonus = 0;
export let scoreMultiBonus = 1;
export let comboLineActive = false;
export let comboStreak = 0;
export let comboLineBonus = 0.5;
export let towerBuilderActive = false;
export let towerBuilderBonus = 0.4;
let currentPieceRotations = 0;
export let spin2WinActive = false;
export let spin2WinBonus = 0.02
let lastMoveWasHardDrop = false;
export let turboBoosterActive = false;
export let turboBoosterBonus = 0.2;
export let doubleHoldActive = false;
export let holdQueue = [];

const HORIZONTAL_REPEAT_DELAY = 140;
const HORIZONTAL_REPEAT_INTERVAL = 55;
const BASE_DROP_INTERVAL = 500;
const SOFT_DROP_INTERVAL = 45;
const LOCK_DELAY = 450;
const STAGE_INTRO_FADE_IN = 500;
const STAGE_INTRO_HOLD = 700;
const STAGE_INTRO_FADE_OUT = 500;
const STAGE_INTRO_DURATION = STAGE_INTRO_FADE_IN + STAGE_INTRO_HOLD + STAGE_INTRO_FADE_OUT;
//switched to millis which counts milliseconds instead of frameCount so we can track in time instead of converting and manipulating draw speeds
window.setup = async function() {
    createCanvas(windowWidth, windowHeight);
    await initFirebase();
    setBinds();
    originX = (width - BOARD_W) / 2;
    originY = (height - BOARD_H) / 2;
    for (const type of PIECE_TYPES) {
        const clr = Piece.SHAPES[type].color;
        if (!SPRITES[clr]) {
            loadImage(
                "assets/tile_" + clr + ".png",
                img => {SPRITES[clr] = img;},
                () => {SPRITES[clr] = null;}
            );
        }
    }
    nextType = randomPiece();
    activePiece = spawnPiece();
    lastDrop = millis();
    beginStageIntro("standard");
}

window.draw = function() {
    background(30);
    if (gameState === "stageIntro") {
        drawStageIntro();
        return;
    }
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
    if (gameState === "shop") drawShop(recollectionUsed, recollection);
    if (gameOver) drawGameOver();
    if (paused) drawPaused();
}
window.preload = function() {
  preloadRelicSprites();
}

function beginStageIntro(nextState) {
    stageIntroStartedAt = millis();
    stageIntroNextState = nextState;
    gameState = "stageIntro";
}

function drawStageIntro() {
    const elapsed = millis() - stageIntroStartedAt;
    if (elapsed >= STAGE_INTRO_DURATION) {
        if (stageIntroNextState === "shop") {
            initShop();
        }
        gameState = stageIntroNextState;
        return;
    }

    let alpha = 255;
    if (elapsed < STAGE_INTRO_FADE_IN) {
        alpha = map(elapsed, 0, STAGE_INTRO_FADE_IN, 0, 255);
    } else if (elapsed > STAGE_INTRO_FADE_IN + STAGE_INTRO_HOLD) {
        alpha = map(
            elapsed,
            STAGE_INTRO_FADE_IN + STAGE_INTRO_HOLD,
            STAGE_INTRO_DURATION,
            255,
            0
        );
    }

    background(10);
    textAlign(CENTER, CENTER);
    noStroke();

    fill(255, 220, 120, alpha);
    textSize(18);

    fill(255, alpha);
    textSize(44);
    text("STAGE " + stage + ": LEVEL " + level, width / 2, height / 2 + 2);
}


function randomPiece() {
    return PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
}


function spawnPiece() {
    const type = nextType;
    nextType = randomPiece();
    //spin2win relic
    currentPieceRotations = 0;
    return spawnPieceOfType(type);
}

function spawnPieceOfType(type) {
    //spin2win relic
    currentPieceRotations = 0;
    const startX = originX + Math.floor((COLS - 4) / 2) * BOX_SIZE;
    const startY = originY;
    const piece = new Piece(startX, startY, type, BOX_SIZE);
    if (collidesWithBoard(piece)) {
        gameOver = true;
        submitFinalScore();
        return null;
    }
    return piece;
}

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

function canMove(piece, x, y) {
    piece.move(x, y);
    const blocked = collidesWithBoard(piece) || outOfBounds(piece);
    piece.move(-x, -y);
    return !blocked;
}

function resetLockDelay() {
    if (!activePiece) return;
    lockStartedAt = 0;
    lastDrop = millis();
}

function tryMove(piece, x, y) {
    if (!canMove(piece, x, y)) {
        return false;
    }
    piece.move(x, y);
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
    //spin2win relic
    currentPieceRotations = 0;
    //turbo_booster relic
    lastMoveWasHardDrop = false;
    //increment numLockedpieces.
    numLockedPieces++;
    //check if numLockedPieces is less than the bag.
    if (numLockedPieces >= pieceBag) {
        gameOver = true;
        submitFinalScore();
        return;
    }
    if (sqrBonusActive && activePiece.type === '2by2') addSqrBonus(2);
    activePiece = spawnPiece();
    holdUsed = false;
    lockStartedAt = 0;
    lastDrop = millis();

}

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
    linesCleared += cleared;

    let pointsGained = POINTS[cleared] || 0;
    //combo line check
    if (comboLineActive) {
        if (cleared > 0) {
            comboStreak++;
            const comboMultiplier = 1 + comboLineBonus * comboStreak;
            pointsGained *= comboMultiplier;
        } else {
            comboStreak = 0;
        }
    }

    // Turbo Booster relic
    if (turboBoosterActive && lastMoveWasHardDrop && cleared > 0) {
        pointsGained *= 1 + turboBoosterBonus;
    }

    // Spin 2 Win relic
    if (spin2WinActive && cleared > 0) {
        const spinMultiplier = 1 + currentPieceRotations * spin2WinBonus;
        pointsGained *= spinMultiplier;
    }


    //score modifiers
    score += pointsGained;

    score += sqrBonus;
    score += PerfectionBonus;
    score *= scoreMultiBonus;

    if (score >= scoreRequirement) {
        updateLevel();
    }
}

function updateLevel() {
    console.log("updating level!");

    if (level === 2) {
        activateBoss();
    }

    if (level === 3) {
        noRotate = false;
        level = 1;
        pieceBag += 15;
        scoreRequirement *= scoreFactor;
        scoreIncrement *= scoreFactor;
        scoreFactor *= 2;
        recollection++;
        stage++
    } else {
        level++;
        scoreRequirement += scoreIncrement;
    }

    beginStageIntro("shop");
    softReset();
    //drop interval decreases based on Stage (and level?)
    dropInterval = Math.max(80, BASE_DROP_INTERVAL - (stage - 1) * 100);
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

function getHindranceText() {
    const hindrances = [];
    if (noRotate) hindrances.push("No Rotates");
    if (hindrances.length === 0) return "None";
    return hindrances.join(", ");
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

    push();
    noStroke();
    fill(255);
    textAlign(CENTER, BOTTOM);
    textSize(18);
    text("STAGE " + stage, originX + BOARD_W / 2, originY - 10);
    pop();
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
    textSize(14); text("GOAL", leftPanelX, panelY + 160);
    textSize(22); text(scoreRequirement, leftPanelX, panelY + 180);
    textSize(14); text("SCORE", leftPanelX, panelY + 210);
    textSize(22); text(score, leftPanelX, panelY + 230);
    textSize(14); text("STAGE, LEVEL", leftPanelX, panelY + 260);
    textSize(22); text(stage + ", " + level, leftPanelX, panelY + 280);
    textSize(14); text("HINDRANCE", leftPanelX, panelY + 310);
    textSize(18);
    fill(noRotate ? color(255, 110, 110) : color(220));
    text(getHindranceText(), leftPanelX, panelY + 330, previewW + 24, 44);
    fill(255);
    textSize(14); text("LINES", leftPanelX, panelY + 380);
    textSize(22); text(linesCleared, leftPanelX, panelY + 400);
    textSize(14); text("PIECES LEFT", leftPanelX, panelY + 430);
    textSize(22); text(pieceBag - numLockedPieces, leftPanelX, panelY + 450);
    textSize(14); text("RECOLLECTION", leftPanelX, panelY + 480);
    textSize(22); text(recollectionUsed + " / " + recollection, leftPanelX, panelY + 500);

    textSize(14); text("NEXT", rightPanelX, panelY);
    const nextPreviewX = rightPanelX;
    const nextPreviewY = panelY + 20;
    fill(15);
    noStroke();
    rect(nextPreviewX, nextPreviewY, previewW, previewH);
    drawPreviewPiece(nextType, nextPreviewX, nextPreviewY);

    textSize(12); 
    fill(255);
    text("← → move", rightPanelX, panelY + 170);
    text("↑ rotate", rightPanelX, panelY + 188);
    text("↓ soft drop", rightPanelX, panelY + 206);
    text("SPACE hard drop", rightPanelX, panelY + 224);
    text("C hold", rightPanelX, panelY + 242);
    text("ESC pause", rightPanelX, panelY + 260);
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
    fill(0, 0, 0, 160);
    noStroke();
    rect(0, 0, width, height);

    const panelW = 360;
    const panelH = 290;
    const panelX = width / 2 - panelW / 2;
    const panelY = height / 2 - panelH / 2;

    fill(22);
    stroke(180);
    strokeWeight(2);
    rect(panelX, panelY, panelW, panelH, 14);

    noStroke();
    fill(255);
    textAlign(CENTER, TOP);
    textSize(34);
    text("PAUSED", width / 2, panelY + 18);

    const buttons = getPauseMenuButtons(panelX, panelY, panelW);
    for (const btn of buttons) {
        const hovered = mouseX >= btn.x && mouseX <= btn.x + btn.w && mouseY >= btn.y && mouseY <= btn.y + btn.h;
        fill(hovered ? 70 : 48);
        stroke(hovered ? 235 : 120);
        strokeWeight(1.5);
        rect(btn.x, btn.y, btn.w, btn.h, 8);
        noStroke();
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(16);
        text(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
    }

    if (settingsModalProgress > 0.01) drawSettingsOverlay();
}

function getPauseMenuButtons(panelX, panelY, panelW) {
    const buttonW = panelW - 60;
    const buttonH = 44;
    const startY = panelY + 82;
    const gap = 12;
    return [
        { id: "resume", label: "Resume", x: panelX + 30, y: startY, w: buttonW, h: buttonH },
        { id: "restart", label: "Restart", x: panelX + 30, y: startY + (buttonH + gap), w: buttonW, h: buttonH },
        { id: "home", label: "Home", x: panelX + 30, y: startY + 2 * (buttonH + gap), w: buttonW, h: buttonH },
    ];
}

function handlePauseMenuClick() {
    const panelW = 360;
    const panelH = 290;
    const panelX = width / 2 - panelW / 2;
    const panelY = height / 2 - panelH / 2;
    const buttons = getPauseMenuButtons(panelX, panelY, panelW);

    for (const btn of buttons) {
        const clicked = mouseX >= btn.x && mouseX <= btn.x + btn.w && mouseY >= btn.y && mouseY <= btn.y + btn.h;
        if (!clicked) continue;

        switch (btn.id) {
            case "resume":
                paused = false;
                pauseSettingsOpen = false;
                settingsModalOpen = false;
                settingsModalProgress = 0;
                cancelSettingsListen();
                return;
            case "restart":
                pauseSettingsOpen = false;
                settingsModalOpen = false;
                settingsModalProgress = 0;
                cancelSettingsListen();
                resetGame();
                return;
            case "home":
                settingsModalProgress = 0;
                cancelSettingsListen();
                window.location.href = "index.html";
                return;
        }
    }
}

function drawSettingsOverlay() {
    if (settingsModalOpen && settingsModalProgress < 1) settingsModalProgress = min(1, settingsModalProgress + 0.1);
    if (!settingsModalOpen && settingsModalProgress > 0) settingsModalProgress = max(0, settingsModalProgress - 0.1);
    if (settingsModalProgress <= 0.01) return;

    settingsRegions = [];
    const e = 1 - Math.pow(1 - settingsModalProgress, 3);
    const popW = min(500, width * 0.94);
    const popH = 420;
    const popX = (width - popW) / 2;
    const popY = (height - popH) / 2;

    push();
    fill(`rgba(2,8,3,${0.82 * e})`);
    noStroke();
    rect(0, 0, width, height);
    pop();

    push();
    translate(width / 2, height / 2);
    scale(0.94 + 0.06 * e);
    translate(-width / 2, -height / 2 + 12 * (1 - e));
    drawingContext.globalAlpha = e;
    drawSettings(popX, popY, popW, popH);
    pop();
}

function roundRectPath(x, y, w, h, r) {
    const path = new Path2D();
    path.roundRect(x, y, w, h, r);
    return path;
}

function drawSettings(x, y, w, h) {
    const acSz = 20, acPad = 7;
    const headerH = 55;
    const tabH = 40;
    const bodyY = y + headerH + tabH;
    const bodyH = h - headerH - tabH;

    push();
    const bgGrad = drawingContext.createLinearGradient(x, y, x, y + h);
    bgGrad.addColorStop(0, '#0a1c0c');
    bgGrad.addColorStop(0.5, '#071408');
    bgGrad.addColorStop(1, '#0c1e0e');
    drawingContext.fillStyle = bgGrad;
    drawingContext.fill(roundRectPath(x, y, w, h, 10));
    pop();

    push();
    noFill();
    stroke('rgba(61,219,82,0.35)');
    strokeWeight(1);
    rect(x, y, w, h, 10);
    pop();

    push();
    drawingContext.clip(roundRectPath(x, y, w, h, 10));
    const topG = drawingContext.createLinearGradient(x, y, x, y + 3);
    topG.addColorStop(0, 'rgba(255,255,255,0.06)');
    topG.addColorStop(1, 'transparent');
    drawingContext.fillStyle = topG;
    drawingContext.fillRect(x, y, w, 3);
    pop();

    push();
    stroke('rgba(61,219,82,0.5)');
    strokeWeight(2);
    strokeCap(SQUARE);
    noFill();
    line(x + acPad + acSz, y + acPad, x + acPad, y + acPad);
    line(x + acPad, y + acPad, x + acPad, y + acPad + acSz);
    line(x + w - acPad - acSz, y + h - acPad, x + w - acPad, y + h - acPad);
    line(x + w - acPad, y + h - acPad, x + w - acPad, y + h - acPad - acSz);
    pop();

    drawSettingsHeader(x, y, w, headerH);
    drawSettingsTabs(x, y + headerH, w, tabH);
    drawSettingsBody(x, bodyY, w, bodyH);
}

function drawSettingsHeader(x, y, w, h) {
    const closeX = x + w - 26;
    const closeY = y + h / 2;
    const over = settingsModalOpen && dist(mouseX, mouseY, closeX, closeY) < 16;

    push();
    stroke('rgba(61,219,82,0.15)');
    strokeWeight(1);
    noFill();
    line(x, y + h, x + w, y + h);
    pop();

    push();
    drawingContext.shadowBlur = 14;
    drawingContext.shadowColor = 'rgba(232,160,32,0.5)';
    drawingContext.letterSpacing = '0.18em';
    fill(255, 208, 96);
    noStroke();
    textFont("'Cinzel Decorative', serif");
    textSize(16);
    textStyle(BOLD);
    textAlign(LEFT, CENTER);
    text('Settings', x + 24, y + h / 2);
    pop();

    push();
    noStroke();
    if (over) {
      fill('rgba(192,40,26,0.15)');
      circle(closeX, closeY, 28);
    }
    fill(over ? '#f04030' : '#a0b898');
    textFont('sans-serif');
    textSize(14);
    textStyle(NORMAL);
    textAlign(CENTER, CENTER);
    text('X', closeX, closeY);
    pop();

    settingsRegions.push({id: 'settings-close', x: closeX - 16, y: closeY - 16, w: 32, h: 32});
}

function drawSettingsTabs(x, y, w, tabH) {
    const tabs = ['general', 'audio', 'keybinds'];
    const labels = ['General', 'Audio', 'Keybinds'];
    const tabW = w / tabs.length;

    push();
    fill('rgba(0,0,0,0.2)');
    noStroke();
    rect(x, y, w, tabH);
    pop();

    push();
    stroke('rgba(61,219,82,0.15)');
    strokeWeight(1);
    noFill();
    line(x, y + tabH, x + w, y + tabH);
    pop();

    tabs.forEach((tab, i) => {
        const tabX = x + i * tabW;
        const active = settingsTab === tab;
        const over = settingsModalOpen && mouseX >= tabX && mouseX <= tabX + tabW && mouseY >= y && mouseY <= y + tabH;
        if (over && !active) {
            push();
            fill('rgba(61,219,82,0.05)');
            noStroke();
            rect(tabX, y, tabW, tabH);
            pop();
        }
        if (active) {
            push();
            stroke('#3ddb52');
            strokeWeight(2);
            noFill();
            line(tabX + 4, y + tabH - 1, tabX + tabW - 4, y + tabH - 1);
            pop();
        }
        push();
        fill(active ? '#3ddb52' : (over ? '#f0e8d0' : '#a0b898'));
        noStroke();
        drawingContext.letterSpacing = '0.2em';
        textFont("'Cinzel', serif");
        textSize(10);
        textStyle(BOLD);
        textAlign(CENTER, CENTER);
        text(labels[i].toUpperCase(), tabX + tabW / 2, y + tabH / 2);
        pop();
        settingsRegions.push({id: `settings-tab-${tab}`, x: tabX, y, w: tabW, h: tabH});
    });
}

function drawSettingsBody(x, y, w, h) {
    const pad = 24;
    if (settingsTab === 'audio') {
        drawAudioPanel(x + pad, y + 8, w - pad * 2);
    } else if (settingsTab === 'keybinds') {
        drawKeybindsPanel(x + pad, y + 8, w - pad * 2, h - 16);
    } else {
        push();
        fill('#a0b898');
        noStroke();
        textFont("'Cinzel', serif");
        textSize(13);
        textAlign(LEFT, TOP);
        text('Use the Audio tab to adjust volume and Keybinds to remap controls.', x + pad, y + 20);
        pop();
    }
}

function drawAudioPanel(panelX, panelY, panelW) {
    settingsSliders.forEach((s, i) => drawSliderRow(panelX, panelY + i * 62, panelW, s, i));
}

function drawSliderRow(x, y, w, s, idx) {
    const midY = y + 30;
    const slW = min(160, w * 0.42);
    const slX = x + w - slW - 38;
    const fillFrac = s.value / 100;

    if (idx > 0) {
        push();
        stroke('rgba(255,255,255,0.05)');
        strokeWeight(1);
        noFill();
        line(x, y, x + w, y);
        pop();
    }

    push();
    fill('#a0b898');
    noStroke();
    drawingContext.letterSpacing = '0.08em';
    textFont("'Cinzel', serif");
    textSize(10);
    textStyle(BOLD);
    textAlign(LEFT, CENTER);
    text(s.label.toUpperCase(), x, midY);
    pop();

    push();
    fill('rgba(255,255,255,0.1)');
    noStroke();
    rect(slX, midY - 2, slW, 4, 2);
    pop();

    push();
    fill('#ffd060');
    noStroke();
    rect(slX, midY - 2, slW * fillFrac, 4, 2);
    pop();

    push();
    fill('#ffd060');
    noStroke();
    circle(slX + slW * fillFrac, midY, 16);
    pop();

    push();
    fill('#ffd060');
    noStroke();
    drawingContext.letterSpacing = '0';
    textFont("'Cinzel', serif");
    textSize(11);
    textStyle(BOLD);
    textAlign(RIGHT, CENTER);
    text(s.value, x + w, midY);
    pop();

    settingsRegions.push({id: `settings-slider-${idx}`, x: slX - 8, y: midY - 14, w: slW + 16, h: 28, slX, slW});
}

function drawKeybindsPanel(x, y, w, h) {
    const rowH = 36;
    const listY = y + 22;

    push();
    fill('#a0b898');
    noStroke();
    textFont("'Cinzel', serif");
    textSize(10);
    textStyle(ITALIC);
    textAlign(LEFT, TOP);
    text('Click a key to rebind. Press Esc to cancel.', x, y);
    pop();

    binds.forEach((b, i) => {
        const ry = listY + i * rowH + kbScrollY;
        if (ry + rowH < y || ry > y + h) return;

        if (i > 0) {
            push();
            stroke('rgba(255,255,255,0.05)');
            strokeWeight(1);
            noFill();
            line(x, ry, x + w, ry);
            pop();
        }

        push();
        fill('#a0b898');
        noStroke();
        drawingContext.letterSpacing = '0.08em';
        textFont("'Cinzel', serif");
        textSize(10);
        textStyle(BOLD);
        textAlign(LEFT, CENTER);
        text(b.action.toUpperCase(), x, ry + rowH / 2);
        pop();

        const isListen = dragSlider === null && settingsListening && settingsListening.index === i;
        const btnW = 88, btnH = 24;
        const btnX = x + w - btnW;
        const btnY = ry + (rowH - btnH) / 2;
        const over = settingsModalOpen && mouseX >= btnX && mouseX <= btnX + btnW && mouseY >= btnY && mouseY <= btnY + btnH;
        let btnBg, btnBorder, btnText;
        if (isListen) {
            const blink = 0.1 + 0.1 * sin(frameCount * 0.1);
            btnBg = `rgba(61,219,82,${0.12 + blink})`;
            btnBorder = '#3ddb52';
            btnText = '#3ddb52';
        } else {
            btnBg = over ? 'rgba(232,160,32,0.2)' : 'rgba(232,160,32,0.08)';
            btnBorder = over ? '#e8a020' : 'rgba(232,160,32,0.28)';
            btnText = '#ffd060';
        }
        push();
        fill(btnBg);
        stroke(btnBorder);
        strokeWeight(1);
        rect(btnX, btnY, btnW, btnH, 4);
        pop();
        push();
        fill(btnText);
        noStroke();
        drawingContext.letterSpacing = '0.06em';
        textFont("'Cinzel', serif");
        textSize(10);
        textStyle(BOLD);
        textAlign(CENTER, CENTER);
        text(isListen ? '…press a key' : keyLabel(b.key), btnX + btnW / 2, btnY + btnH / 2);
        pop();
        settingsRegions.push({id: `settings-kb-${i}`, x: btnX, y: btnY, w: btnW, h: btnH});
    });

    const resetY = listY + binds.length * rowH + kbScrollY + 8;
    const resetW = 120, resetH = 28;
    const resetX = x + w - resetW;
    const rOver = settingsModalOpen && mouseX >= resetX && mouseX <= resetX + resetW && mouseY >= resetY && mouseY <= resetY + resetH;

    push();
    fill(rOver ? 'rgba(56, 26, 192, 0.12)' : 'rgba(192,40,26,0.3)');
    stroke(rOver ? '#f04030' : 'rgba(192,40,26,0.3)');
    strokeWeight(1);
    rect(resetX, resetY, resetW, resetH, 4);
    pop();

    push();
    fill(rOver ? '#f04030' : 'rgba(240,64,48,0.6)');
    noStroke();
    drawingContext.letterSpacing = '0.18em';
    textFont("'Cinzel', serif");
    textSize(9);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text('RESET TO DEFAULTS', resetX + resetW / 2, resetY + resetH / 2);
    pop();

    settingsRegions.push({id: 'settings-reset-keys', x: resetX, y: resetY, w: resetW, h: resetH});
}

let settingsListening = null;

function keyLabel(k) {
    return ({' ': 'Space'})[k] ?? (k.length === 1 ? k.toUpperCase() : k);
}

function startSettingsListen(index) {
    cancelSettingsListen();
    settingsListening = {index};
}

function cancelSettingsListen() {
    settingsListening = null;
}

function handleSettingsRegionClick(r) {
    if (r.id === 'settings-close') {
        settingsModalOpen = false;
        cancelSettingsListen();
    } else if (r.id.startsWith('settings-tab-')) {
        settingsTab = r.id.slice(13);
        cancelSettingsListen();
    } else if (r.id.startsWith('settings-slider-')) {
        dragSlider = {index: parseInt(r.id.slice(16)), startX: mouseX, startVal: settingsSliders[parseInt(r.id.slice(16))].value, trackW: r.slW};
    } else if (r.id.startsWith('settings-kb-')) {
        startSettingsListen(parseInt(r.id.slice(12)));
    } else if (r.id === 'settings-reset-keys') {
        binds = structuredClone(DEFAULT_BINDS);
        localStorage.removeItem('rq_binds');
        rebuildKeyMap();
        cancelSettingsListen();
    }
}

function rebuildKeyMap() {
    keyMap = {};
    for (const bind of binds) {
        keyMap[bind.key.toLowerCase()] = bind.action;
    }
}

window.mouseMoved = function() {
    if (gameState === "shop") shopMouseMoved();
}

window.mousePressed = function() {
    if (settingsModalOpen) {
        for (const r of settingsRegions) {
            if (mouseX >= r.x && mouseX <= r.x + r.w && mouseY >= r.y && mouseY <= r.y + r.h) {
                handleSettingsRegionClick(r);
                return;
            }
        }

        const popW = min(500, width * 0.94);
        const popH = 420;
        const popX = (width - popW) / 2;
        const popY = (height - popH) / 2;
        if (mouseX < popX || mouseX > popX + popW || mouseY < popY || mouseY > popY + popH) {
            settingsModalOpen = false;
            cancelSettingsListen();
        }
        return;
    }

    if (paused) {
        handlePauseMenuClick();
        return;
    }
    if (gameState === "shop") shopMouseClicked(getShopGameState());
}

window.keyPressed = function() {
    if (settingsModalOpen) {
        if (keyCode === ESCAPE) {
            if (settingsListening) {
                cancelSettingsListen();
            } else {
                settingsModalOpen = false;
            }
            return false;
        }
        if (!settingsListening) return;
        binds[settingsListening.index].key = key;
        localStorage.setItem('rq_binds', JSON.stringify(binds));
        rebuildKeyMap();
        cancelSettingsListen();
        return false;
    }

    if (key === "Escape" && gameState === "standard" && !gameOver) {
        if (paused && pauseSettingsOpen) {
            pauseSettingsOpen = false;
        } else {
            paused = !paused;
            if (!paused) pauseSettingsOpen = false;
        }
        return false;
    }

    if (gameState === "stageIntro") return;
    if (gameState === "shop") {
        shopKeyPressed(key, getShopGameState());
        return;
    }
    if (gameOver) {
        if (key === 'r' || key === 'R') {
            resetGame(); 
            return; 
        }
    }
    const action = keyMap[key.toLowerCase()];
    if(!action) return;

    if (action === "Pause" && gameState === "standard" && !gameOver) {
        paused = !paused;
        if (!paused) pauseSettingsOpen = false;
        return;
    }

    if (paused || !activePiece) return;

    switch(action) {
        case "Move Left" :
            leftHeld = true;
            lastHorizontalDir = -1;
            if (tryMove(activePiece, -BOX_SIZE, 0)) resetLockDelay();
            nextHorizontalMove = millis() + HORIZONTAL_REPEAT_DELAY;
            break;
        case "Move Right" :
            rightHeld = true;
            lastHorizontalDir = 1;
            if (tryMove(activePiece, BOX_SIZE, 0)) resetLockDelay(); 
            nextHorizontalMove = millis() + HORIZONTAL_REPEAT_DELAY;
            break;
        case "Soft Drop" :
            downHeld = true;
            if (tryMove(activePiece, 0, BOX_SIZE)) {
                //score += 1; //here if you want to make easier for testing
                lockStartedAt = 0;
            }
            lastDrop = millis();
            nextSoftDrop = millis() + SOFT_DROP_INTERVAL;
            break;
        case "Rotate" :
            if (!noRotate && activePiece.rotate(COLS, ROWS, originX, originY, board)) {
                currentPieceRotations++;
                resetLockDelay();
                break;
            } 
        case "Hard Drop" :
            let dropped = 0;
            while (tryMove(activePiece, 0, BOX_SIZE)) dropped++;
            score += dropped * 2;
            //turbo_booster relic
            lastMoveWasHardDrop = true;

            lockPiece();
            break;
        case "Hold Piece" :
            holdPiece();
            break;
    }
}

window.keyReleased = function() {
    const action = keyMap[key.toLowerCase()];
    if(!action) return;

    if (action === 'Move Left') {
        leftHeld = false;
        if (rightHeld) {
            lastHorizontalDir = 1;
            nextHorizontalMove = millis() + HORIZONTAL_REPEAT_DELAY;
        }
    } else if (action === 'Move Right') {
        rightHeld = false;
        if (leftHeld) {
            lastHorizontalDir = -1;
            nextHorizontalMove = millis() + HORIZONTAL_REPEAT_DELAY;
        }
    } else if (action === 'Soft Drop') {
        downHeld = false;
    }
}

window.mouseDragged = function() {
    if (dragSlider === null) return;
    const s = settingsSliders[dragSlider.index];
    const dx = mouseX - dragSlider.startX;
    s.value = constrain(dragSlider.startVal + round(dx / dragSlider.trackW * 100), 0, 100);
  }

window.mouseReleased = function() {
    dragSlider = null;
}

window.mouseWheel = function(event) {
    if (settingsModalOpen && settingsTab === 'keybinds') {
        kbScrollY = constrain(kbScrollY - event.delta * 0.4, -(binds.length * 36 - 180), 0);
        return false;
    }
}
// restarts the game
function resetGame() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    score = 0;
    scoreRequirement = 500;
    scoreIncrement = 250;
    scoreFactor = 2;
    stage = 1;
    level = 1;
    linesCleared = 0;
    numLockedPieces = 0;
    recollectionUsed = 0;
    relicsHeld = [];
    recollection = DEFAULT_RECOLLECTION;
    dropInterval = BASE_DROP_INTERVAL;
    gameOver = false;
    paused = false;
    pauseSettingsOpen = false;
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
    pauseSettingsOpen = false;
    settingsModalOpen = false;
    settingsModalProgress = 0;
    settingsTab = "general";
    kbScrollY = 0;
    dragSlider = null;
    cancelSettingsListen();
    nextType = randomPiece();
    activePiece  = spawnPiece();
    lastDrop = millis();
    beginStageIntro("standard");
    scoreSubmitted = false;
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
    lastHorizontalDir = 0;
    nextHorizontalMove = 0;
    nextSoftDrop = 0;
    lockStartedAt = 0;
    pauseSettingsOpen = false;
    nextType = randomPiece();
    activePiece  = spawnPiece();
    lastDrop = millis();
}
//attempt for adjusting for window resize, we need to figure out exactly how we want to handle it whether
//that is with ratios or with cap resolution and show a portion.
//has a few issues with resizing mid piece drop.
window.windowResized = function() {
    resizeCanvas(windowWidth, windowHeight);
    originX = (width - BOARD_W) / 2;
    originY = (height - BOARD_H) / 2;
}

function closeShop() {
    gameState = "standard";
    softReset();
    dropInterval = Math.max(80, BASE_DROP_INTERVAL - (stage - 1) * 100);
}

function setBinds() {
    binds = JSON.parse(localStorage.getItem('rq_binds') || 'null') || binds;
    rebuildKeyMap();
}

//leader board stuff
function getPlayerName() {
  let playerName = localStorage.getItem('rq_player_name');

  if (!playerName) {
    playerName = prompt("Enter your name for the leaderboard:") || "Anonymous";
    playerName = playerName.trim() || "Anonymous";
    localStorage.setItem('rq_player_name', playerName);
  }

  return playerName;
}
//setters
export function addSqrBonus(amount) {
    sqrBonus += amount;
}
export function setComboLineActive(value) {
    comboLineActive = value;
}
export function setTowerBuilderActive(value) {
    towerBuilderActive = value;
}
export function setSpin2WinActive(value) {
    spin2WinActive = value;
}
export function setTurboBoosterActive(value) {
    turboBoosterActive = value;
}
export function setDoubleHoldActive(value) {
    doubleHoldActive = value;
}

async function submitFinalScore() {
  if (scoreSubmitted) return;
  scoreSubmitted = true;

  const playerName = getPlayerName();
  await submitScore(playerName, score);
}

function getShopGameState() {
    return {
        pieceBag,
        dropInterval,
        board,
        COLS,
        skipNextBoss,
        holdUsed,
        noRotate,
        recollectionUsed,
        recollection,
        relicsHeld,

        sqrBonus,
        PerfectionBonus,
        scoreMultiBonus,
        addSqrBonus,

        setComboLineActive,
        setTowerBuilderActive,
        setSpin2WinActive,
        setTurboBoosterActive,
        setDoubleHoldActive,

        closeShop
    };
}