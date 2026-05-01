import { relicsHeld } from "./board.js";
import { RELICS } from "./relic.js";

const CARD_W   = 160;
const CARD_H   = 230;
const CARD_GAP = 36;

let shopOpenedAt = -Infinity;

const RARITY_COST = {
  COMMON: 1,
  RARE: 2,
  EPIC: 3,
  LEGENDARY: 4,
  UNIQUE: 5,
};

const SHOP_ITEMS = [
  {
    id: "extra_pieces",
    name: "Extra Pieces",
    description: "Add 5 pieces to your bag",
    cost: 1,
    apply(game) { game.pieceBag += 5; }
  },
  {
    id: "slow_fall",
    name: "Slow Fall",
    description: "Increase drop delay by 75ms",
    cost: 1,
    apply(game) { game.dropInterval = Math.min(500, game.dropInterval + 75); }
  },
  {
    id: "board_wipe",
    name: "Board Wipe",
    description: "Clear the bottom 5 rows",
    cost: 1,
    apply(game) {
      for (let i = 0; i < 5; i++) {
        game.board.pop();
        game.board.unshift(Array(COLS).fill(null));
      }
    }
  },
  {
    id: "peace_treaty",
    name: "Peace Treaty",
    description: "Skip the next boss effect",
    cost: 1,
    apply(game) { game.skipNextBoss = true; }
  },
  {
    id: "hold_unlock",
    name: "Hold Refresh",
    description: "Reset hold so you can use it",
    cost: 1,
    apply(game) { game.holdUsed = false; }
  },
  {
    id: "rotation_free",
    name: "Free Spin",
    description: "Ignore no-rotate for next level",
    cost: 1,
    apply(game) {
      game.noRotate = false;
      game.skipNextBoss = true;
    }
  },
];

let shopOfferedItems = [];
let shopHovered = -1;
let shopErrorUntil = 0;

// Keys are relic ids, values are p5.Image objects loaded via preload
const spriteCache = {};

export function preloadRelicSprites() {
  for (const relic of RELICS) {
    if (relic.sprite) {
      spriteCache[relic.id] = loadImage(
        relic.sprite,
        () => {}, 
        () => { delete spriteCache[relic.id]; } //falls back if can't load img
      );
    }
  }
}

function relicCost(item) {
  return Number.isFinite(item.cost) ? item.cost : 1;
}

function weightedPickN(pool, n) {
  const remaining = [...pool];
  const picked = [];
  while (picked.length < n && remaining.length > 0) {
    const totalW = remaining.reduce((s, it) => s + it.weight, 0);
    let roll = Math.random() * totalW;
    for (let i = 0; i < remaining.length; i++) {
      roll -= remaining[i].weight;
      if (roll <= 0) {
        picked.push(remaining.splice(i, 1)[0]);
        break;
      }
    }
  }
  return picked;
}

function relicToShopItem(relic) {
  return {
    id: relic.id,
    name: relic.name,
    description: relic.description,
    cost: RARITY_COST[relic.rarityKey] ?? 1,
    rarityColor: relic.rarity.color,
    rarityLabel: relic.rarity.label,
    weight: relic.rarity.spawnWeight,
    isRelic: true,
    relicRef: relic,
  };
}

export function initShop() {
  const shopPool = SHOP_ITEMS.map(item => ({
    ...item,
    rarityColor: "#b0b0b0",
    rarityLabel: "Upgrade",
    weight: 30,
    isRelic: false,
  }));

  const relicPool = RELICS.map(relicToShopItem);
  shopOpenedAt = millis();
  shopOfferedItems = weightedPickN([...shopPool, ...relicPool], 3);
  // shopOfferedItems = weightedPickN([...shopPool, ...relicPool], 3);
  shopHovered = -1;
  shopErrorUntil = 0;
}

function cardPosition(i) {
  const totalW = 3 * CARD_W + 2 * CARD_GAP;
  const startX = width / 2 - totalW / 2;
  const cardY  = height / 2 - CARD_H / 2 - 10;
  return { x: startX + i * (CARD_W + CARD_GAP), y: cardY };
}

