import {sqrBonus, PerfectionBonus, scoreMultiBonus, setSpin2WinActive,
   setComboLineActive, setTowerBuilderActive,
   setTurboBoosterActive, setDoubleHoldActive} from "./board.js";
export const RARITY = Object.freeze({
  COMMON: {label: "Common", color: "#b0b0b0", spawnWeight: 60},
  RARE: {label: "Rare", color: "#2196f3", spawnWeight: 25},
  EPIC: {label: "Epic", color: "#9c27b0", spawnWeight:  10},
  LEGENDARY: {label: "Legendary", color: "#ff9800", spawnWeight: 4},
  UNIQUE: {label: "Unique", color: "#d40e95", spawnWeight: 1}
});

const TOTAL_WEIGHT = Object.values(RARITY).reduce(
  (sum, r) => sum + r.spawnWeight, 0
);

class Relic {
  /**
   * @param {object} config
   * @param {string} config.id - Unique identifier ("fire_orb")
   * @param {string} config.name - Display name
   * @param {string} config.sprite - Path to sprite image
   * @param {string} config.rarity - Key from RARITY
   * @param {string} config.description - flavor text
   * @param {Function} config.ability  - function(player, context) called on activate
   */
  constructor({id, name, sprite, rarity, description = "", ability}) {
    this.id = id;
    this.name = name;
    this.sprite = sprite;
    this.rarity = RARITY[rarity];
    this.rarityKey = rarity;
    this.description = description;
    this.ability = ability;
    this.spawnChance = +(this.rarity.spawnWeight / TOTAL_WEIGHT * 100).toFixed(2);
  }

  activate(game) {
    this.ability(game);
  }

  static rollRandom(pool) {
    if (!pool || pool.length === 0) return null;
    const totalWeight = pool.reduce((s, r) => s + r.rarity.spawnWeight, 0);
    let roll = Math.random() * totalWeight;

    for (const relic of pool) {
      roll -= relic.rarity.spawnWeight;
      if (roll <= 0) return relic;
    }
  }

  static filterByRarity(pool, rarityKey) {
    return pool.filter((r) => r.rarityKey === rarityKey);
  }

  static rollAny() {
    return this.rollRandom(RELICS);
  }
}

export const RELICS = [
  new Relic({
    id: "slow_down",
    name: "Slow Down",
    sprite: "assets/relics/common_slowdown.png",
    rarity: "COMMON",
    description: "essence of the ice age.",
    ability(game) {
      game.dropInterval *= 0.8;
    },
  }),

  new Relic({
    id: "square^2",
    name: "Square squared",
    sprite: "assets/relics/common_squaresquared.png",
    rarity: "COMMON",
    description: "every placed square increases this score bonus by 2",
    ability(game) {
      game.addSqrBonus(2);
    },
  }),

  new Relic({
    id: "perfectionist",
    name: "Perfectionist",
    sprite: "assets/relics/common_perfectionist.png",
    rarity: "COMMON",
    description: "every tetris increases this score bonus by 20",
    ability(game) {
      game.PerfectionBonus += 20;
    },
  }),

  new Relic({
    id: "score_multi",
    name: "Score Multi",
    sprite: "assets/relics/common_scoremulti.png",
    rarity: "COMMON",
    description: "Increases score by +5% per line cleared",
    ability(game) {
      game.scoreMultiBonus += 0.05;
    },
  }),
  new Relic({
    id: "combo_line",
    name: "Combo Line",
    sprite: "assets/relics/rare_comboline.png",
    rarity: "RARE",
    description: "Every consecutive line clear gains +50% stacking score.",
    ability(game) {
      game.setComboLineActive(true);
    },
  }),

  new Relic({
    id: "tower_builder",
    name: "Tower Builder",
    sprite: "assets/relics/rare_towerbuilder.png",
    rarity: "RARE",
    description: "If the tower is above 60% of the board lines cleared gain 40% score.",
    ability(game) {
      game.setTowerBuilderActive(true);
    },
  }),
  new Relic({
    id: "spin_2_win",
    name: "Spin 2 Win",
    sprite: "assets/relics/rare_spin2win.png",
    rarity: "RARE",
    description: "Gain +2% score per full rotation on the piece that cleared the line.",
    ability(game) {
      game.setSpin2WinActive(true);
    },
  }),
  new Relic({
    id: "turbo_booster",
    name: "Turbo Booster",
    sprite: "assets/relics/epic_turboboost.png",
    rarity: "EPIC",
    description: "Hard dropping a piece\nincreases score by +20%.",
    ability(game) {
      game.setTurboBoosterActive(true);
    },
  }),
  new Relic({
    id: "holder",
    name: "Holder",
    sprite: "assets/relics/epic_holder.png",
    rarity: "EPIC",
    description: "Allows holding an extra piece.",
    ability(game) {
      game.setDoubleHoldActive(true);
    },
  }),
  
];