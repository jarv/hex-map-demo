import Phaser from "phaser";
import { WIDTH, HEIGHT, COLORS } from "./../constants";
import { generateMap } from "./util/MapGenerator";

export class Generating extends Phaser.Scene {
  constructor() {
    super("Generating");
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.background);

    this.add
      .text(WIDTH / 2, HEIGHT / 2, "Generating map...", {
        fontSize: "20px",
        color: COLORS.white,
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const mapData = generateMap();
        this.scene.start("Game", { mapData });
      });
    });
  }
}