export function drawShop(recollectionUsed, recollection) {
  background(18);
  const cx = width / 2;

  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(36);
  text("SHOP", cx, height / 2 - 240);
  fill(160);
  textSize(13);
  text("Choose one upgrade to continue", cx, height / 2 - 200);
  fill(220);
  textSize(14);
  text("Recollection: " + recollectionUsed + " / " + recollection, cx, height / 2 - 176);

  shopOfferedItems.forEach((item, i) => {
    const { x, y } = cardPosition(i);
    const hovered = shopHovered === i;
    //card background
    fill(hovered ? 55 : 30);
    stroke(hovered ? 210 : 70);
    strokeWeight(hovered ? 2.5 : 1.5);
    rect(x, y, CARD_W, CARD_H, 10);
    //rarity color bar
    if (item.rarityColor) {
      noStroke();
      fill(item.rarityColor);
      rect(x + 10, y + 6, CARD_W - 20, 4, 2);
    }
    const iconSize = 52;
    const iconX = x + CARD_W / 2 - iconSize / 2;
    const iconY = y + 18;
    if (item.isRelic && spriteCache[item.id]) {
      noSmooth();
      image(spriteCache[item.id], iconX, iconY, iconSize, iconSize);
      smooth();
    } else {
      fill(255);
      noStroke();
      rect(iconX, iconY, iconSize, iconSize, 4);
      stroke(200);
      strokeWeight(1);
      noFill();
      rect(iconX + 2, iconY + 2, iconSize - 4, iconSize - 4, 3);
    }
    //rarity label
    if (item.rarityLabel) {
      noStroke();
      fill(item.rarityColor ?? "#b0b0b0");
      textSize(10);
      textAlign(CENTER, TOP);
      text(item.rarityLabel.toUpperCase(), x + CARD_W / 2, y + 78);
    }
    //item name
    noStroke();
    fill(255);
    textSize(14);
    textAlign(CENTER, TOP);
    text(item.name, x + CARD_W / 2, y + 90);

    const descPad = 10;
    const descW = CARD_W - descPad * 2;
    const descH = 48;
    fill(170);
    textSize(11);
    textAlign(CENTER, TOP);
    text(item.description, x + descPad, y + 110, descW, descH);
    fill(200);
    textSize(11);
    textAlign(CENTER, TOP);
    text("Cost: " + relicCost(item), x + CARD_W / 2, y + 168);
    fill(hovered ? 255 : 130);
    textSize(11);
    text("[" + (i + 1) + "]  Select", x + CARD_W / 2, y + CARD_H - 22);
  });

  if (millis() < shopErrorUntil) {
    noStroke();
    fill(255, 120, 120);
    textAlign(CENTER, CENTER);
    textSize(13);
    text("Not enough recollection", cx, height / 2 + CARD_H / 2 + 28);
  }
  noStroke();
  fill(90);
  textSize(11);
  textAlign(CENTER, BOTTOM);
  text("Press 1 / 2 / 3  or  click a card", cx, height / 2 + CARD_H / 2 + 50);
}

export function shopKeyPressed(k, game) {
  const idx = parseInt(k) - 1;
  if (idx >= 0 && idx < shopOfferedItems.length) {
    applyShopItem(idx, game);
  }
}

export function shopMouseMoved() {
  shopHovered = -1;
  shopOfferedItems.forEach((_, i) => {
    const { x, y } = cardPosition(i);
    if (mouseX >= x && mouseX <= x + CARD_W &&
        mouseY >= y && mouseY <= y + CARD_H) {
      shopHovered = i;
    }
  });
}

export function shopMouseClicked(game) {
  if (millis() - shopOpenedAt < 200) return;
  for (let i = 0; i < shopOfferedItems.length; i++) {
    const { x, y } = cardPosition(i);
    if (mouseX >= x && mouseX <= x + CARD_W &&
        mouseY >= y && mouseY <= y + CARD_H) {
      applyShopItem(i, game);
      return;
    }
  }
}

export function applyShopItem(i, game) {
  const item = shopOfferedItems[i];
  const cost = relicCost(item);
  if (game.recollectionUsed + cost > game.recollection) {
    shopErrorUntil = millis() + 900;
    return;
  }
  try {
    if(!item.isRelic)
      item.apply(game);
  } catch (e) {
    console.error(`Shop item "${item.id}" apply() threw:`, e);
  }
  if (item.isRelic) {
    game.relicsHeld.push(item.relicRef);
  }
  game.closeShop();
}