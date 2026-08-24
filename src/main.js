import Phaser from "phaser";
import { Loading } from "./scenes/Loading";
import { Generating } from "./scenes/Generating";
import { Game } from "./scenes/Game";
import { WIDTH, HEIGHT, COLORS } from "./constants.js";

const config = {
  type: Phaser.AUTO,
  width: WIDTH,
  height: HEIGHT,
  parent: "game-container",
  backgroundColor: COLORS.background,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  loader: {
    baseURL: "https://jarv.github.io/hex-map-demo",
  },
  scene: [Loading, Generating, Game],
};

window.game = new Phaser.Game(config);
