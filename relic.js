export const RARITY = Object.freeze({
  COMMON: {label: "Common", color: "#b0b0b0", spawnWeight: 20},
  RARE: {label: "Rare", color: "#2196f3", spawnWeight: 10},
  EPIC: {label: "Epic", color: "#9c27b0", spawnWeight:  5},
  LEGENDARY: {label: "Legendary", color: "#ff9800", spawnWeight: 3},
  UNIQUE: {label: "Unique", color: "#d40e95", spawnWeight: 100}
});


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
    this.active = false;
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
    description: "Slows the descent of pieces by 25%.",
    ability(game) {
      game.slowed = this.active;
    },
  }),
  new Relic({
    id: "square^2",
    name: "Square squared",
    sprite: "assets/relics/common_squaresquared.png",
    rarity: "COMMON",
    description: "Each square placed grants +2 base score, increasing by +2 every time.",
    ability(game) {
      game.sqrBonusActive = this.active;
    },
  }),
  new Relic({
    id: "rock_bottom",
    name: "Rock Bottom",
    sprite: "assets/relics/common_rockbottom.png",
    rarity: "COMMON",
    description: "Grants +0.2 score multi for pieces placed on bottom 3 rows.",
    ability(game) {
      game.rockBottomActive = this.active;
    },
  }),
  new Relic({
    id: "score_multi",
    name: "Score Multi",
    sprite: "assets/relics/common_scoremulti.png",
    rarity: "COMMON",
    description: "Increases score multi of line clears by +0.05x per line clear this level.",
    ability(game) {
      game.scoreMultiActive = this.active;
    },
  }),
  new Relic({
      id: "cleaner",
      name: "Cleaner",
      sprite: "assets/relics/common_cleaner.png",
      rarity: "COMMON",
      description: "Performing a line clear that empties the board grants +1 score multi.",
      ability(game) {
        game.cleanerActive = this.active;
      },
    }),
  new Relic({
    id: "combo_line",
    name: "Combo Line",
    sprite: "assets/relics/rare_comboline.png",
    rarity: "RARE",
    description: "Each consecutive piece that clears a line grants +0.5 score multi.",
    ability(game) {
      game.comboLineActive = this.active;
    },
  }),
  new Relic({
    id: "swan_song",
    name: "Swan Song",
    sprite: "assets/relics/rare_swansong.png",
    rarity: "RARE",
    description: "The last piece from your piece bag grants 2.5x score multi.",
    ability(game) {
      game.swanSongActive = this.active;
    },
  }),
  new Relic({
    id: "tower_builder",
    name: "Tower Builder",
    sprite: "assets/relics/rare_towerbuilder.png",
    rarity: "RARE",
    description: "Lines clears with at least one line in the top 8 rows grants 1.4x score multi.",
    ability(game) {
      game.towerBuilderActive = this.active;
    },
  }),
  new Relic({
    id: "spin_2_win",
    name: "Spin 2 Win",
    sprite: "assets/relics/rare_spin2win.png",
    rarity: "RARE",
    description: "Increases base score of pieces by +1 per rotation done before placing.",
    ability(game) {
      game.spin2WinActive = this.active;
    },
  }),
  new Relic({
    id: "turbo_booster",
    name: "Turbo Booster",
    sprite: "assets/relics/epic_turboboost.png",
    rarity: "EPIC",
    description: "Hard dropping a piece to clear a line grants +0.2x score multi.",
    ability(game) {
      game.turboBoosterActive = this.active;
    },
  }),
  new Relic({
    id: "holder",
    name: "Holder",
    sprite: "assets/relics/epic_holder.png",
    rarity: "EPIC",
    description: "Allows holding an extra piece.",
    ability(game) {
      game.doubleHoldActive = this.active;
    },
  }),
  new Relic({
    id: "extra_firepower",
    name: "Extra Firepower",
    sprite: "assets/relics/epic_extrafirepower.png",
    rarity: "EPIC",
    description: "Clearing 4 lines at once clears the line above it as well (counts as 5 lines).",
    ability(game) {
      game.extraFirepowerActive = this.active;
    },
  }),
  new Relic({
    id: "stack_master",
    name: "Stack Master",
    sprite: "assets/relics/epic_stackmaster.png",
    rarity: "EPIC",
    description: "Grants +0.5% score multi per tile above the half way point of the board.",
    ability(game) {
      game.stackMasterActive = this.active;
    },
  }),
  new Relic({
    id: "bubble_up",
    name: "Bubble Up",
    sprite: "assets/relics/legendary_bubbleup-Sheet-export.png",
    rarity: "LEGENDARY",
    description: "Clearing 2+ lines causes consecutive lines with 9 tiles to clear as well (up to 2 additional lines).",
    ability(game) {
      game.bubbleUpActive = this.active;
    },
  }),
  new Relic({
    id: "lets_go_gambling",
    name: "Let's Go Gambling!",
    sprite: "assets/relics/legendary_letsgogambling-Sheet-export.png",
    rarity: "LEGENDARY",
    description: "Getting the same piece 3 times in a row multiplies your total score for this level by 1.2x.",
    ability(game) {
      game.letsGoGamblingActive = this.active;
    },
  }),
  new Relic({
    id: "duplicator",
    name: "Duplicator",
    sprite: "assets/relics/unique_duplicator-Sheet-export.png",
    rarity: "UNIQUE",
    description: "When used, duplicates your current piece and queues it.",
    ability(game) {
      game.duplicatorActive = this.active;
    },
  }),
  new Relic({
    id: "thermonuclear_bomb",
    name: "Thermonuclear Bomb",
    sprite: "assets/relics/unique_thermonuclear-Sheet-export.png",
    rarity: "UNIQUE",
    description: "Once per level, use your relic key to clear the bottom 3 lines and drop everything down.",
    ability(game) {
      game.thermonuclearActive = this.active;
    },
  }),
  
];