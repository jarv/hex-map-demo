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
    this._buildDebugOverlay();
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
        if (this._travelQueue.length === 0 && this._repeatMove) {
          this._repeatMove();
        }
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

    const DIRS = [
      { name: "E",  dq:  1, dr:  0, angle:   0 },
      { name: "SE", dq:  0, dr:  1, angle:  60 },
      { name: "SW", dq: -1, dr:  1, angle: 120 },
      { name: "W",  dq: -1, dr:  0, angle: 180 },
      { name: "NW", dq:  0, dr: -1, angle: 240 },
      { name: "NE", dq:  1, dr: -1, angle: 300 },
    ];

    const dirByName = Object.fromEntries(DIRS.map((d) => [d.name, d]));

    const angleDiff = (a, b) => {
      const d = Math.abs(a - b) % 360;
      return d > 180 ? 360 - d : d;
    };

    const sortedByAngle = (from) =>
      [...DIRS].sort((a, b) => angleDiff(from.angle, a.angle) - angleDiff(from.angle, b.angle));

    const opposite = (dir) => DIRS.find((d) => d.dq === -dir.dq && d.dr === -dir.dr);

    let lastDir = null;

    const COMBO_WINDOW_MS = 50;
    let pendingMove = null;

    const anyMoveKeyDown = () =>
      kUp.isDown ||
      kW.isDown ||
      kDown.isDown ||
      kS.isDown ||
      kLeft.isDown ||
      kA.isDown ||
      kRight.isDown ||
      kD.isDown;

    this._repeatMove = () => {
      if (anyMoveKeyDown()) resolveMove();
    };

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

      const go = (dir) => {
        lastDir = dir;
        this._tryMoveByDelta(dir.dq, dir.dr);
        this._updateDebugOverlay({ lastDir });
      };

      let intended = null;
      if (isNorth && isEast) intended = dirByName["NE"];
      else if (isNorth && isWest) intended = dirByName["NW"];
      else if (isSouth && isEast) intended = dirByName["SE"];
      else if (isSouth && isWest) intended = dirByName["SW"];
      else if (isEast) intended = dirByName["E"];
      else if (isWest) intended = dirByName["W"];
      else if (isNorth) {
        const northDirs = [dirByName["NE"], dirByName["NW"]];
        intended = lastDir
          ? northDirs.sort((a, b) => angleDiff(lastDir.angle, a.angle) - angleDiff(lastDir.angle, b.angle))[0]
          : dirByName["NE"];
      } else if (isSouth) {
        const southDirs = [dirByName["SE"], dirByName["SW"]];
        intended = lastDir
          ? southDirs.sort((a, b) => angleDiff(lastDir.angle, a.angle) - angleDiff(lastDir.angle, b.angle))[0]
          : dirByName["SE"];
      }
      else return;

      if (!intended) return;

      if (lastDir && intended === opposite(lastDir)) {
        const rev = opposite(lastDir);
        if (canMove(rev.dq, rev.dr)) { go(rev); return; }
      }

      if (canMove(intended.dq, intended.dr)) { go(intended); return; }

      if (isNorth || isSouth || isEast || isWest) {
        for (const dir of sortedByAngle(intended)) {
          if (dir === intended) continue;
          if (lastDir && dir === opposite(lastDir)) continue;
          if (canMove(dir.dq, dir.dr)) { go(dir); return; }
        }
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

  _buildDebugOverlay() {
    const x = 12;
    const y = HEIGHT - 70;
    const bg = this.add.rectangle(x, y, 140, 28, 0x000000, 0.6);
    bg.setOrigin(0, 0);
    bg.setDepth(200);
    this._debugText = this.add.text(x + 6, y + 6, "", {
      fontSize: "11px",
      color: COLORS.white,
      fontFamily: "monospace",
      lineSpacing: 4,
    });
    this._debugText.setDepth(201);
    this._updateDebugOverlay({ lastDir: null });
  }

  _updateDebugOverlay({ lastDir }) {
    this._debugText.setText([
      `lastDir: ${lastDir ? lastDir.name : "null"}`,
    ]);
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
