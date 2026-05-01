import { setNoRotate, setDropInterval } from "./board.js";
class Boss {
  /**
   * @param {object} config
   * @param {string} config.id - Unique identifier ("literally_die")
   * @param {string} config.name - Display name
   * @param {string} config.sprite - Path to sprite image
   * @param {string} config.description - flavor text
   * @param {Function} config.ability  - function(player, context) called on activate
   */
  constructor({id, name, sprite, description = "", ability, end}) {
    this.id = id;
    this.name = name;
    this.sprite = sprite;
    this.description = description;
    this.ability = ability;
    this.end = end;
  }

  activate() {
    this.ability();
  }
  deactivate() {
    this.end();
  }
}

export const BOSSES = [
  new Boss({
    id: "no_rotate",
    name: "No Rotate",
    sprite: "no sprite!",
    description: "Lose the ability to rotate pieces.",
    ability() {
      setNoRotate(true);
    },
    end() {
        setNoRotate(false);
    }
  }),

  new Boss({
    id: "double_time",
    name: "Double Time",
    sprite: "no sprite!",
    description: "Pieces fall much faster.",
    ability() {
        setDropInterval(0.33);
    },
    end() {
        // drop interval is set automatically after boss level. no need to reset.
        return;
    }
  })
];