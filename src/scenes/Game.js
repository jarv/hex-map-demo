import Phaser from "phaser";

import { MAP_AREA, WIDTH, HEIGHT, COLORS, IMG } from "./../constants";
import { CubeCoord } from "./util/CubeCoord";
import { Sector, SectorType, SectorVisibility } from "./util/Sector";
import { SectorMap } from "./util/SectorMap";

const CENTER_TWEEN_MS = 150;
const ZOOM_STEP = 0.15;

export class Game extends Phaser.Scene {
  constructor() {
    super("Game");
    this._travelQueue = [];
    this._traveling = false;
    this._centerTween = null;
    this._occupiedSector = null;
  }

  create(data) {
    this.cameras.main.setBackgroundColor(COLORS.background);

    this.mapContainer = this.add.container(0, 0);

    this.sectorMap = new SectorMap(this, 10, 8, this.mapContainer);

    this._loadMap(data.mapData);

    const startPos = this._playerCC.getCoordPosition();
    this._playerSprite = this.add.sprite(
      startPos.x,
      startPos.y,
      IMG.escapePodBlue,
    );
    this._playerSprite.setScale(0.85);
    this.mapContainer.add(this._playerSprite);

    this._snapCenterOnPlayer();

    this._revealAround(this._playerCC);

    this.sectorMap.setupClickHandler();
    this.sectorMap.onPlayerMove = (q, r) => this._onTapSector(q, r);

    this._buildZoomButtons();
    this._buildResetButton();
    this._setupKeyboard();
  }

  _loadMap(mapData) {
    this._start = mapData.start;
    for (const sd of mapData.sectors) {
      const cc = new CubeCoord(sd.q, sd.r);
      const sectorType = sd.t === 0 ? SectorType.Path : SectorType.Edge;
      const sector = new Sector(this, cc, sectorType);
      this.sectorMap.addSector(sector);
    }
    this._playerCC = new CubeCoord(this._start.q, this._start.r);
  }

  _snapCenterOnPlayer() {
    const pos = this._playerCC.getCoordPosition();
    const scale = this.sectorMap.currentZoom;
    this.mapContainer.x = WIDTH / 2 - pos.x * scale;
    this.mapContainer.y = HEIGHT / 2 - pos.y * scale;
  }

  _tweenCenterOnPlayer() {
    if (this._centerTween) {
      this._centerTween.stop();
      this._centerTween = null;
    }
    const pos = this._playerCC.getCoordPosition();
    const scale = this.sectorMap.currentZoom;
    const targetX = WIDTH / 2 - pos.x * scale;
    const targetY = HEIGHT / 2 - pos.y * scale;

    this._centerTween = this.tweens.add({
      targets: this.mapContainer,
      x: targetX,
      y: targetY,
      duration: CENTER_TWEEN_MS,
      ease: "Quad.easeOut",
      onComplete: () => {
        this._centerTween = null;
      },
    });
  }

  _revealAround(cc) {
    if (
      this._occupiedSector &&
      this._occupiedSector !== this.sectorMap.sectors.get(cc.key)
    ) {
      this._occupiedSector.setVisited();
    }

    const current = this.sectorMap.sectors.get(cc.key);
    if (current) {
      current.setOccupied();
      this._occupiedSector = current;
    }

    for (const neighbor of cc.neighbors()) {
      const path = this.sectorMap.sectors.get(neighbor.key);
      if (path && path.visibility === SectorVisibility.Hidden) {
        path.setSeen();
      }
      const edge = this.sectorMap.edgeSectors.get(neighbor.key);
      if (edge && edge.visibility === SectorVisibility.Hidden) {
        edge.setSeen();
      }
    }
  }

  _onTapSector(q, r) {
    if (this._traveling) return;

    const dest = new CubeCoord(q, r);
    if (dest.key === this._playerCC.key) return;

    const path = this._playerCC.findShortestPath(this.sectorMap.sectors, dest);
    if (!path || path.length < 2) return;

    this._travelQueue = path.slice(1);
    this._traveling = true;
    this._stepTravel();
  }

