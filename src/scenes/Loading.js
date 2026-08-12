import Phaser from "phaser";
import { IMG, COLORS } from "./../constants";

export class Loading extends Phaser.Scene {
  constructor() {
    super("Loading");
  }

  preload() {
    this.cameras.main.setBackgroundColor(COLORS.background);

    this.add
      .text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2,
        "Loading...",
        {
          fontSize: "20px",
          fill: COLORS.white,
        },
      )
      .setOrigin(0.5);

    this.load.image(IMG.hexTilePath, "assets/hexmap-64px-white.png");
    this.load.image(IMG.hexTileEdge, "assets/hexmap-64px-black.png");
    this.load.image(IMG.escapePodBlue, "assets/escape-pod-blue-64px.png");
  }

  create() {
    this.scene.start("Generating");
  }
}
