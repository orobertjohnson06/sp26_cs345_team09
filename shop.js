const CARD_W   = 160;
const CARD_H   = 230;
const CARD_GAP = 36;
const SHOP_ITEMS = [
    {
        id: "extra_pieces",
        name: "Extra Pieces",
        description: "Add 5 pieces\nto your bag",
        recollection: 1,
        apply() {

            pieceBag += 5;
        }
    },
    {
        id: "slow_fall",
        name: "Slow Fall",
        description: "Increase drop\ndelay by 75ms",
        recollection: 0,
        apply() {
            dropInterval = Math.min(500, dropInterval + 75);
        }
    },
    {
        id: "board_wipe",
        name: "Board Wipe",
        description: "Clear the\nbottom 5 rows",
        recollection: 0,
        apply() {
            for (let i = 0; i < 5; i++) {
                board.pop();
                board.unshift(Array(COLS).fill(null));
            }
        }
    },
    {
        id: "peace_treaty",
        name: "Peace Treaty",
        description: "Skip the next\nboss effect",
        recollection: 2,
        apply() {
            skipNextBoss = true;
        }
    },
    {
        id: "hold_unlock",
        name: "Hold Refresh",
        description: "Reset hold so\nyou can use it",
        recollection: 0,
        apply() {
            holdUsed = false;
        }
    },
    {
        id: "rotation_free",
        name: "Free Spin",
        description: "Ignore no-rotate\nfor next level",
        recollection: 1,
        apply() {
            noRotate = false;
            skipNextBoss = true;
        }
    },
];
 
//currently offered items 3 randomly chosen
let shopOfferedItems = [];
//which card the mouse is hovering over -1 is none
let shopHovered = -1;
 
/**
 * Picks 3 random unique items and resets hover state.
 * Call this from sketch.js when entering the shop.
 */
function initShop() {
    const shuffled = [...SHOP_ITEMS].sort(() => Math.random() - 0.5);
    shopOfferedItems = shuffled.slice(0, 3);
    shopHovered = -1;
}
 
/**
 * Returns the top-left x and y of a card at index i.
 */
function cardPosition(i) {
    const totalW = 3 * CARD_W + 2 * CARD_GAP;
    const startX = width / 2 - totalW / 2;
    const cardY  = height / 2 - CARD_H / 2 - 10;
    return { x: startX + i * (CARD_W + CARD_GAP), y: cardY };
}

/**
 * Draws the shop overlay.
 * Called from draw() in sketch.js when gameState === "shop".
 */
function drawShop() {
    background(18);
    const cx = width / 2;
    //Header
    noStroke();
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(36);
    text("SHOP", cx, height / 2 - 240);
    fill(160);
    textSize(13);
    text("Choose one upgrade to continue", cx, height / 2 - 200);
 
    //cards
    shopOfferedItems.forEach((item, i) => {
        const {x, y} = cardPosition(i);
        const hovered  = shopHovered === i;
        //card background
        fill(hovered ? 55 : 30);
        stroke(hovered ? 210 : 70);
        strokeWeight(hovered ? 2.5 : 1.5);
        rect(x, y, CARD_W, CARD_H, 10);
 
        // White filler sprite (placeholder til we get sprites)
        fill(255);
        noStroke();
        const iconSize = 52;
        const iconX    = x + CARD_W / 2 - iconSize / 2;
        const iconY    = y + 18;
        rect(iconX, iconY, iconSize, iconSize, 4);
        stroke(200);
        strokeWeight(1);
        noFill();
        rect(iconX + 2, iconY + 2, iconSize - 4, iconSize - 4, 3);
        //item name
        noStroke();
        fill(255);
        textSize(14);
        textAlign(CENTER, TOP);
        text(item.name, x + CARD_W / 2, y + 86);
        //item description
        fill(170);
        textSize(11);
        text(item.description, x + CARD_W / 2, y + 112);
        text("Recollection: " + item.recollection, x + CARD_W / 2, y + 140)
        //key hint at bottom
        fill(hovered ? 255 : 130);
        textSize(11);
        text("[" + (i + 1) + "]  Select", x + CARD_W / 2, y + CARD_H - 22);
    });
    //footer
    noStroke();
    fill(90);
    textSize(11);
    textAlign(CENTER, BOTTOM);
    text("Press 1 / 2 / 3  or  click a card", cx, height / 2 + CARD_H / 2 + 50);
}
//Input handling called from board
/**
 * Handle number-key selection in the shop.
 */
function shopKeyPressed(k) {
    const idx = parseInt(k) - 1;
    if (idx >= 0 && idx < shopOfferedItems.length) {
        applyShopItem(idx);
    }
}
 
/**
 * Update hovered card based on mouse position.
 */
function shopMouseMoved() {
    shopHovered = -1;
    shopOfferedItems.forEach((_, i) => {
        const { x, y } = cardPosition(i);
        if (mouseX >= x && mouseX <= x + CARD_W &&
            mouseY >= y && mouseY <= y + CARD_H) {
            shopHovered = i;
        }
    });
}
 
/**
 * Handle mouse click selection.
 * Call from p5's mouseClicked() in sketch.js.
 */
function shopMouseClicked() {
    if (shopHovered !== -1) {
        applyShopItem(shopHovered);
    }
}
 
function applyShopItem(i) {
    // if item exceeds max recollection, do nothing.
    if (recollection + shopOfferedItems[i].recollection > maxRecollection) {

    } else {
        shopOfferedItems[i].apply();
        recollection += shopOfferedItems[i].recollection;
        closeShop();
    }
}