  _stepTravel() {
    if (this._travelQueue.length === 0) {
      this._traveling = false;
      return;
    }

    const nextCC = this._travelQueue.shift().cc;
    const fromCC = this._playerCC;

    const targetAngle = Phaser.Math.Angle.WrapDegrees(
      fromCC.getDirection(nextCC),
    );
    const angleDiff = Phaser.Math.Angle.ShortestBetween(
      this._playerSprite.angle,
      targetAngle,
    );
    const newTargetAngle = this._playerSprite.angle + angleDiff;

    const nextPos = nextCC.getCoordPosition();

    this.tweens.chain({
      tweens: [
        {
          targets: this._playerSprite,
          angle: newTargetAngle,
          duration: 50,
          ease: "Cubic.InOut",
        },
        {
          targets: this._playerSprite,
          x: nextPos.x,
          y: nextPos.y,
          duration: 100,
          ease: "Sine.InOut",
        },
      ],
      onComplete: () => {
        this._playerCC = nextCC;
        this.mapContainer.bringToTop(this._playerSprite);
        this._revealAround(nextCC);
        this._tweenCenterOnPlayer();
        this._stepTravel();
      },
    });
  }

  _tryMoveByDelta(dq, dr) {
    if (this._traveling) return;
    const dest = new CubeCoord(this._playerCC.q + dq, this._playerCC.r + dr);
    if (!this.sectorMap.sectors.has(dest.key)) return;
    this._travelQueue = [this.sectorMap.sectors.get(dest.key)];
    this._traveling = true;
    this._stepTravel();
  }

  _setupKeyboard() {
    const kUp = this.input.keyboard.addKey("UP");
    const kDown = this.input.keyboard.addKey("DOWN");
    const kLeft = this.input.keyboard.addKey("LEFT");
    const kRight = this.input.keyboard.addKey("RIGHT");
    const kW = this.input.keyboard.addKey("W");
    const kS = this.input.keyboard.addKey("S");
    const kA = this.input.keyboard.addKey("A");
    const kD = this.input.keyboard.addKey("D");
    const kPlus = this.input.keyboard.addKey("PLUS");
    const kMinus = this.input.keyboard.addKey("MINUS");
    const kEqual = this.input.keyboard.addKey("EQUAL");

    let lastHorizontalDir = "east";

    const COMBO_WINDOW_MS = 50;
    let pendingMove = null;

    const resolveMove = () => {
      pendingMove = null;
      if (this._traveling) return;

      const isNorth = kUp.isDown || kW.isDown;
      const isSouth = kDown.isDown || kS.isDown;
      const isEast = kRight.isDown || kD.isDown;
      const isWest = kLeft.isDown || kA.isDown;

      if (isNorth && isSouth) return;
      if (isEast && isWest) return;

      const canMove = (dq, dr) =>
        this.sectorMap.sectors.has(
          `${this._playerCC.q + dq},${this._playerCC.r + dr}`,
        );

      const go = (dq, dr) => {
        if (dq > 0 || (dq === 0 && dr === 1)) lastHorizontalDir = "east";
        else if (dq < 0 || (dq === 0 && dr === -1)) lastHorizontalDir = "west";
        this._tryMoveByDelta(dq, dr);
      };

      if (isNorth && isEast) {
        if (canMove(1, -1)) go(1, -1);
        return;
      }
      if (isNorth && isWest) {
        if (canMove(0, -1)) go(0, -1);
        return;
      }
      if (isSouth && isEast) {
        if (canMove(0, 1)) go(0, 1);
        return;
      }
      if (isSouth && isWest) {
        if (canMove(-1, 1)) go(-1, 1);
        return;
      }

      if (isEast) {
        if (canMove(1, 0)) {
          go(1, 0);
          return;
        }
        const ne = canMove(1, -1),
          se = canMove(0, 1);
        if (ne && !se) go(1, -1);
        else if (se && !ne) go(0, 1);
        return;
      }

      if (isWest) {
        if (canMove(-1, 0)) {
          go(-1, 0);
          return;
        }
        const nw = canMove(0, -1),
          sw = canMove(-1, 1);
        if (nw && !sw) go(0, -1);
        else if (sw && !nw) go(-1, 1);
        return;
      }

      if (isNorth) {
        const pref = lastHorizontalDir === "east" ? [1, -1] : [0, -1];
        const fall = lastHorizontalDir === "east" ? [0, -1] : [1, -1];
        if (canMove(...pref)) go(...pref);
        else if (canMove(...fall)) go(...fall);
        return;
      }

      if (isSouth) {
        const pref = lastHorizontalDir === "east" ? [0, 1] : [-1, 1];
        const fall = lastHorizontalDir === "east" ? [-1, 1] : [0, 1];
        if (canMove(...pref)) go(...pref);
        else if (canMove(...fall)) go(...fall);
      }
    };

    const handleMove = () => {
      if (pendingMove) clearTimeout(pendingMove);
      pendingMove = setTimeout(resolveMove, COMBO_WINDOW_MS);
    };

    this.input.keyboard.on("keydown", (e) => {
      switch (e.code) {
        case "ArrowUp":
        case "KeyW":
        case "ArrowDown":
        case "KeyS":
        case "ArrowLeft":
        case "KeyA":
        case "ArrowRight":
        case "KeyD":
          handleMove();
          break;
        case "Equal":
        case "NumpadAdd":
          this.sectorMap.zoom(ZOOM_STEP);
          this._snapCenterOnPlayer();
          break;
        case "Minus":
        case "NumpadSubtract":
          this.sectorMap.zoom(-ZOOM_STEP);
          this._snapCenterOnPlayer();
          break;
      }
    });

    void kPlus;
    void kMinus;
    void kEqual;
    void kUp;
    void kDown;
    void kLeft;
    void kRight;
    void kW;
    void kS;
    void kA;
    void kD;
  }

  _resetMap() {
    this.scene.start("Generating");
  }

  _buildZoomButtons() {
    const btnSize = 36;
    const btnX = 12;
    const btnY = 12;
    const gap = 6;

    const makeBtn = (x, y, label, onClick) => {
      const bg = this.add.rectangle(x, y, btnSize, btnSize, 0x333333, 0.85);
      bg.setOrigin(0, 0);
      bg.setDepth(100);
      const txt = this.add.text(x + btnSize / 2, y + btnSize / 2, label, {
        fontSize: "20px",
        color: COLORS.white,
        fontFamily: "monospace",
      });
      txt.setOrigin(0.5, 0.5);
      txt.setDepth(101);
      bg.setInteractive({ useHandCursor: true });
      bg.on("pointerover", () => bg.setFillStyle(0x555555, 0.95));
      bg.on("pointerout", () => bg.setFillStyle(0x333333, 0.85));
      bg.on("pointerup", onClick);
    };

    makeBtn(btnX, btnY, "+", () => {
      this.sectorMap.zoom(ZOOM_STEP);
      this._snapCenterOnPlayer();
    });
    makeBtn(btnX, btnY + btnSize + gap, "−", () => {
      this.sectorMap.zoom(-ZOOM_STEP);
      this._snapCenterOnPlayer();
    });
  }

  _buildResetButton() {
    const btnW = 100;
    const btnH = 36;
    const btnX = WIDTH - btnW - 12;
    const btnY = 12;

    const bg = this.add.rectangle(btnX, btnY, btnW, btnH, 0x333333, 0.85);
    bg.setOrigin(0, 0);
    bg.setDepth(100);

    const label = this.add.text(btnX + btnW / 2, btnY + btnH / 2, "Reset", {
      fontSize: "15px",
      color: COLORS.white,
      fontFamily: "monospace",
    });
    label.setOrigin(0.5, 0.5);
    label.setDepth(101);

    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerover", () => bg.setFillStyle(0x555555, 0.95));
    bg.on("pointerout", () => bg.setFillStyle(0x333333, 0.85));
    bg.on("pointerup", () => this._resetMap());
  }
}
